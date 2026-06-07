import React, { useEffect, useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Button, ScrollView } from 'tamagui';
import { ChevronLeft, BarChart3 } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/features/auth/api';

interface MemberStat {
  uniqueId: string;
  username: string;
  total: number;
}

interface MonthStat {
  month: string;
  total: number;
}

interface GroupAnalytics {
  groupName: string;
  totalExpense: number;
  currency: string;
  sessionsCount: number;
  byMember: MemberStat[];
  byMonth: MonthStat[];
}

export default function GroupAnalyticsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [data, setData] = useState<GroupAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    apiClient
      .get<GroupAnalytics>(`/analytics/group/${groupId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [groupId]);

  const maxMemberTotal = useMemo(() => {
    if (!data?.byMember?.length) return 1;
    return Math.max(...data.byMember.map((m) => m.total), 1);
  }, [data]);

  const maxMonthTotal = useMemo(() => {
    if (!data?.byMonth?.length) return 1;
    return Math.max(...data.byMonth.map((m) => m.total), 1);
  }, [data]);

  const fmtAmount = (n: number) => {
    const currency = data?.currency || 'UZS';
    return `${Math.round(n).toLocaleString('en-US')} ${currency}`;
  };

  const fmtMonth = (m: string) => {
    const [year, month] = m.split('-');
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <YStack f={1} ai="center" jc="center" bg="$background">
        <Spinner />
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack f={1} p="$4" bg="$background">
        <Button
          chromeless
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} />}
          mb="$3"
        >
          Orqaga
        </Button>
        <Text color="$red10">{error}</Text>
      </YStack>
    );
  }

  return (
    <ScrollView f={1} bg="$background">
      <YStack f={1} p="$4" gap="$4">
        {/* Header */}
        <XStack ai="center" gap="$2">
          <Button
            chromeless
            circular
            size="$2"
            onPress={() => router.back()}
            icon={<ChevronLeft size={18} color="$gray12" />}
          />
          <BarChart3 size={20} color="#8A2BE2" />
          <Text fontSize={18} fontWeight="700">Statistika</Text>
        </XStack>

        {/* Group name & summary */}
        <YStack
          bg="#8A2BE2"
          borderRadius={16}
          p="$4"
          gap="$2"
        >
          <Text color="white" fontSize={14} opacity={0.8}>
            {data?.groupName}
          </Text>
          <Text color="white" fontSize={28} fontWeight="800">
            {fmtAmount(data?.totalExpense || 0)}
          </Text>
          <Text color="white" fontSize={13} opacity={0.7}>
            {data?.sessionsCount || 0} ta chek yakunlangan
          </Text>
        </YStack>

        {/* By Member */}
        {(data?.byMember?.length ?? 0) > 0 && (
          <YStack gap="$3">
            <Text fontSize={16} fontWeight="700" color="$gray12">
              A'zolar bo'yicha
            </Text>
            {data!.byMember.map((m) => {
              const pct = Math.min((m.total / maxMemberTotal) * 100, 100);
              return (
                <YStack key={m.uniqueId} gap="$1">
                  <XStack jc="space-between" ai="center">
                    <Text fontSize={14} fontWeight="500" color="$gray12">
                      {m.username}
                    </Text>
                    <Text fontSize={13} fontWeight="600" color="#8A2BE2">
                      {fmtAmount(m.total)}
                    </Text>
                  </XStack>
                  <XStack h={8} bg="$gray4" borderRadius={4} overflow="hidden">
                    <XStack
                      h={8}
                      bg="#8A2BE2"
                      borderRadius={4}
                      width={`${pct}%`}
                    />
                  </XStack>
                </YStack>
              );
            })}
          </YStack>
        )}

        {/* By Month */}
        {(data?.byMonth?.length ?? 0) > 0 && (
          <YStack gap="$3" mt="$2">
            <Text fontSize={16} fontWeight="700" color="$gray12">
              Oylar bo'yicha xarajat
            </Text>
            <XStack jc="space-around" ai="flex-end" h={160} gap="$2">
              {data!.byMonth.map((m) => {
                const pct = Math.max((m.total / maxMonthTotal) * 100, 5);
                return (
                  <YStack key={m.month} ai="center" f={1} jc="flex-end" gap="$1">
                    <Text fontSize={10} color="#8A2BE2" fontWeight="600">
                      {fmtAmount(m.total)}
                    </Text>
                    <YStack
                      bg="#8A2BE2"
                      borderRadius={6}
                      w="80%"
                      minWidth={24}
                      height={`${pct}%`}
                    />
                    <Text fontSize={11} color="$gray10" mt="$1">
                      {fmtMonth(m.month)}
                    </Text>
                  </YStack>
                );
              })}
            </XStack>
          </YStack>
        )}

        {/* Empty state */}
        {(data?.sessionsCount ?? 0) === 0 && (
          <YStack ai="center" jc="center" p="$6">
            <Text color="$gray10" fontSize={14}>
              Hali hech qanday yakunlangan chek yo'q
            </Text>
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
