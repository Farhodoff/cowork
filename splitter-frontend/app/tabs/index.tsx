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
  Clock
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

const getRelativeTimeLabel = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays > 1 && diffDays <= 7) {
    return `${diffDays} days ago`;
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
            borderColor="white"
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
          borderColor="white"
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
        borderRadius={20}
        borderWidth={1}
        borderColor="$gray3"
        backgroundColor="white"
        elevation={1}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 1 }}
        shadowOpacity={0.05}
        shadowRadius={4}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack space="$1" flex={1} marginRight="$2">
            <Text fontSize={16} fontWeight="700" color="$gray12" numberOfLines={1}>
              {title}
            </Text>
            
            {/* Group & Time info */}
            <XStack alignItems="center" space="$1.5">
              <Users size={12} color="$gray9" />
              <Text fontSize={12} color="$gray10" numberOfLines={1}>
                {groupName}
              </Text>
              <Text fontSize={12} color="$gray8">
                •
              </Text>
              <Clock size={12} color="$gray9" />
              <Text fontSize={12} color="$gray10">
                {timeLabel}
              </Text>
            </XStack>
          </YStack>

          <Text fontSize={18} fontWeight="800" color="$gray12">
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
  const openAllSessions = () => router.push('/tabs/sessions/history');

  const recent = useMemo<SessionHistoryEntry[]>(() => sessions.slice(0, 3), [sessions]);

  // Aggregate balance summary (Owe / Owed)
  const { totalOwe, totalOwed } = useMemo(() => {
    let owe = 0;
    let owed = 0;

    sessions.forEach(session => {
      const byParticipant = session.totals?.byParticipant || [];
      if (session.isCreator) {
        byParticipant.forEach(p => {
          if (p.uniqueId !== myUniqueId) {
            owed += p.amountOwed;
          }
        });
      } else {
        const myEntry = byParticipant.find(p => p.uniqueId === myUniqueId);
        if (myEntry) {
          owe += myEntry.amountOwed;
        }
      }
    });

    return { totalOwe: owe, totalOwed: owed };
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
      <View f={1} position="relative" bg="white">
        <ScrollView
          style={{ flex: 1, backgroundColor: 'white' }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack width="100%">
            {/* Curved Royal Blue Header */}
            <YStack
              width="100%"
              backgroundColor="#4F46E5"
              borderBottomLeftRadius={32}
              borderBottomRightRadius={32}
              paddingHorizontal="$4"
              pb="$9"
              pt="$4"
            >
              {/* Header Title Row */}
              <XStack justifyContent="space-between" alignItems="center" marginTop="$2" marginBottom="$4">
                <YStack>
                  <Text fontSize={24} fontWeight="800" color="white">
                    Hello, {user?.username || 'salom'} 👋
                  </Text>
                  <Text fontSize={14} color="rgba(255, 255, 255, 0.7)">
                    Here's your expense summary
                  </Text>
                </YStack>
                
                <Circle
                  size={42}
                  backgroundColor="rgba(255, 255, 255, 0.15)"
                  pressStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
                  onPress={() => {}}
                >
                  <Bell size={20} color="#F59E0B" fill="#F59E0B" />
                </Circle>
              </XStack>

              {/* Balance Cards */}
              <XStack justifyContent="space-between" width="100%">
                {/* You Owe Card */}
                <YStack
                  flex={1}
                  marginRight="$2.5"
                  backgroundColor="rgba(255, 255, 255, 0.1)"
                  borderRadius={20}
                  padding="$4"
                  height={110}
                  justifyContent="space-between"
                >
                  <Circle size={32} backgroundColor="#EF4444" ai="center" jc="center">
                    <ArrowUpRight size={18} color="white" />
                  </Circle>
                  <YStack space="$1">
                    <Text fontSize={12} color="rgba(255, 255, 255, 0.7)" fontWeight="500">
                      You Owe
                    </Text>
                    <Text fontSize={22} fontWeight="800" color="white">
                      {formatCurrencyValue(totalOwe)}
                    </Text>
                  </YStack>
                </YStack>

                {/* You are owed Card */}
                <YStack
                  flex={1}
                  marginLeft="$2.5"
                  backgroundColor="rgba(255, 255, 255, 0.1)"
                  borderRadius={20}
                  padding="$4"
                  height={110}
                  justifyContent="space-between"
                >
                  <Circle size={32} backgroundColor="#10B981" ai="center" jc="center">
                    <ArrowDownLeft size={18} color="white" />
                  </Circle>
                  <YStack space="$1">
                    <Text fontSize={12} color="rgba(255, 255, 255, 0.7)" fontWeight="500">
                      You are owed
                    </Text>
                    <Text fontSize={22} fontWeight="800" color="white">
                      {formatCurrencyValue(totalOwed)}
                    </Text>
                  </YStack>
                </YStack>
              </XStack>
            </YStack>

            {/* Floating Actions Card */}
            <XStack
              width="90%"
              backgroundColor="white"
              borderRadius={24}
              padding="$3"
              elevation={4}
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.1}
              shadowRadius={10}
              alignSelf="center"
              marginTop={-32}
              marginBottom="$6"
              justifyContent="space-between"
            >
              {/* Scan Receipt */}
              <XStack
                flex={1}
                height={68}
                borderRadius={18}
                backgroundColor="rgba(79, 70, 229, 0.06)"
                alignItems="center"
                padding="$3"
                marginRight="$2"
                onPress={onScan}
                pressStyle={{ opacity: 0.8 }}
              >
                <Circle size={40} backgroundColor="#4F46E5" ai="center" jc="center" marginRight="$2">
                  <Receipt size={20} color="white" />
                </Circle>
                <YStack>
                  <Text fontSize={14} fontWeight="700" color="$gray12">
                    Scan Receipt
                  </Text>
                  <Text fontSize={10} color="$gray9">
                    AI powered
                  </Text>
                </YStack>
              </XStack>

              {/* Add Expense */}
              <XStack
                flex={1}
                height={68}
                borderRadius={18}
                backgroundColor="rgba(16, 185, 129, 0.06)"
                alignItems="center"
                padding="$3"
                marginLeft="$2"
                onPress={openGroups}
                pressStyle={{ opacity: 0.8 }}
              >
                <Circle size={40} backgroundColor="#10B981" ai="center" jc="center" marginRight="$2">
                  <Plus size={20} color="white" />
                </Circle>
                <YStack>
                  <Text fontSize={14} fontWeight="700" color="$gray12">
                    Add Expense
                  </Text>
                  <Text fontSize={10} color="$gray9">
                    Manual entry
                  </Text>
                </YStack>
              </XStack>
            </XStack>

            {/* Recent Activity Header */}
            <XStack paddingHorizontal="$4" justifyContent="space-between" alignItems="center" marginBottom="$4">
              <Text fontSize={18} fontWeight="800" color="$gray12">
                Recent Activity
              </Text>
              
              <XStack alignItems="center" gap="$3">
                <Pressable
                  onPress={onManualRefresh}
                  disabled={loading}
                  accessibilityLabel="Refresh recent bills"
                >
                  <XStack alignItems="center" opacity={loading ? 0.6 : 1}>
                    <RefreshCw size={16} color="$gray10" />
                  </XStack>
                </Pressable>

                <Pressable onPress={openAllSessions}>
                  <Text color="#4F46E5" fontWeight="700" fontSize={14}>
                    View All
                  </Text>
                </Pressable>
              </XStack>
            </XStack>

            {/* Recent Activity List */}
            <YStack paddingHorizontal="$4" gap="$3.5">
              {loading && !recent.length && (
                <Text color="$gray10" fontSize={14} textAlign="center" py="$4">
                  Loading recent activity...
                </Text>
              )}
              
              {error && (
                <Text color="$red10" fontSize={14} textAlign="center" py="$4">
                  {error}
                </Text>
              )}
              
              {!loading && !error && !recent.length && (
                <Text color="$gray10" fontSize={14} textAlign="center" py="$4">
                  No activity yet
                </Text>
              )}
              
              {recent.map((bill) => {
                const participantIds = bill.participantUniqueIds ?? [];
                const dateForSummary = bill.finalizedAt || bill.createdAt;
                const timeLabel = getRelativeTimeLabel(dateForSummary);
                
                const groupId = bill.payload?.groupId;
                const groupName = (groupId != null && groupMap.get(groupId)) || 'Personal Split';
                
                const totalAmount = bill.grandTotal ?? 0;
                const amountLabel = formatCurrencyValue(totalAmount);

                return (
                  <BillCard
                    key={bill.sessionId}
                    title={bill.sessionName || 'Split Bill'}
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
          backgroundColor="#4F46E5"
          position="absolute"
          right={16}
          bottom={16}
          elevation={4}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.2}
          shadowRadius={6}
          pressStyle={{ scale: 0.95 }}
          onPress={openGroups}
        >
          <Plus size={24} color="white" />
        </Circle>
      </View>
    </ScreenContainer>
  );
}
