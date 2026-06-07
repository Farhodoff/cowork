import React, { useEffect, useState, useCallback } from 'react';
import { FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Button } from 'tamagui';
import { ChevronLeft, Clock, UserPlus, UserMinus, FileText, CheckCircle } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/features/auth/api';
import UserAvatar from '@/shared/ui/UserAvatar';

interface ActivityEntry {
  id: number;
  type: string;
  metadata: any;
  createdAt: string;
  actor: {
    username: string;
    uniqueId: string;
    avatarUrl: string | null;
  };
}

interface ActivityResponse {
  total: number;
  limit: number;
  offset: number;
  entries: ActivityEntry[];
}

const ACTIVITY_LIMIT = 20;

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'session_created':
      return <FileText size={18} color="#3498DB" />;
    case 'session_finalized':
      return <CheckCircle size={18} color="#2ECC71" />;
    case 'member_added':
      return <UserPlus size={18} color="#8A2BE2" />;
    case 'member_removed':
      return <UserMinus size={18} color="#E74C3C" />;
    default:
      return <Clock size={18} color="$gray10" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'session_created':
      return '#EBF5FB';
    case 'session_finalized':
      return '#EAFAF1';
    case 'member_added':
      return '#F4ECFB';
    case 'member_removed':
      return '#FDEDEC';
    default:
      return '$gray3';
  }
};

const getActivityText = (entry: ActivityEntry) => {
  const actor = entry.actor.username;
  const meta = entry.metadata || {};
  switch (entry.type) {
    case 'session_created':
      return `${actor} yangi chek qo'shdi`;
    case 'session_finalized': {
      const name = meta.sessionName || 'Chek';
      const total = meta.grandTotal ? ` — ${Math.round(meta.grandTotal).toLocaleString()} ${meta.currency || 'UZS'}` : '';
      return `${actor} hisobni yakunladi: ${name}${total}`;
    }
    case 'member_added':
      return `${meta.memberUsername || meta.memberUniqueId || '?'} guruhga qo'shildi`;
    case 'member_removed':
      return `${meta.memberUsername || meta.memberUniqueId || '?'} guruhdan chiqarildi`;
    default:
      return `${actor} — ${entry.type}`;
  }
};

const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Hozir';
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  if (diffH < 24) return `${diffH} soat oldin`;
  if (diffD === 1) return 'Kecha';
  if (diffD < 7) return `${diffD} kun oldin`;
  return date.toLocaleDateString('uz', { day: '2-digit', month: 'short' });
};

export default function GroupActivityScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchActivities = useCallback(
    async (offset = 0, append = false) => {
      if (!groupId) return;
      try {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);

        const { data } = await apiClient.get<ActivityResponse>(
          `/groups/${groupId}/activity`,
          { params: { limit: ACTIVITY_LIMIT, offset } }
        );

        if (append) {
          setEntries((prev) => [...prev, ...data.entries]);
        } else {
          setEntries(data.entries);
        }
        setTotal(data.total);
      } catch (err: any) {
        setError(err.message || 'Failed to load activity');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  const loadMore = () => {
    if (loadingMore || entries.length >= total) return;
    fetchActivities(entries.length, true);
  };

  const renderItem = ({ item }: { item: ActivityEntry }) => (
    <XStack
      bg={getActivityColor(item.type)}
      borderRadius={12}
      p="$3"
      gap="$3"
      ai="center"
    >
      <XStack
        w={40}
        h={40}
        borderRadius={20}
        bg="white"
        ai="center"
        jc="center"
      >
        {getActivityIcon(item.type)}
      </XStack>
      <YStack f={1} gap="$1">
        <Text fontSize={14} fontWeight="500" color="$gray12">
          {getActivityText(item)}
        </Text>
        <Text fontSize={12} color="$gray10">
          {formatRelativeDate(item.createdAt)}
        </Text>
      </YStack>
    </XStack>
  );

  if (loading) {
    return (
      <YStack f={1} ai="center" jc="center" bg="$background">
        <Spinner />
      </YStack>
    );
  }

  return (
    <YStack f={1} bg="$background" p="$4">
      {/* Header */}
      <XStack ai="center" gap="$2" mb="$4">
        <Button
          chromeless
          circular
          size="$2"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color="$gray12" />}
        />
        <Clock size={20} color="#8A2BE2" />
        <Text fontSize={18} fontWeight="700">Guruh Tarixi</Text>
      </XStack>

      {error && (
        <Text color="$red10" mb="$3">{error}</Text>
      )}

      {entries.length === 0 && !error && (
        <YStack ai="center" jc="center" f={1}>
          <Text color="$gray10" fontSize={14}>
            Hali hech qanday hodisa yozilmagan
          </Text>
        </YStack>
      )}

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <YStack ai="center" p="$3">
              <Spinner />
            </YStack>
          ) : null
        }
      />
    </YStack>
  );
}
