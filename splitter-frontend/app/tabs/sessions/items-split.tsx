import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Alert } from 'react-native';
import { YStack, XStack, Text, Button, Circle, ScrollView, Spinner, Input, Sheet } from 'tamagui';
import { Users as UsersIcon, Check, Plus, Minus, Package as PackageIcon, Pencil, Sparkles, X, Mic, Square } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { useAppStore } from '@/shared/lib/stores/app-store';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import type { FinishPayload, ReceiptSplitItem } from '@/features/receipt/model/receipt-session.store';
import { ReceiptApi } from '@/features/receipt/api/receipt.api';
import type { FinalizeReceiptItemPayload, FinalizeTotalsByItem, FinalizeTotalsByParticipant, ReceiptAllocation } from '@/features/receipt/api/receipt.api';
import { buildLocalFinalization } from '@/features/receipt/model/receipt-calculator';
import { useAudioRecorder, requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { convertItemPrice } from '@/shared/lib/utils/currency';

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
  const setStoreCurrency = useReceiptSessionStore((s) => s.setCurrency);

  const fmtCurrency = useCallback((n: number) => {
    const currency = storeCurrency || 'UZS';
    if (currency === 'UZS') {
      return `${currency} ${Math.round(n).toLocaleString('en-US')}`;
    }
    return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [storeCurrency]);

  const getCurrencyParts = useCallback((n: number) => {
    const formatted = fmtCurrency(n);
    const [currency, ...rest] = formatted.split(' ');
    return { currency, amount: rest.join(' ') || '0' };
  }, [fmtCurrency]);

  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);

  const handleConvertCurrency = (targetCurrency: string, shouldConvertPrices: boolean) => {
    if (shouldConvertPrices && storeCurrency !== targetCurrency) {
      const converted = storeItems.map((item) => {
        const newUnitPrice = convertItemPrice(item.unitPrice, storeCurrency, targetCurrency);
        return {
          ...item,
          unitPrice: newUnitPrice,
          totalPrice: newUnitPrice * item.quantity,
        };
      });
      setStoreItems(converted);
    }
    setStoreCurrency(targetCurrency);
  };

  const onCurrencySelect = (targetCurrency: string) => {
    setCurrencySheetOpen(false);
    if (targetCurrency === storeCurrency) return;

    Alert.alert(
      t('splitSession.changeCurrency', 'Change Currency'),
      `Do you want to convert the item prices from ${storeCurrency} to ${targetCurrency} automatically?`,
      [
        {
          text: 'Convert prices',
          onPress: () => handleConvertCurrency(targetCurrency, true),
        },
        {
          text: 'Just change symbol',
          onPress: () => handleConvertCurrency(targetCurrency, false),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

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

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [audioPayload, setAudioPayload] = useState<{ mimeType: string; data: string } | null>(null);

  const startRecording = async () => {
    try {
      setAiError(null);
      const perm = await requestRecordingPermissionsAsync();
      if (perm.status !== 'granted') {
        setAiError('Mikrofon ruxsati berilmadi');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      recorder.record();
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
      if (!isRecording) return;
      setIsRecording(false);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        // HIGH_QUALITY on iOS creates .m4a. On Android it might create .m4a or .mp4.
        setAudioPayload({ mimeType: 'audio/m4a', data: base64 });
      }
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
    <Circle style={{ width: 28, height: 28, backgroundColor: '$gray5', alignItems: 'center', justifyContent: 'center' } as any}>
      <Text color="white" fontWeight="700">
        {name?.[0]?.toUpperCase() || '?'}
      </Text>
    </Circle>
  );

  const ProgressBar = ({ value }: { value: number }) => (
    <YStack style={{ height: 8, width: '100%', borderRadius: 999, backgroundColor: '$gray5' } as any} overflow="hidden">
      <YStack style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: '#2ECC71' } as any} />
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
      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: active ? '#2ECC71' : '$backgroundPress', borderWidth: 1, borderColor: active ? '#2ECC71' : '#E4E7EB' } as any}
    >
      <XStack style={{ alignItems: 'center', gap: 8 } as any}>
        {icon}
        <Text fontSize={13} fontWeight="600" color={active ? 'white' : '$gray11'}>
          {label}
        </Text>
      </XStack>
    </Button>
  );

  const gapBottom = (insets?.bottom ?? 0) + 72;

  return (
    <YStack style={{ flex: 1, backgroundColor: '$background', position: 'relative' } as any}>
      {/* Header */}
      <YStack style={{ backgroundColor: '$background', padding: 16, paddingBottom: 8 } as any}>
        <XStack style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } as any}>
          <YStack style={{ alignItems: 'flex-start' } as any}>
            <XStack style={{ alignItems: 'center', gap: 8 } as any}>
              <Text fontSize={16} fontWeight="700">
                {t('splitSession.orders')}
              </Text>
              <Button
                unstyled
                style={{ backgroundColor: '$backgroundPress', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 } as any}
                borderWidth={0.5}
                borderColor="$borderColor"
                onPress={() => setCurrencySheetOpen(true)}
                pressStyle={{ scale: 0.95 }}
                animation="quick"
              >
                <Text fontSize={12} fontWeight="600" color="#312E81">
                  {storeCurrency} ▾
                </Text>
              </Button>
            </XStack>
            <Text fontSize={12} color="$gray10">
              {sessionReceiptId ?? 'N/A'}
            </Text>
          </YStack>
          <Button
            size="$3"
            borderRadius="$3"
            style={{ backgroundColor: '#8A2BE2' } as any} // Purple magic color
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
        style={{ flex: 1 } as any}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: gapBottom }}
      >
        <YStack style={{ paddingHorizontal: 16, gap: 12 } as any}>
          {/* Participants */}
          <YStack>
            <XStack style={{ width: '100%', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 8 } as any}>
              <XStack style={{ alignItems: 'center', gap: 8 } as any}>
                <UsersIcon size={18} color="$gray10" />
                <Text fontWeight="700">{t('navigation.participants')} ({participants.length})</Text>
              </XStack>
            </XStack>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <XStack style={{ gap: 8, paddingRight: 16 } as any}>
                {participants.map((p) => (
                  <XStack
                    key={p.uniqueId}
                    style={{ alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 4 } as any}
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
          <YStack style={{ gap: 12, marginTop: 8 } as any}>
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
                  style={{ width: '100%', backgroundColor: '$color1' } as any}
                  borderWidth={1}
                  borderColor={
                    isCountAndMissing ? '#E74C3C' : assigned ? '#2ECC71' : '#E4E7EB'
                  }
                  borderRadius={12}
                >
                  <XStack style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, gap: 12 } as any}>
                    <YStack style={{ flex: 1, paddingRight: 12, gap: 4 } as any}>
                      <XStack style={{ alignItems: 'center', gap: 8 } as any}>
                        <Text fontSize={16} fontWeight="700" numberOfLines={1}>
                          {it.name}
                          {it.quantity > 1 ? ` (${it.quantity}x)` : ''}
                        </Text>
                        <Button unstyled onPress={() => setDetailsEditing(it)} hitSlop={8}>
                          <Pencil size={14} color="$gray10" />
                        </Button>
                      </XStack>
                      {summaryText && (
                        <XStack style={{ alignItems: 'center', gap: 4 } as any}>
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

                    <YStack style={{ alignItems: 'flex-end', gap: 8 } as any} flexShrink={0}>
                      <XStack style={{ alignItems: 'baseline', gap: 4 } as any}>
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
                        style={{
                          width: assigned ? 109 : undefined,
                          minHeight: assigned ? 29 : 32,
                          paddingHorizontal: assigned ? 16 : 12,
                          paddingVertical: assigned ? 6 : undefined,
                          borderRadius: assigned ? 5 : 6,
                          backgroundColor: assigned ? '#2ECC711A' : '$backgroundPress',
                          borderWidth: assigned ? 0 : 1,
                          borderColor: assigned ? 'transparent' : '#E4E7EB',
                          alignItems: 'center',
                          justifyContent: 'center',
                        } as any}
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
            style={{
              marginTop: 12,
              height: 44,
              borderRadius: 10,
              backgroundColor: '$color1',
              alignItems: 'center',
              justifyContent: 'center',
            } as any}
            borderWidth={0.5}
            borderColor="$gray6"
            pressStyle={{ scale: 0.98, backgroundColor: '$backgroundPress' } as any}
            animation="quick"
          >
            <XStack style={{ alignItems: 'center', gap: 8 } as any}>
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
        style={{ paddingHorizontal: 16 } as any}
      >
        {!canContinue ? (
          <YStack style={{ padding: 12, backgroundColor: '$color1' } as any} borderWidth={1} borderColor="$gray5" borderRadius={12}>
            <XStack style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } as any}>
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
              style={{ backgroundColor: '#2ECC71', alignItems: 'center', justifyContent: 'center' } as any}
              pressStyle={finalizing ? undefined : { opacity: 0.9 }}
              disabled={finalizing}
              opacity={finalizing ? 0.6 : 1}
            >
              <Text fontSize={16} fontWeight="600" color="white">
                {finalizing ? 'Saving...' : 'Continue'}
              </Text>
            </Button>
            {submitError && (
              <Text style={{ marginTop: 8 } as any} color="$red10" fontSize={13} textAlign="center">
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
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center',
              paddingTop: insets.top + 12,
            } as any}
          >
            <YStack
              style={{
                width: 358,
                maxWidth: 358,
                height: (editingItem?.quantity || 1) > 1 ? 666 : 588,
                backgroundColor: 'rgba(15, 15, 25, 0.98)',
                padding: 16,
              } as any}
              borderWidth={1}
              borderColor="rgba(255, 255, 255, 0.12)"
              borderRadius={16}
              shadowColor="#000"
              shadowOpacity={0.4}
              shadowRadius={16}
              elevation={10}
            >
              {/* Header product + price */}
              <XStack style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } as any}>
                <Text fontSize={16} fontWeight="700" numberOfLines={1}>
                  {editingItem?.name}
                  {editingItem && editingItem.quantity > 1 ? ` (${editingItem.quantity}x)` : ''}
                </Text>
                <XStack style={{ alignItems: 'baseline', gap: 4 } as any}>
                  <Text fontSize={12} color="$gray10">
                    {editingPriceParts.currency}
                  </Text>
                  <Text fontSize={16} fontWeight="700" color="#2ECC71">
                    {editingPriceParts.amount}
                  </Text>
                </XStack>
              </XStack>

              {editingItem && editingItem.quantity > 1 && (
                <XStack style={{ gap: 8, marginBottom: 8 } as any}>
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

              <XStack style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } as any}>
                <Text fontWeight="600" color="white">{t('splitSession.assignTo')}:</Text>
                <XStack style={{ alignItems: 'center', gap: 8 } as any}>
                  <Button chromeless onPress={modalAll}>
                    <Text color="#2ECC71" fontWeight="700">
                      {t('splitSession.all')}
                    </Text>
                  </Button>
                  <Text color="rgba(255, 255, 255, 0.2)">|</Text>
                  <Button chromeless onPress={modalClear}>
                    <Text color="#E74C3C" fontWeight="700">
                      {t('splitSession.clear')}
                    </Text>
                  </Button>
                </XStack>
              </XStack>

              <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator>
                <YStack style={{ gap: 8, paddingBottom: 8 } as any}>
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
                          style={{
                            height: 60,
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          } as any}
                          borderWidth={1}
                          borderColor={isSelected ? '#2ECC71' : 'rgba(255, 255, 255, 0.08)'}
                          borderRadius={12}
                        >
                          <XStack style={{ alignItems: 'center', gap: 12 } as any}>
                            <Avatar name={p.username} />
                            <Text fontWeight="600" color="white">{p.username}</Text>
                          </XStack>

                          <XStack style={{ alignItems: 'center', gap: 12 } as any}>
                            {isCountRow && (
                              <XStack style={{ alignItems: 'center', gap: 8 } as any}>
                                <Button
                                  unstyled
                                  onPress={(e: any) => {
                                    e?.stopPropagation?.();
                                    modalDec(p.uniqueId);
                                  }}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 999,
                                    backgroundColor: '#E4E7EB',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  } as any}
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
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 999,
                                    backgroundColor: '#E4E7EB',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  } as any}
                                >
                                  <Plus size={16} color="#2C3D4F" />
                                </Button>
                              </XStack>
                            )}

                            <Circle
                              style={{
                                width: 22,
                                height: 22,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isSelected ? '#2ECC71' : 'transparent',
                              } as any}
                              borderColor="#2ECC71"
                              borderWidth={2}
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
                <YStack style={{ marginTop: 8, padding: 8, borderRadius: 5, backgroundColor: '#2ECC711A' } as any}>
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
                  <YStack style={{ marginTop: 8, padding: 8, borderRadius: 5, backgroundColor: '#2ECC711A' } as any}>
                    <Text fontSize={13} fontWeight="700" color="#2ECC71">
                      {t('splitSession.unitsAssigned', { count: Object.values(editing.perPersonCount).reduce((a, b) => a + (b || 0), 0) })}
                    </Text>
                    <Text fontSize={12} color="#2ECC71">
                      {t('splitSession.perUnit')} {fmtCurrency(editingItem?.price || 0)}
                    </Text>
                  </YStack>
                )}

              <XStack style={{ marginTop: 'auto', gap: 8 } as any}>
                <Button
                  unstyled
                  onPress={closeAssignModal}
                  style={{
                    width: 155,
                    height: 41,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  } as any}
                  borderWidth={1}
                  borderColor="rgba(255, 255, 255, 0.15)"
                >
                  <Text color="rgba(255, 255, 255, 0.88)">{t('common.cancel')}</Text>
                </Button>
                <Button
                  unstyled
                  onPress={modalSave}
                  style={{
                    width: 155,
                    height: 41,
                    borderRadius: 10,
                    backgroundColor: '#2ECC71',
                    alignItems: 'center',
                    justifyContent: 'center',
                  } as any}
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
            style={{ top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' } as any}
          >
            <YStack style={{ width: 390, height: 156, alignItems: 'center', justifyContent: 'center', backgroundColor: '$color1', borderRadius: 12 } as any}>
              <Spinner size="large" color="#2ECC71" />
              <Text style={{ marginTop: 8 } as any} color="#2ECC71" fontSize={16} fontWeight="600">
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
            style={{ top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' } as any}
          >
            <YStack style={{ width: 390, height: 156, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2ECC71', borderRadius: 12 } as any}>
              <Check size={42} color="white" />
              <Text style={{ marginTop: 8 } as any} color="white" fontSize={18} fontWeight="700">
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
          style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 } as any}
        >
          <YStack
            style={{
              width: '90%',
              maxWidth: 350,
              backgroundColor: 'rgba(15, 15, 25, 0.98)',
              padding: 16,
              gap: 12,
            } as any}
            borderWidth={1}
            borderColor="rgba(255, 255, 255, 0.12)"
            borderRadius={16}
            shadowColor="#000"
            shadowOpacity={0.4}
            shadowRadius={16}
            elevation={10}
          >
            <Text fontSize={18} fontWeight="700" color="white">{t('splitSession.editItem')}</Text>

            <YStack style={{ gap: 4 } as any}>
              <Text fontSize={12} color="rgba(255, 255, 255, 0.45)">{t('splitSession.itemName')}</Text>
              <Input
                value={detailsEditing.name}
                onChangeText={(t) => setDetailsEditing({ ...detailsEditing, name: t })}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' } as any}
                borderColor="rgba(255, 255, 255, 0.1)"
                color="white"
              />
            </YStack>

            <XStack style={{ gap: 12 } as any}>
              <YStack style={{ flex: 1, gap: 4 } as any}>
                <Text fontSize={12} color="rgba(255, 255, 255, 0.45)">{t('splitSession.price')}</Text>
                <Input
                  value={String(detailsEditing.price)}
                  keyboardType="numeric"
                  onChangeText={(t) => setDetailsEditing({ ...detailsEditing, price: Number(t.replace(/[^0-9.]/g, '')) })}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' } as any}
                  borderColor="rgba(255, 255, 255, 0.1)"
                  color="white"
                />
              </YStack>
              <YStack style={{ flex: 1, gap: 4 } as any}>
                <Text fontSize={12} color="rgba(255, 255, 255, 0.45)">{t('splitSession.quantity')}</Text>
                <Input
                  value={String(detailsEditing.quantity)}
                  keyboardType="numeric"
                  onChangeText={(t) => setDetailsEditing({ ...detailsEditing, quantity: Number(t.replace(/[^0-9]/g, '')) })}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' } as any}
                  borderColor="rgba(255, 255, 255, 0.1)"
                  color="white"
                />
              </YStack>
            </XStack>

            <XStack style={{ marginTop: 8, gap: 8 } as any}>
              <Button
                style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' } as any}
                onPress={() => setDetailsEditing(null)}
                borderWidth={1}
                borderColor="rgba(255, 255, 255, 0.15)"
              >
                <Text color="rgba(255, 255, 255, 0.88)">{t('common.cancel')}</Text>
              </Button>
              <Button
                style={{ flex: 1, backgroundColor: '#2ECC71' } as any}
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
                style={{ backgroundColor: 'rgba(239, 83, 80, 0.15)' } as any}
                borderColor="rgba(239, 83, 80, 0.3)"
                borderWidth={0.5}
                pressStyle={{ opacity: 0.8, scale: 0.98 }}
                animation="quick"
                onPress={() => {
                  commitItems((prev) => prev.filter(i => i.id !== detailsEditing.id));
                  setDetailsEditing(null);
                }}
              >
                <Text color="#ef5350" fontWeight="600">{t('common.delete')}</Text>
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
        <Sheet.Frame style={{ alignItems: 'center', justifyContent: 'flex-start', padding: 16, backgroundColor: '$color1', paddingBottom: insets.bottom + 20 } as any}>
          <Sheet.Handle />

          <XStack style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } as any}>
            <XStack style={{ alignItems: 'center', gap: 8 } as any}>
              <Sparkles size={20} color="#8A2BE2" />
              <Text fontSize={18} fontWeight="700">Magic AI Bo'lishish</Text>
            </XStack>
            <Button size="$2" circular chromeless onPress={() => setAiModalOpen(false)}>
              <X size={20} color="$gray10" />
            </Button>
          </XStack>

          <Text fontSize={14} color="$gray11" textAlign="center" style={{ marginBottom: 16 } as any}>
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
            style={{ width: '100%', backgroundColor: '$backgroundPress', padding: 12 } as any}
            borderRadius={12}
            textAlignVertical="top"
            blurOnSubmit={true}
            returnKeyType="done"
          />

          <XStack style={{ width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 16 } as any}>
            <Button
              circular
              size="$5"
              style={{ backgroundColor: isRecording ? "#E74C3C" : "#8A2BE2" } as any}
              onPress={isRecording ? stopRecording : startRecording}
              pressStyle={{ opacity: 0.8 }}
            >
              {isRecording ? <Square size={20} color="white" /> : <Mic size={20} color="white" />}
            </Button>
          </XStack>
          
          <YStack minHeight={20} style={{ alignItems: 'center', justifyContent: 'center', marginTop: 8 } as any}>
            {isRecording && <Text color="#E74C3C" fontSize={13} fontWeight="600">Yozilmoqda...</Text>}
            {audioPayload && !isRecording && <Text color="#2ECC71" fontSize={13} fontWeight="600">Ovoz muvaffaqiyatli saqlandi! ✔️</Text>}
          </YStack>

          {aiError && (
            <Text style={{ marginTop: 8 } as any} color="#E74C3C" fontSize={13} textAlign="center">
              {aiError}
            </Text>
          )}

          <Button
            style={{
              marginTop: 12,
              width: '100%',
              height: 44,
              backgroundColor: (aiPrompt.trim() || audioPayload) ? "#8A2BE2" : "$gray5",
            } as any}
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

      {/* Currency Selection Sheet */}
      <Sheet
        modal
        open={currencySheetOpen}
        onOpenChange={setCurrencySheetOpen}
        snapPoints={[35]}
        dismissOnSnapToBottom
        animation="quick"
      >
        <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Frame style={{ alignItems: 'center', justifyContent: 'flex-start', padding: 16, backgroundColor: '$color1', paddingBottom: insets.bottom + 20 } as any}>
          <Sheet.Handle />
          <Text fontSize={18} fontWeight="700" style={{ marginBottom: 16, marginTop: 8 } as any}>
            Select Currency
          </Text>
          <XStack style={{ flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: '100%' } as any}>
            {['UZS', 'USD', 'EUR', 'RUB', 'JPY'].map((cur) => {
              const active = cur === storeCurrency;
              return (
                <Button
                  key={cur}
                  onPress={() => onCurrencySelect(cur)}
                  style={{
                    width: 90,
                    height: 42,
                    backgroundColor: active ? 'rgba(49, 46, 129, 0.08)' : 'transparent',
                  } as any}
                  borderRadius={10}
                  borderWidth={active ? 1.5 : 0.5}
                  borderColor={active ? '#312E81' : '$borderColor'}
                  pressStyle={{ scale: 0.98 }}
                  animation="quick"
                >
                  <Text fontSize={14} fontWeight="600" color={active ? '#312E81' : '$gray11'}>
                    {cur}
                  </Text>
                </Button>
              );
            })}
          </XStack>
        </Sheet.Frame>
      </Sheet>

    </YStack>
  );
}













