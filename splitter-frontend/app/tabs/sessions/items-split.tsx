import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { YStack, XStack, Text, Button, Circle, ScrollView, Spinner, Input, Sheet } from 'tamagui';
import { Users as UsersIcon, Check, Plus, Minus, Package as PackageIcon, Pencil, Sparkles, X, Mic, Square } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { useAppStore } from '@/shared/lib/stores/app-store';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import type { FinishPayload, ReceiptSplitItem } from '@/features/receipt/model/receipt-session.store';
import { ReceiptApi } from '@/features/receipt/api/receipt.api';
import type { FinalizeReceiptItemPayload, FinalizeTotalsByItem, FinalizeTotalsByParticipant, ReceiptAllocation } from '@/features/receipt/api/receipt.api';
import { buildLocalFinalization } from '@/features/receipt/model/receipt-calculator';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

// ===== Types =====
type Participant = { uniqueId: string; username: string };
type SplitMode = 'equal' | 'count' | undefined;
type Item = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[];
  perPersonCount?: Record<string, number>;
  splitMode?: SplitMode;
  kind?: string;
  totalPrice?: number;
};



// ===== Helpers =====
const cloneItems = (source: Item[]): Item[] =>
  source.map((item) => ({
    ...item,
    assignedTo: [...item.assignedTo],
    perPersonCount: item.perPersonCount ? { ...item.perPersonCount } : {},
  }));

const ensureMode = (item: Item): Exclude<SplitMode, undefined> =>
  item.splitMode === 'count' ? 'count' : 'equal';

const toLocalItems = (source: ReceiptSplitItem[]): Item[] =>
  source.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.unitPrice,
    quantity: item.quantity,
    assignedTo: [...item.assignedTo],
    perPersonCount: item.perPersonCount ? { ...item.perPersonCount } : {},
    splitMode: item.splitMode ?? (item.quantity > 1 ? 'count' : 'equal'),
    kind: item.kind,
    totalPrice: item.totalPrice,
  }));

const toStoreItems = (source: Item[]): ReceiptSplitItem[] =>
  source.map((item) => {
    const mode = ensureMode(item);
    const perPersonEntries = Object.entries(item.perPersonCount ?? {}).filter(
      ([, value]) => typeof value === 'number' && value > 0
    );
    const perPersonCount = perPersonEntries.reduce<Record<string, number>>((acc, [uid, count]) => {
      acc[uid] = count;
      return acc;
    }, {});

    const assignedTo = mode === 'equal' ? [...(item.assignedTo || [])] : [];

    return {
      id: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity: item.quantity,
      totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : item.price * item.quantity,
      kind: item.kind,
      splitMode: mode,
      assignedTo,
      perPersonCount: mode === 'count' ? perPersonCount : {},
    };
  });

const parseParticipantsParam = (raw?: string): Participant[] => {
  if (!raw) return [];
  try {
    const decoded = decodeURIComponent(raw);
    return JSON.parse(decoded);
  } catch {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
};

export default function ItemsSplitScreen() {
  const { participants: participantsParam, receiptId } = useLocalSearchParams<{
    participants?: string;
    receiptId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const me = useAppStore((s) => s.user);
  const session = useReceiptSessionStore((s) => s.session);
  const storeItems = useReceiptSessionStore((s) => s.items);
  const storeParticipants = useReceiptSessionStore((s) => s.participants);
  const setStoreItems = useReceiptSessionStore((s) => s.setItems);
  const applyAiSplitAllocation = useReceiptSessionStore((s) => s.applyAiSplitAllocation);
  const setLastFinishPayload = useReceiptSessionStore((s) => s.setLastFinishPayload);

  const storeCurrency = useReceiptSessionStore((s) => s.currency);

  const fmtCurrency = useCallback((n: number) => {
    const currency = storeCurrency || 'UZS';
    return `${currency} ${Math.round(n).toLocaleString('en-US')}`;
  }, [storeCurrency]);

  const getCurrencyParts = useCallback((n: number) => {
    const formatted = fmtCurrency(n);
    const [currency, ...rest] = formatted.split(' ');
    return { currency, amount: rest.join(' ') || '0' };
  }, [fmtCurrency]);

  const [items, setLocalItems] = useState<Item[]>([]);

  type Editing = {
    id: string;
    splitMode: SplitMode;
    assignedTo: string[];
    perPersonCount: Record<string, number>;
  } | null;

  const [editing, setEditing] = useState<Editing>(null);
  const [detailsEditing, setDetailsEditing] = useState<Item | null>(null); // New state for editing details

  const handleAddNewItem = () => {
    const newItem: Item = {
      id: `manual-${Date.now()}`,
      name: '',
      price: 0,
      quantity: 1,
      assignedTo: [],
      perPersonCount: {},
      splitMode: 'equal',
    };
    setDetailsEditing(newItem);
  };

  // Magic AI Split states
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPayload, setAudioPayload] = useState<{ mimeType: string; data: string } | null>(null);

  const startRecording = async () => {
    try {
      setAiError(null);
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        setAiError('Mikrofon ruxsati berilmadi');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setAudioPayload(null);
    } catch (err) {
      console.error('Failed to start recording', err);
      setAiError('Yozishni boshlashda xatolik yuz berdi');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        // HIGH_QUALITY on iOS creates .m4a. On Android it might create .m4a or .mp4.
        setAudioPayload({ mimeType: 'audio/m4a', data: base64 });
      }
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
      setAiError("Yozishni to'xtatishda xatolik yuz berdi");
      setIsRecording(false);
    }
  };

  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const participantsFromParams = useMemo(
    () => parseParticipantsParam(participantsParam),
    [participantsParam]
  );

  const participants = useMemo<Participant[]>(() => {
    const source =
      (storeParticipants?.length ?? 0) > 0 ? storeParticipants : participantsFromParams;
    const base =
      source.length > 0
        ? source
        : me?.uniqueId
          ? [{ uniqueId: me.uniqueId, username: me.username || me.uniqueId }]
          : [];

    const normalized = base.map((p) => ({
      uniqueId: p.uniqueId,
      username: p.username || p.uniqueId,
    }));

    const meId = me?.uniqueId;
    const sorted = [...normalized].sort((a, b) => {
      if (meId && a.uniqueId === meId) return -1;
      if (meId && b.uniqueId === meId) return 1;
      return (a.username || '').localeCompare(b.username || '');
    });

    return sorted;
  }, [storeParticipants, participantsFromParams, me?.uniqueId, me?.username]);


  const sessionReceiptId = receiptId ?? (session ? String(session.sessionId) : undefined);

  const loadItemsFromSource = useCallback(() => {
    const hasStoreItems = Array.isArray(storeItems) && storeItems.length > 0;
    if (hasStoreItems) {
      setLocalItems(toLocalItems(storeItems));
      /**
       * MOCK fallbacks removed per user request
       */
    } else {
      setLocalItems([]);
    }
    setEditing(null);
    setSaving(false);
    setShowSuccess(false);
  }, [storeItems, setStoreItems]);

  const resetState = useCallback(() => {
    loadItemsFromSource();
  }, [loadItemsFromSource]);

  useEffect(() => {
    resetState();
  }, [resetState]);

  useFocusEffect(
    useCallback(() => {
      resetState();
    }, [resetState])
  );

  const commitItems = useCallback(
    (updater: (prev: Item[]) => Item[]) => {
      let nextForStore: Item[] | null = null;
      setLocalItems((prev) => {
        const next = updater(prev);
        const changed =
          next.length !== prev.length || next.some((item, index) => item !== prev[index]);
        if (!changed) {
          return prev;
        }
        nextForStore = next;
        return next;
      });
      if (nextForStore) {
        setStoreItems(toStoreItems(nextForStore));
      }
    },
    [setStoreItems]
  );

  // --- derived ---
  const countAssignedUnits = (it: Item) =>
    Object.values(it.perPersonCount || {}).reduce((a, b) => a + (b || 0), 0);

  const isPartiallyAssigned = (it: Item) => {
    if (ensureMode(it) === 'count') {
      return countAssignedUnits(it) > 0;
    }
    return (it.assignedTo?.length ?? 0) > 0;
  };

  const isFullyAssigned = (it: Item) => {
    if (ensureMode(it) === 'count') {
      const units = countAssignedUnits(it);
      const required = Math.max(1, it.quantity || 0);
      return units >= required;
    }
    return (it.assignedTo?.length ?? 0) > 0;
  };

  const assignedCount = useMemo(
    () => items.reduce((acc, it) => acc + (isFullyAssigned(it) ? 1 : 0), 0),
    [items]
  );

  const totalItems = items.length;
  const canContinue = assignedCount === totalItems && totalItems > 0;

  useEffect(() => {
    if (!canContinue && submitError) {
      setSubmitError(null);
    }
  }, [canContinue, submitError]);

  // --- modal helpers ---
  const editingItem = editing ? items.find((it) => it.id === editing.id) : null;
  const editingTotal = editingItem
    ? typeof editingItem.totalPrice === 'number'
      ? editingItem.totalPrice
      : editingItem.price * editingItem.quantity
    : 0;
  const editingPriceParts = getCurrencyParts(editingTotal);
  const effectiveMode =
    editing?.splitMode || (editingItem?.quantity && editingItem.quantity > 1 ? 'count' : 'equal');
  const isEqualMode = effectiveMode === 'equal';
  const isCountMode = effectiveMode === 'count';

  function openAssignModal(it: Item) {
    const initialMode: SplitMode = it.splitMode ?? (it.quantity > 1 ? 'count' : 'equal');
    const assigned = initialMode === 'equal' ? [...(it.assignedTo || [])] : [];
    const perCount = initialMode === 'count' ? { ...(it.perPersonCount || {}) } : {};

    setEditing({
      id: it.id,
      splitMode: initialMode,
      assignedTo: assigned,
      perPersonCount: perCount,
    });
  }

  function closeAssignModal() {
    setEditing(null);
  }

  function modalAll() {
    if (!editing) return;
    setEditing({
      ...editing,
      splitMode: 'equal',
      assignedTo: participants.map((p) => p.uniqueId),
      perPersonCount: {},
    });
  }

  function modalClear() {
    if (!editing) return;
    setEditing({
      ...editing,
      splitMode: effectiveMode,
      assignedTo: [],
      perPersonCount: {},
    });
  }

  function switchToEqual() {
    if (!editing) return;
    const participantsWithUnits = Object.entries(editing.perPersonCount)
      .filter(([, value]) => (value || 0) > 0)
      .map(([uid]) => uid);
    const baseAssigned = editing.assignedTo.length ? editing.assignedTo : participantsWithUnits;

    setEditing({
      ...editing,
      splitMode: 'equal',
      assignedTo: baseAssigned,
      perPersonCount: {},
    });
  }

  function switchToCount() {
    if (!editing || !editingItem) return;

    const existing = Object.entries(editing.perPersonCount).filter(
      ([, value]) => (value || 0) > 0
    );

    if (existing.length === 0 && editing.assignedTo.length > 0) {
      let remaining = editingItem.quantity;
      const counts: Record<string, number> = {};
      editing.assignedTo.forEach((uid) => {
        if (remaining <= 0) return;
        counts[uid] = 1;
        remaining -= 1;
      });

      setEditing({
        ...editing,
        splitMode: 'count',
        assignedTo: [],
        perPersonCount: counts,
      });
      return;
    }

    setEditing({
      ...editing,
      splitMode: 'count',
      assignedTo: [],
      perPersonCount: { ...editing.perPersonCount },
    });
  }

  function modalToggleUser(uid: string) {
    if (!editing || !editingItem) return;

    if (effectiveMode === 'count') {
      const current = editing.perPersonCount[uid] || 0;
      const next = { ...editing.perPersonCount };

      if (current > 0) {
        delete next[uid];
      } else {
        const othersTotal = Object.entries(editing.perPersonCount)
          .filter(([key]) => key !== uid)
          .reduce((sum, [, value]) => sum + (value || 0), 0);

        if (othersTotal >= editingItem.quantity) return;
        next[uid] = 1;
      }

      setEditing({
        ...editing,
        splitMode: 'count',
        assignedTo: [],
        perPersonCount: next,
      });
      return;
    }

    const has = editing.assignedTo.includes(uid);
    const next = has
      ? editing.assignedTo.filter((x) => x !== uid)
      : [...editing.assignedTo, uid];

    setEditing({
      ...editing,
      splitMode: 'equal',
      assignedTo: next,
      perPersonCount: {},
    });
  }

  function modalInc(uid: string) {
    if (!editing || !editingItem) return;
    const next = { ...editing.perPersonCount };
    const sum = Object.values(next).reduce((a, b) => a + (b || 0), 0);
    if (sum >= editingItem.quantity) return;

    next[uid] = (next[uid] || 0) + 1;
    setEditing({
      ...editing,
      splitMode: 'count',
      perPersonCount: next,
      assignedTo: [],
    });
  }

  function modalDec(uid: string) {
    if (!editing) return;
    const next = { ...editing.perPersonCount };
    const v = (next[uid] || 0) - 1;
    if (v <= 0) delete next[uid];
    else next[uid] = v;

    setEditing({
      ...editing,
      splitMode: 'count',
      perPersonCount: next,
      assignedTo: [],
    });
  }

  async function modalSave() {
    if (!editing) return;
    const mode: Exclude<SplitMode, undefined> =
      editing.splitMode ?? ((editingItem?.quantity && editingItem.quantity > 1) ? 'count' : 'equal');

    setSaving(true);
    try {
      commitItems((prev) =>
        prev.map((it) => {
          if (it.id !== editing.id) return it;

          // Ensure we preserve the assignments correctly
          const assignedTo = mode === 'equal' ? [...(editing.assignedTo || [])] : [];
          const perPersonCount = mode === 'count' ? { ...(editing.perPersonCount || {}) } : {};

          return {
            ...it,
            splitMode: mode,
            assignedTo,
            perPersonCount,
          };
        })
      );
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  // --- Ai split actions ---
  const handleAiSplit = async () => {
    if (!aiPrompt.trim() && !audioPayload) return;
    setIsAiProcessing(true);
    setAiError(null);
    try {
      const response = await ReceiptApi.aiSplit({
        prompt: aiPrompt,
        audio: audioPayload || undefined,
        participants: participants.map((p) => ({
          uniqueId: p.uniqueId,
          username: p.username,
        })),
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
        })),
      });

      if (response && response.allocations) {
        // Avtomat yangilash. Zustand store dan
        applyAiSplitAllocation(response.allocations);
        // Local oynani ham yangilash
        setLocalItems((prevItems) => {
          return prevItems.map(item => {
            const alloc = response.allocations.find(a => a.itemId === item.id);
            if (alloc) {
              return {
                ...item,
                splitMode: 'equal',
                assignedTo: alloc.assignedTo,
                perPersonCount: {},
              };
            }
            return item;
          });
        });
        setAiModalOpen(false);
        setAiPrompt("");
      }
    } catch (err: any) {
      setAiError(err.message || 'AI processing failed');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // --- finalize and navigate ---
  const onContinue = useCallback(async () => {
    if (!canContinue || finalizing) return;

    setSubmitError(null);
    setFinalizing(true);

    try {
      setStoreItems(toStoreItems(items));

      const finalizeItems: FinalizeReceiptItemPayload[] = items.map((item) => {
        const mode = ensureMode(item);

        const payload: FinalizeReceiptItemPayload = {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          kind: item.kind,
          splitMode: mode,
          assignedTo: mode === 'equal' ? (item.assignedTo || []) : undefined,
          perPersonCount: mode === 'count' ? (item.perPersonCount || {}) : undefined,
        };

        // Debug log
        console.log('Finalizing item:', {
          id: item.id,
          name: item.name,
          mode,
          assignedTo: payload.assignedTo,
          perPersonCount: payload.perPersonCount,
        });

        return payload;
      });

      const effectiveSessionId =
        session?.sessionId ??
        (sessionReceiptId ? parseInt(sessionReceiptId, 10) : undefined);

      if (!effectiveSessionId) {
        throw new Error('Session ID is required');
      }

      const fallbackFinalization = buildLocalFinalization(items, participants);

      const result = await ReceiptApi.finalize({
        sessionId: effectiveSessionId,
        sessionName: session?.sessionName || 'Split Session',
        participants: participants.map((p) => ({
          uniqueId: p.uniqueId,
          username: p.username,
        })),
        items: finalizeItems,
        currency: storeCurrency, // ✅ Добавьте эту строку
      });

      const backendByParticipant = result.totals?.byParticipant ?? [];
      const hasBackendByParticipant = backendByParticipant.length > 0;

      const effectiveByParticipant = hasBackendByParticipant
        ? backendByParticipant
        : fallbackFinalization.totalsByParticipant;

      const totalsFromResponse = hasBackendByParticipant
        ? backendByParticipant.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.uniqueId] = entry.amountOwed;
          return acc;
        }, {})
        : { ...fallbackFinalization.totalsMap };

      const backendByItem = result.totals?.byItem ?? [];
      const totalsByItem = backendByItem.length > 0 ? backendByItem : fallbackFinalization.totalsByItem;

      const backendAllocations = result.allocations ?? [];
      const allocations = backendAllocations.length > 0 ? backendAllocations : fallbackFinalization.allocations;

      const grandTotal =
        typeof result.totals?.grandTotal === 'number'
          ? result.totals.grandTotal
          : fallbackFinalization.grandTotal;

      const finalCurrency = result.totals?.currency || storeCurrency;

      const finishPayload: FinishPayload = {
        sessionId: result.sessionId,
        sessionName: result.sessionName,
        receiptId: sessionReceiptId ?? undefined,
        participants,
        totalsByParticipant: effectiveByParticipant,
        totalsByItem,
        allocations,
        grandTotal,
        currency: finalCurrency,
        status: result.status,
        createdAt: result.createdAt,
      };

      setLastFinishPayload(finishPayload);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        setFinalizing(false);

        try {
          const q = encodeURIComponent(JSON.stringify(finishPayload));
          router.push({
            pathname: '/tabs/sessions/finish',
            params: { data: q },
          });
        } catch {
          router.push('/tabs');
        }

        resetState();
      }, 1200);
    } catch (error) {
      setShowSuccess(false);
      setFinalizing(false);

      const message = error instanceof Error ? error.message : 'Failed to finalize session';
      setSubmitError(message);
      console.error('Finalize error:', error);
    }
  }, [
    canContinue,
    finalizing,
    items,
    session,
    sessionReceiptId,

    participants,
    storeCurrency,
    setStoreItems,
    setLastFinishPayload,
    router,
    resetState,
  ]);

  // --- UI atoms ---
  const Avatar = ({ name }: { name: string }) => (
    <Circle size={28} bg="$gray5" ai="center" jc="center">
      <Text color="white" fontWeight="700">
        {name?.[0]?.toUpperCase() || '?'}
      </Text>
    </Circle>
  );

  const ProgressBar = ({ value }: { value: number }) => (
    <YStack h={8} w="100%" br={999} bg="$gray5" overflow="hidden">
      <YStack h="100%" w={`${Math.max(0, Math.min(100, value))}%`} bg="#2ECC71" />
    </YStack>
  );

  const ModeToggleButton = ({
    label,
    icon,
    active,
    onPress,
  }: {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onPress: () => void;
  }) => (
    <Button
      unstyled
      onPress={onPress}
      px={12}
      py={10}
      borderRadius={8}
      bg={active ? '#2ECC71' : '$backgroundPress'}
      borderWidth={1}
      borderColor={active ? '#2ECC71' : '#E4E7EB'}
    >
      <XStack ai="center" gap="$2">
        {icon}
        <Text fontSize={13} fontWeight="600" color={active ? 'white' : '$gray11'}>
          {label}
        </Text>
      </XStack>
    </Button>
  );

  const gapBottom = (insets?.bottom ?? 0) + 72;

  return (
    <YStack f={1} bg="$background" position="relative">
      {/* Header */}
      <YStack bg="$background" p="$4" pb="$2">
        <XStack w="100%" ai="center" jc="space-between" mb="$3">
          <YStack ai="flex-start">
            <Text fontSize={16} fontWeight="700">
              {t('splitSession.orders')}
            </Text>
            <Text fontSize={12} color="$gray10">
              {sessionReceiptId ?? 'N/A'}
            </Text>
          </YStack>
          <Button
            size="$3"
            borderRadius="$3"
            bg="#8A2BE2" // Purple magic color
            color="white"
            icon={<Sparkles size={16} color="white" />}
            onPress={() => setAiModalOpen(true)}
            pressStyle={{ opacity: 0.8 }}
          >
            <Text color="white" fontWeight="600">Magic Split</Text>
          </Button>
        </XStack>
      </YStack>

      {/* Content */}
      <ScrollView
        f={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: gapBottom }}
      >
        <YStack px="$4" gap="$3">
          {/* Participants */}
          <YStack>
            <XStack w="100%" ai="center" jc="flex-start" mb="$2">
              <XStack ai="center" gap="$2">
                <UsersIcon size={18} color="$gray10" />
                <Text fontWeight="700">{t('navigation.participants')} ({participants.length})</Text>
              </XStack>
            </XStack>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack gap="$2" pr="$4">
                {participants.map((p) => (
                  <XStack
                    key={p.uniqueId}
                    ai="center"
                    gap="$2"
                    px="$2"
                    py="$1"
                    borderWidth={1}
                    borderColor="$gray6"
                    borderRadius={16}
                    minWidth={100}
                  >
                    <Avatar name={p.username} />
                    <Text numberOfLines={1} fontSize={13}>
                      {p.username}
                    </Text>
                  </XStack>
                ))}
              </XStack>
            </ScrollView>
          </YStack>

          {/* Items */}
          <YStack gap="$3" mt="$2">
            {items.map((it) => {
              const total =
                typeof it.totalPrice === 'number' ? it.totalPrice : it.price * it.quantity;
              const assigned = isPartiallyAssigned(it);
              const singleOwner = it.splitMode !== 'count' && it.assignedTo.length === 1;
              const ownerName = singleOwner
                ? participants.find((p) => p.uniqueId === it.assignedTo[0])?.username
                : undefined;
              const priceParts = getCurrencyParts(total);
              const assignedUnits =
                it.splitMode === 'count'
                  ? countAssignedUnits(it)
                  : 0;
              const missingUnits =
                it.splitMode === 'count'
                  ? Math.max(0, (it.quantity || 0) - assignedUnits)
                  : 0;
              const isCountAndMissing = it.splitMode === 'count' && missingUnits > 0;

              let summaryText = '';
              if (it.splitMode === 'count') {
                summaryText = `${assignedUnits}/${it.quantity} ${t('splitSession.assigned')}`;
              } else if (singleOwner) {
                summaryText = ownerName ?? '';
              } else if (it.quantity > 1) {
                summaryText = `${t('splitSession.unit')} ${fmtCurrency(it.price)}`;
              }

              const showUnitIcon = it.quantity > 1 && summaryText !== '';

              return (
                <YStack
                  key={it.id}
                  w="100%"
                  borderWidth={1}
                  borderColor={
                    isCountAndMissing ? '#E74C3C' : assigned ? '#2ECC71' : '#E4E7EB'
                  }
                  borderRadius={12}
                  bg="$color1"
                >
                  <XStack w="100%" ai="center" jc="space-between" px={16} py="$3" gap="$3">
                    <YStack f={1} pr={12} gap="$1">
                      <XStack ai="center" gap="$2">
                        <Text fontSize={16} fontWeight="700" numberOfLines={1}>
                          {it.name}
                          {it.quantity > 1 ? ` (${it.quantity}x)` : ''}
                        </Text>
                        <Button unstyled onPress={() => setDetailsEditing(it)} hitSlop={8}>
                          <Pencil size={14} color="$gray10" />
                        </Button>
                      </XStack>
                      {summaryText && (
                        <XStack ai="center" gap="$1">
                          {showUnitIcon && <PackageIcon size={14} color="$gray10" />}
                          <Text fontSize={12} color="$gray10" numberOfLines={1}>
                            {summaryText}
                          </Text>
                        </XStack>
                      )}
                      {isCountAndMissing && (
                        <Text fontSize={12} color="#E74C3C">
                          Assign remaining {missingUnits} unit{missingUnits === 1 ? '' : 's'}
                        </Text>
                      )}
                    </YStack>

                    <YStack ai="flex-end" gap="$2" flexShrink={0}>
                      <XStack ai="baseline" gap="$1">
                        <Text fontSize={12} color="$gray10">
                          {priceParts.currency}
                        </Text>
                        <Text fontSize={16} fontWeight="700" color="#2ECC71">
                          {priceParts.amount}
                        </Text>
                      </XStack>

                      <Button
                        unstyled
                        onPress={() => openAssignModal(it)}
                        width={assigned ? 109 : undefined}
                        minHeight={assigned ? 29 : 32}
                        px={assigned ? 16 : 12}
                        py={assigned ? 6 : undefined}
                        borderRadius={assigned ? 5 : 6}
                        bg={assigned ? '#2ECC711A' : '$backgroundPress'}
                        borderWidth={assigned ? 0 : 1}
                        borderColor={assigned ? 'transparent' : '#E4E7EB'}
                        ai="center"
                        jc="center"
                      >
                        <Text
                          fontSize={14}
                          fontWeight="600"
                          color={assigned ? '#2ECC71' : '$gray11'}
                        >
                          {assigned ? 'Change' : 'Who?'}
                        </Text>
                      </Button>
                    </YStack>
                  </XStack>
                </YStack>
              );
            })}
          </YStack>

          {/* Add Item Button */}
          <Button
            unstyled
            onPress={handleAddNewItem}
            mt="$3"
            h={44}
            br={10}
            bg="$color1"
            borderWidth={0.5}
            borderColor="$gray6"
            ai="center"
            jc="center"
            pressStyle={{ scale: 0.98, bg: '$backgroundPress' }}
            animation="quick"
          >
            <XStack ai="center" gap="$2">
              <Plus size={16} color="$gray11" />
              <Text fontWeight="600" color="$gray11">
                {t('splitSession.addItem')}
              </Text>
            </XStack>
          </Button>
        </YStack >
      </ScrollView >

      {/* Bottom progress -> button */}
      < YStack
        position="absolute"
        left={0}
        right={0}
        bottom={(insets?.bottom ?? 0) + 8
        }
        px="$4"
      >
        {!canContinue ? (
          <YStack p="$3" borderWidth={1} borderColor="$gray5" borderRadius={12} bg="$color1">
            <XStack w="100%" ai="center" jc="space-between" mb="$2">
              <Text color="$gray10" fontSize={13}>
                Assignment progress
              </Text>
              <Text fontSize={13} fontWeight="700">
                {assignedCount}/{totalItems}
              </Text>
            </XStack>
            <ProgressBar
              value={Math.round((assignedCount / Math.max(1, totalItems)) * 100)}
            />
          </YStack>
        ) : (
          <YStack>
            <Button
              unstyled
              onPress={onContinue}
              height={41}
              borderRadius={10}
              bg="#2ECC71"
              ai="center"
              jc="center"
              pressStyle={finalizing ? undefined : { opacity: 0.9 }}
              disabled={finalizing}
              opacity={finalizing ? 0.6 : 1}
            >
              <Text fontSize={16} fontWeight="600" color="white">
                {finalizing ? 'Saving...' : 'Continue'}
              </Text>
            </Button>
            {submitError && (
              <Text mt="$2" color="$red10" fontSize={13} textAlign="center">
                {submitError}
              </Text>
            )}
          </YStack>
        )}
      </YStack >

      {/* Assign Modal */}
      {
        editing && (
          <YStack
            position="absolute"
            inset={0}
            bg="rgba(0,0,0,0.35)"
            ai="center"
            pt={insets.top + 12}
          >
            <YStack
              w={358}
              maxWidth={358}
              h={(editingItem?.quantity || 1) > 1 ? 666 : 588}
              bg="$color1"
              borderRadius={8}
              p="$3"
            >
              {/* Header product + price */}
              <XStack w="100%" ai="center" jc="space-between" mb="$3">
                <Text fontSize={16} fontWeight="700" numberOfLines={1}>
                  {editingItem?.name}
                  {editingItem && editingItem.quantity > 1 ? ` (${editingItem.quantity}x)` : ''}
                </Text>
                <XStack ai="baseline" gap="$1">
                  <Text fontSize={12} color="$gray10">
                    {editingPriceParts.currency}
                  </Text>
                  <Text fontSize={16} fontWeight="700" color="#2ECC71">
                    {editingPriceParts.amount}
                  </Text>
                </XStack>
              </XStack>

              {editingItem && editingItem.quantity > 1 && (
                <XStack gap="$2" mb="$2">
                  <ModeToggleButton
                    label="Equal split"
                    icon={<UsersIcon size={16} color={isEqualMode ? 'white' : '#2C3D4F'} />}
                    active={isEqualMode}
                    onPress={switchToEqual}
                  />
                  <ModeToggleButton
                    label="By units"
                    icon={<PackageIcon size={16} color={isCountMode ? 'white' : '#2C3D4F'} />}
                    active={isCountMode}
                    onPress={switchToCount}
                  />
                </XStack>
              )}

              <XStack w="100%" ai="center" jc="space-between" mb="$2">
                <Text fontWeight="600">Assign to:</Text>
                <XStack ai="center" gap="$2">
                  <Button chromeless onPress={modalAll}>
                    <Text color="#2ECC71" fontWeight="700">
                      All
                    </Text>
                  </Button>
                  <Text color="$gray8">|</Text>
                  <Button chromeless onPress={modalClear}>
                    <Text color="#E74C3C" fontWeight="700">
                      Clear
                    </Text>
                  </Button>
                </XStack>
              </XStack>

              <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator>
                <YStack gap="$2" pb="$2">
                  {participants.map((p) => {
                    const mode = effectiveMode;
                    const isCountRow = mode === 'count';
                    const assignedQty = editing.perPersonCount?.[p.uniqueId] || 0;
                    const isSelected = isCountRow
                      ? assignedQty > 0
                      : editing.assignedTo.includes(p.uniqueId);

                    return (
                      <Pressable
                        key={`m-${editing.id}-${p.uniqueId}`}
                        onPress={() => modalToggleUser(p.uniqueId)}
                        style={({ pressed }) => ({
                          width: '100%',
                          opacity: pressed ? 0.95 : 1,
                        })}
                      >
                        <XStack
                          h={60}
                          ai="center"
                          jc="space-between"
                          px={16}
                          borderWidth={1}
                          borderColor={isSelected ? '#2ECC71' : '#E4E7EB'}
                          borderRadius={12}
                          bg="$color1"
                        >
                          <XStack ai="center" gap="$3">
                            <Avatar name={p.username} />
                            <Text fontWeight="600">{p.username}</Text>
                          </XStack>

                          <XStack ai="center" gap="$3">
                            {isCountRow && (
                              <XStack ai="center" gap="$2">
                                <Button
                                  unstyled
                                  onPress={(e: any) => {
                                    e?.stopPropagation?.();
                                    modalDec(p.uniqueId);
                                  }}
                                  width={28}
                                  height={28}
                                  br={999}
                                  bg="#E4E7EB"
                                  ai="center"
                                  jc="center"
                                >
                                  <Minus size={16} color="#2C3D4F" />
                                </Button>
                                <Text minWidth={12} textAlign="center">
                                  {assignedQty}
                                </Text>
                                <Button
                                  unstyled
                                  onPress={(e: any) => {
                                    e?.stopPropagation?.();
                                    modalInc(p.uniqueId);
                                  }}
                                  width={28}
                                  height={28}
                                  br={999}
                                  bg="#E4E7EB"
                                  ai="center"
                                  jc="center"
                                >
                                  <Plus size={16} color="#2C3D4F" />
                                </Button>
                              </XStack>
                            )}

                            <Circle
                              size={22}
                              borderColor="#2ECC71"
                              borderWidth={2}
                              ai="center"
                              jc="center"
                              bg={isSelected ? '#2ECC71' : 'transparent'}
                            >
                              {isSelected && <Check size={14} color="white" />}
                            </Circle>
                          </XStack>
                        </XStack>
                      </Pressable>
                    );
                  })}
                </YStack>
              </ScrollView>

              {effectiveMode === 'equal' && editing.assignedTo.length > 0 && (
                <YStack mt="$2" p={8} borderRadius={5} bg="#2ECC711A">
                  <Text fontSize={13} fontWeight="700" color="#2ECC71">
                    {t('splitSession.assignedTo', { count: editing.assignedTo.length })}
                  </Text>
                  <Text fontSize={12} color="#2ECC71">
                    {t('splitSession.priceSplitEqually')}{' '}
                    {fmtCurrency(editingTotal / Math.max(1, editing.assignedTo.length))} {t('splitSession.each')}
                  </Text>
                </YStack>
              )}

              {effectiveMode === 'count' &&
                Object.values(editing.perPersonCount).reduce((a, b) => a + (b || 0), 0) > 0 && (
                  <YStack mt="$2" p={8} borderRadius={5} bg="#2ECC711A">
                    <Text fontSize={13} fontWeight="700" color="#2ECC71">
                      {t('splitSession.unitsAssigned', { count: Object.values(editing.perPersonCount).reduce((a, b) => a + (b || 0), 0) })}
                    </Text>
                    <Text fontSize={12} color="#2ECC71">
                      {t('splitSession.perUnit')} {fmtCurrency(editingItem?.price || 0)}
                    </Text>
                  </YStack>
                )}

              <XStack mt="auto" gap="$2">
                <Button
                  unstyled
                  onPress={closeAssignModal}
                  width={155}
                  height={41}
                  borderRadius={10}
                  borderWidth={1}
                  borderColor="#E4E7EB"
                  ai="center"
                  jc="center"
                >
                  <Text>{t('common.cancel')}</Text>
                </Button>
                <Button
                  unstyled
                  onPress={modalSave}
                  width={155}
                  height={41}
                  borderRadius={10}
                  bg="#2ECC71"
                  ai="center"
                  jc="center"
                  disabled={saving}
                  pressStyle={{ opacity: 0.9 }}
                >
                  <Text color="white" fontWeight="600">
                    {t('splitSession.save')}
                  </Text>
                </Button>
              </XStack>
            </YStack>
          </YStack>
        )
      }

      {/* Finalizing spinner */}
      {
        finalizing && !showSuccess && (
          <YStack
            position="absolute"
            inset={0}
            ai="center"
            jc="center"
            bg="rgba(0,0,0,0.25)"
          >
            <YStack w={390} h={156} ai="center" jc="center" bg="$color1" br={12}>
              <Spinner size="large" color="#2ECC71" />
              <Text mt="$2" color="#2ECC71" fontSize={16} fontWeight="600">
                {t('splitSession.saving')}
              </Text>
            </YStack>
          </YStack>
        )
      }

      {/* Success overlay */}
      {
        showSuccess && (
          <YStack
            position="absolute"
            inset={0}
            ai="center"
            jc="center"
            bg="rgba(0,0,0,0.25)"
          >
            <YStack w={390} h={156} ai="center" jc="center" bg="#2ECC71" br={12}>
              <Check size={42} color="white" />
              <Text mt="$2" color="white" fontSize={18} fontWeight="700">
                {t('splitSession.billConfirmed')}
              </Text>
            </YStack>
          </YStack>
        )
      }

      {/* Edit Details Modal */}
      {detailsEditing && (
        <YStack
          position="absolute"
          inset={0}
          bg="rgba(0,0,0,0.5)"
          ai="center"
          jc="center"
          zIndex={1000}
        >
          <YStack
            w="90%"
            maxWidth={350}
            bg="$color1"
            borderRadius={12}
            p="$4"
            gap="$3"
          >
            <Text fontSize={18} fontWeight="700">{t('splitSession.editItem')}</Text>

            <YStack gap="$1">
              <Text fontSize={12} color="$gray10">{t('splitSession.itemName')}</Text>
              <Input
                value={detailsEditing.name}
                onChangeText={(t) => setDetailsEditing({ ...detailsEditing, name: t })}
                bg="$backgroundPress"
              />
            </YStack>

            <XStack gap="$3">
              <YStack f={1} gap="$1">
                <Text fontSize={12} color="$gray10">{t('splitSession.price')}</Text>
                <Input
                  value={String(detailsEditing.price)}
                  keyboardType="numeric"
                  onChangeText={(t) => setDetailsEditing({ ...detailsEditing, price: Number(t.replace(/[^0-9.]/g, '')) })}
                  bg="$backgroundPress"
                />
              </YStack>
              <YStack f={1} gap="$1">
                <Text fontSize={12} color="$gray10">{t('splitSession.quantity')}</Text>
                <Input
                  value={String(detailsEditing.quantity)}
                  keyboardType="numeric"
                  onChangeText={(t) => setDetailsEditing({ ...detailsEditing, quantity: Number(t.replace(/[^0-9]/g, '')) })}
                  bg="$backgroundPress"
                />
              </YStack>
            </XStack>

            <XStack mt="$2" gap="$2">
              <Button f={1} onPress={() => setDetailsEditing(null)} bg="$gray5">
                <Text>{t('common.cancel')}</Text>
              </Button>
              <Button
                f={1}
                bg="#2ECC71"
                onPress={() => {
                  commitItems((prev) => {
                    const exists = prev.some(i => i.id === detailsEditing.id);
                    if (exists) {
                      return prev.map(i => i.id === detailsEditing.id ? detailsEditing : i);
                    } else {
                      return [...prev, detailsEditing];
                    }
                  });
                  setDetailsEditing(null);
                }}
              >
                <Text color="white" fontWeight="600">{t('splitSession.save')}</Text>
              </Button>
            </XStack>

            {items.some(i => i.id === detailsEditing.id) && (
              <Button
                bg="$red5"
                borderColor="$red7"
                borderWidth={0.5}
                pressStyle={{ opacity: 0.8, scale: 0.98 }}
                animation="quick"
                onPress={() => {
                  commitItems((prev) => prev.filter(i => i.id !== detailsEditing.id));
                  setDetailsEditing(null);
                }}
              >
                <Text color="$red10" fontWeight="600">{t('common.delete')}</Text>
              </Button>
            )}
          </YStack>
        </YStack>
      )}

      {/* AI Voice/Text Magic Split Sheet */}
      <Sheet
        modal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        snapPoints={[85]}
        dismissOnSnapToBottom
      >
        <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Frame ai="center" jc="flex-start" p="$4" bg="$color1" pb={insets.bottom + 20}>
          <Sheet.Handle />

          <XStack w="100%" ai="center" jc="space-between" mb="$4">
            <XStack ai="center" gap="$2">
              <Sparkles size={20} color="#8A2BE2" />
              <Text fontSize={18} fontWeight="700">Magic AI Bo'lishish</Text>
            </XStack>
            <Button size="$2" circular chromeless onPress={() => setAiModalOpen(false)}>
              <X size={20} color="$gray10" />
            </Button>
          </XStack>

          <Text fontSize={14} color="$gray11" textAlign="center" mb="$4">
            Diktofon orqali ayting yoki yozing. Masalan:{"\n"}
            "Ali kabob yedi, choyni men va Vali ichdik."
          </Text>

          <Input
            value={aiPrompt}
            onChangeText={setAiPrompt}
            placeholder="Gapiring (klaviatura diktofoni) yoki yozing..."
            multiline
            numberOfLines={4}
            height={100}
            w="100%"
            bg="$backgroundPress"
            borderRadius={12}
            p="$3"
            textAlignVertical="top"
            blurOnSubmit={true}
            returnKeyType="done"
          />

          <XStack w="100%" jc="center" ai="center" mt="$4">
            <Button
              circular
              size="$5"
              bg={isRecording ? "#E74C3C" : "#8A2BE2"}
              onPress={isRecording ? stopRecording : startRecording}
              pressStyle={{ opacity: 0.8 }}
            >
              {isRecording ? <Square size={20} color="white" /> : <Mic size={20} color="white" />}
            </Button>
          </XStack>
          
          <YStack minHeight={20} ai="center" jc="center" mt="$2">
            {isRecording && <Text color="#E74C3C" fontSize={13} fontWeight="600">Yozilmoqda...</Text>}
            {audioPayload && !isRecording && <Text color="#2ECC71" fontSize={13} fontWeight="600">Ovoz muvaffaqiyatli saqlandi! ✔️</Text>}
          </YStack>

          {aiError && (
            <Text mt="$2" color="#E74C3C" fontSize={13} textAlign="center">
              {aiError}
            </Text>
          )}

          <Button
            mt="$3"
            w="100%"
            h={44}
            bg={(aiPrompt.trim() || audioPayload) ? "#8A2BE2" : "$gray5"}
            disabled={(!aiPrompt.trim() && !audioPayload) || isAiProcessing}
            opacity={isAiProcessing ? 0.7 : 1}
            borderRadius={10}
            onPress={handleAiSplit}
            icon={isAiProcessing ? () => <Spinner color="white" /> : undefined}
          >
            <Text color="white" fontWeight="600">
              {isAiProcessing ? "O'ylanmoqda..." : "Bo'lishish"}
            </Text>
          </Button>

        </Sheet.Frame>
      </Sheet>

    </YStack>
  );
}













