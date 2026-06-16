import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { YStack, XStack, Text, View, Circle } from 'tamagui';
import { 
  Users, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Bell, 
  Plus, 
  Receipt,
  Clock,
  Sparkles,
  Check
} from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import type { SessionHistoryEntry } from '@/features/sessions/api/history.api';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useGroupsStore } from '@/features/groups/model/groups.store';

const HOME_HISTORY_LIMIT = 10;
const DEFAULT_CURRENCY = 'UZS';

const AVATAR_COLORS = ['#FF8A65', '#EF5350', '#FFD54F', '#4DB6AC', '#7986CB', '#9575CD'];

const getRelativeTimeLabel = (dateStr?: string, t?: (key: string, opts?: any) => string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return t ? t('dashboard.today', 'Today') : 'Today';
  } else if (diffDays === 1) {
    return t ? t('dashboard.yesterday', 'Yesterday') : 'Yesterday';
  } else if (diffDays > 1 && diffDays <= 7) {
    return t ? t('dashboard.daysAgo', { count: diffDays }) : `${diffDays} days ago`;
  }
  
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

function AvatarStack({ participantIds }: { participantIds: string[] }) {
  const shown = participantIds.slice(0, 4);
  const extra = Math.max(0, participantIds.length - shown.length);

  return (
    <XStack height={28} alignItems="center">
      {shown.map((uniqueId, i) => {
        const char = (uniqueId || 'U').replace('#', '').slice(0, 1).toUpperCase();
        // Deterministic color selection based on uniqueId character codes
        const codeSum = uniqueId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const color = AVATAR_COLORS[Math.abs(codeSum) % AVATAR_COLORS.length];
        
        return (
          <View
            key={uniqueId ?? i}
            marginLeft={i === 0 ? 0 : -8}
            width={28}
            height={28}
            borderRadius={14}
            backgroundColor={color}
            borderWidth={2}
            borderColor="$background"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={11} fontWeight="700" color="white" lineHeight={11}>
              {char}
            </Text>
          </View>
        );
      })}
      {extra > 0 && (
        <View
          width={28}
          height={28}
          borderRadius={14}
          backgroundColor="$gray4"
          borderWidth={2}
          borderColor="$background"
          marginLeft={-8}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={10} color="$gray11" fontWeight="700" lineHeight={10}>
            +{extra}
          </Text>
        </View>
      )}
    </XStack>
  );
}

function BillCard({
  title,
  groupName,
  timeLabel,
  amountLabel,
  participantIds,
  onPress,
}: {
  title: string;
  groupName: string;
  timeLabel: string;
  amountLabel: string;
  participantIds: string[];
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        width: '100%',
        opacity: onPress && pressed ? 0.92 : 1,
      })}
    >
      <YStack
        padding="$4"
        borderRadius={18}
        borderWidth={0.5}
        borderColor="rgba(255,255,255,0.08)"
        backgroundColor="rgba(255,255,255,0.04)"
        pressStyle={{ scale: 0.98 }}
        animation="quick"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack space="$1" flex={1} marginRight="$2">
            <Text fontSize={15} fontWeight="700" color="rgba(255,255,255,0.88)" numberOfLines={1}>
              {title}
            </Text>
            
            {/* Group & Time info */}
            <XStack alignItems="center" space="$1.5">
              <Users size={12} color="rgba(255,255,255,0.4)" />
              <Text fontSize={12} color="rgba(255,255,255,0.4)" numberOfLines={1}>
                {groupName}
              </Text>
              <Text fontSize={12} color="rgba(255,255,255,0.25)">
                •
              </Text>
              <Clock size={12} color="rgba(255,255,255,0.4)" />
              <Text fontSize={12} color="rgba(255,255,255,0.4)">
                {timeLabel}
              </Text>
            </XStack>
          </YStack>

          <Text fontSize={16} fontWeight="700" color="rgba(255,255,255,0.88)">
            {amountLabel}
          </Text>
        </XStack>

        {/* Avatar stack */}
        {participantIds.length > 0 && (
          <XStack marginTop="$3" alignItems="center">
            <AvatarStack participantIds={participantIds} />
          </XStack>
        )}
      </YStack>
    </Pressable>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  // App store states
  const { user } = useAppStore();
  const myUniqueId = user?.uniqueId;

  // Groups store states
  const { groups, fetchGroups } = useGroupsStore();

  // Sessions store states
  const sessions = useSessionsHistoryStore(state => state.sessions);
  const loading = useSessionsHistoryStore(state => state.loading);
  const initialized = useSessionsHistoryStore(state => state.initialized);
  const currentLimit = useSessionsHistoryStore(state => state.limit);
  const error = useSessionsHistoryStore(state => state.error);
  const fetchHistory = useSessionsHistoryStore(state => state.fetchHistory);
  const refreshIfStale = useSessionsHistoryStore(state => state.refreshIfStale);
  const forceRefresh = useSessionsHistoryStore(state => state.forceRefresh);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (hasFetchedRef.current) return;
    if (!initialized || (currentLimit ?? 0) < HOME_HISTORY_LIMIT) {
      hasFetchedRef.current = true;
      fetchHistory(HOME_HISTORY_LIMIT).catch(() => {
        hasFetchedRef.current = false;
      });
    }
  }, [initialized, loading, currentLimit, fetchHistory]);

  useFocusEffect(
    useCallback(() => {
      refreshIfStale(15_000, HOME_HISTORY_LIMIT).catch(() => {});
      fetchGroups().catch(() => {});
    }, [refreshIfStale, fetchGroups])
  );

  const onManualRefresh = useCallback(() => {
    forceRefresh(HOME_HISTORY_LIMIT).catch(() => {});
    fetchGroups().catch(() => {});
  }, [forceRefresh, fetchGroups]);

  const openGroups = () => router.push('/tabs/groups');
  const onScan = () => router.push('/tabs/scan-receipt');
  const onMagicSplit = () => router.push('/tabs/scan-receipt');
  const openAllSessions = () => router.push('/tabs/sessions/history');

  const recent = useMemo<SessionHistoryEntry[]>(() => sessions.slice(0, 3), [sessions]);

  // Aggregate balance summary (Owe / Owed / Spent)
  const { totalOwe, totalOwed, totalSpent } = useMemo(() => {
    let owe = 0;
    let owed = 0;
    let spent = 0;

    sessions.forEach(session => {
      const byParticipant = session.totals?.byParticipant || [];
      const grandTotal = session.grandTotal || 0;

      if (session.isCreator) {
        let othersOwed = 0;
        byParticipant.forEach(p => {
          if (p.uniqueId !== myUniqueId) {
            owed += p.amountOwed;
            othersOwed += p.amountOwed;
          }
        });
        spent += Math.max(0, grandTotal - othersOwed);
      } else {
        const myEntry = byParticipant.find(p => p.uniqueId === myUniqueId);
        if (myEntry) {
          owe += myEntry.amountOwed;
          spent += myEntry.amountOwed;
        }
      }
    });

    return { totalOwe: owe, totalOwed: owed, totalSpent: spent };
  }, [sessions, myUniqueId]);

  // Aggregate individual debt list for interactive settle-up display
  const debtList = useMemo(() => {
    const balanceMap = new Map<string, { username: string; amount: number }>();

    sessions.forEach(session => {
      const byParticipant = session.totals?.byParticipant || [];
      if (session.isCreator) {
        byParticipant.forEach(p => {
          if (p.uniqueId !== myUniqueId) {
            const current = balanceMap.get(p.uniqueId) || { username: p.username || p.uniqueId, amount: 0 };
            current.amount += p.amountOwed;
            balanceMap.set(p.uniqueId, current);
          }
        });
      } else {
        const myEntry = byParticipant.find(p => p.uniqueId === myUniqueId);
        if (myEntry && myEntry.amountOwed > 0) {
          const creatorUid = 'creator';
          const creatorName = t('common.creator', 'Creator');
          const current = balanceMap.get(creatorUid) || { username: creatorName, amount: 0 };
          current.amount -= myEntry.amountOwed;
          balanceMap.set(creatorUid, current);
        }
      }
    });

    const list: { uniqueId: string; username: string; amount: number }[] = [];
    balanceMap.forEach((val, key) => {
      if (Math.abs(val.amount) > 0.01) {
        list.push({ uniqueId: key, username: val.username, amount: val.amount });
      }
    });
    return list;
  }, [sessions, myUniqueId]);

  // Group name mapping
  const groupMap = useMemo(() => {
    const map = new Map<number, string>();
    groups.forEach(g => map.set(g.id, g.name));
    return map;
  }, [groups]);

  // Formatting currency dynamically
  const currencySymbol = useMemo(() => {
    if (sessions.length > 0) {
      const c = sessions[0]?.currency || sessions[0]?.payload?.totals?.currency;
      if (c === 'USD') return '$';
      if (c === 'UZS') return 'UZS';
      if (c) return c;
    }
    return '$'; // default to $ for premium/mockup feel
  }, [sessions]);

  const formatCurrencyValue = (val: number) => {
    if (currencySymbol === '$') {
      return `$${val.toFixed(2)}`;
    }
    return `${val.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currencySymbol}`;
  };

  return (
    <ScreenContainer>
      <View f={1} position="relative" bg="$background">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack width="100%">
            {/* Transparent Header */}
            <YStack
              width="100%"
              paddingHorizontal="$4"
              pb="$6"
              pt="$4"
            >
              {/* Header Title Row */}
              <XStack justifyContent="space-between" alignItems="center" marginTop="$2" marginBottom="$4">
                <YStack>
                  <Text fontSize={24} fontWeight="800" color="rgba(255,255,255,0.88)">
                    {t('dashboard.hello', { name: user?.username || 'salom' })}
                  </Text>
                  <Text fontSize={14} color="rgba(255, 255, 255, 0.4)">
                    {t('dashboard.expenseSummary')}
                  </Text>
                </YStack>
                
                <Circle
                  size={42}
                  backgroundColor="rgba(255, 255, 255, 0.06)"
                  borderWidth={0.5}
                  borderColor="rgba(255, 255, 255, 0.1)"
                  pressStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                  onPress={() => {}}
                >
                  <Bell size={20} color="#ef9f27" fill="#ef9f27" />
                </Circle>
              </XStack>

              {/* Total Spent Card - Glassmorphism */}
              <YStack
                width="100%"
                backgroundColor="rgba(255, 255, 255, 0.04)"
                borderWidth={0.5}
                borderColor="rgba(255, 255, 255, 0.08)"
                borderRadius={20}
                padding="$4"
                marginBottom="$4"
                gap="$1"
              >
                <Text fontSize={11} color="rgba(255, 255, 255, 0.4)" fontWeight="700" letterSpacing={0.8} textTransform="uppercase">
                  {t('dashboard.totalSpent', 'Jami shaxsiy xarajatlar')}
                </Text>
                <Text fontSize={28} fontWeight="700" color="rgba(255,255,255,0.88)">
                  {formatCurrencyValue(totalSpent)}
                </Text>
              </YStack>

              {/* Balance & Settle Up Panel */}
              {debtList.length > 0 && (
                <View width="100%">
                  <YStack gap="$2" width="100%">
                    <Text fontSize={11} color="rgba(255, 255, 255, 0.4)" fontWeight="700" letterSpacing={0.8} textTransform="uppercase" marginBottom="$1">
                      {t('dashboard.activeBalances', 'Faol balanslar')}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {debtList.map((debt) => {
                        const isOwed = debt.amount > 0;
                        const absVal = Math.abs(debt.amount);
                        return (
                          <XStack
                            key={debt.uniqueId}
                            backgroundColor="rgba(255, 255, 255, 0.04)"
                            borderWidth={0.5}
                            borderColor="rgba(255, 255, 255, 0.08)"
                            borderRadius={18}
                            padding="$3"
                            alignItems="center"
                            gap="$3"
                            minWidth={170}
                          >
                            <Circle size={38} backgroundColor={isOwed ? "rgba(0,188,140,0.18)" : "rgba(229,57,53,0.15)"} alignItems="center" justifyContent="center">
                              <Text color={isOwed ? "#00d4a0" : "#ef5350"} fontWeight="700" fontSize={14}>
                                {debt.username.slice(0, 1).toUpperCase()}
                              </Text>
                            </Circle>
                            <YStack>
                              <Text color="rgba(255,255,255,0.88)" fontWeight="700" fontSize={13} numberOfLines={1} maxWidth={90}>
                                {debt.username}
                              </Text>
                              <Text color={isOwed ? "#00d4a0" : "#ef5350"} fontWeight="800" fontSize={14}>
                                {isOwed ? `+${formatCurrencyValue(absVal)}` : `-${formatCurrencyValue(absVal)}`}
                              </Text>
                            </YStack>
                          </XStack>
                        );
                      })}
                    </ScrollView>
                  </YStack>
                </View>
              )}
            </YStack>

            {/* Floating Actions Card - Glassmorphism */}
            <XStack
              width="90%"
              backgroundColor="rgba(255, 255, 255, 0.04)"
              borderRadius={24}
              padding="$3"
              borderWidth={0.5}
              borderColor="rgba(255, 255, 255, 0.08)"
              alignSelf="center"
              marginTop="$4"
              marginBottom="$6"
              justifyContent="space-between"
            >
              {/* Scan Receipt */}
              <XStack
                flex={1}
                height={68}
                borderRadius={18}
                backgroundColor="rgba(255, 255, 255, 0.02)"
                alignItems="center"
                padding="$3"
                marginRight="$2"
                onPress={onScan}
                pressStyle={{ scale: 0.98 }}
                animation="quick"
              >
                <Circle size={40} backgroundColor="rgba(124, 77, 255, 0.28)" ai="center" jc="center" marginRight="$2">
                  <Receipt size={20} color="#b39dff" />
                </Circle>
                <YStack>
                  <Text fontSize={13} fontWeight="700" color="rgba(255, 255, 255, 0.88)">
                    {t('dashboard.scanReceipt')}
                  </Text>
                  <Text fontSize={10} color="rgba(255, 255, 255, 0.4)">
                    {t('dashboard.aiPowered')}
                  </Text>
                </YStack>
              </XStack>

              {/* Magic Split */}
              <XStack
                flex={1}
                height={68}
                borderRadius={18}
                backgroundColor="rgba(255, 255, 255, 0.02)"
                alignItems="center"
                padding="$3"
                marginLeft="$2"
                onPress={onMagicSplit}
                pressStyle={{ scale: 0.98 }}
                animation="quick"
              >
                <Circle size={40} backgroundColor="rgba(124, 77, 255, 0.28)" ai="center" jc="center" marginRight="$2">
                  <Sparkles size={20} color="#b39dff" />
                </Circle>
                <YStack>
                  <Text fontSize={13} fontWeight="700" color="rgba(255, 255, 255, 0.88)">
                    {t('dashboard.magicSplit')}
                  </Text>
                  <Text fontSize={10} color="rgba(255, 255, 255, 0.4)">
                    {t('dashboard.smartSplit')}
                  </Text>
                </YStack>
              </XStack>
            </XStack>

            {/* Recent Activity Header */}
            <XStack paddingHorizontal="$4" justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize={16} fontWeight="700" color="rgba(255, 255, 255, 0.88)">
                {t('dashboard.recentActivity')}
              </Text>
              
              <XStack alignItems="center" gap="$3">
                <Pressable
                  onPress={onManualRefresh}
                  disabled={loading}
                  accessibilityLabel="Refresh recent bills"
                >
                  <XStack alignItems="center" opacity={loading ? 0.6 : 1}>
                    <RefreshCw size={16} color="rgba(255, 255, 255, 0.4)" />
                  </XStack>
                </Pressable>

                <Pressable onPress={openAllSessions}>
                  <Text color="#7c4dff" fontWeight="700" fontSize={13}>
                    {t('dashboard.viewAll')}
                  </Text>
                </Pressable>
              </XStack>
            </XStack>

            {/* Recent Activity List */}
            <YStack paddingHorizontal="$4" gap="$3.5">
              {loading && !recent.length && (
                <Text color="$gray10" fontSize={14} textAlign="center" py="$4">
                  {t('dashboard.loadingActivity')}
                </Text>
              )}
              
              {error && (
                <Text color="$red10" fontSize={14} textAlign="center" py="$4">
                  {error}
                </Text>
              )}
              
              {!loading && !error && !recent.length && (
                <Text color="$gray10" fontSize={14} textAlign="center" py="$4">
                  {t('dashboard.noActivity')}
                </Text>
              )}
              
              {recent.map((bill) => {
                const participantIds = bill.participantUniqueIds ?? [];
                const dateForSummary = bill.finalizedAt || bill.createdAt;
                const timeLabel = getRelativeTimeLabel(dateForSummary, t);
                
                const groupId = bill.payload?.groupId;
                const groupName = (groupId != null && groupMap.get(groupId)) || t('dashboard.personalSplit', 'Personal Split');
                
                const totalAmount = bill.grandTotal ?? 0;
                const amountLabel = formatCurrencyValue(totalAmount);

                return (
                  <BillCard
                    key={bill.sessionId}
                    title={bill.sessionName || t('dashboard.splitBill', 'Split Bill')}
                    groupName={groupName}
                    timeLabel={timeLabel}
                    amountLabel={amountLabel}
                    participantIds={participantIds}
                    onPress={() =>
                      router.push({
                        pathname: '/tabs/sessions/history/[historyId]',
                        params: { historyId: String(bill.sessionId) },
                      })
                    }
                  />
                );
              })}
            </YStack>
          </YStack>
        </ScrollView>

        {/* Floating Action Button (FAB) */}
        <Circle
          size={56}
          backgroundColor="#7c4dff"
          position="absolute"
          right={16}
          bottom={16}
          pressStyle={{ scale: 0.95 }}
          onPress={openGroups}
          style={{
            shadowColor: '#7c4dff',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 28,
            elevation: 8,
          }}
        >
          <Plus size={24} color="white" />
        </Circle>
      </View>
    </ScreenContainer>
  );
}
