import { useEffect, useMemo, useState, useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Plus, Users } from '@tamagui/lucide-icons';
import {
  YStack,
  Card,
  XStack,
  Spinner,
  View,
  Button,
  Text,
  ScrollView,
} from 'tamagui';

import { useGroupsStore } from '@/features/groups/model/groups.store';
import type { GroupMember } from '@/features/groups/api/groups.api';
import UserAvatar from '@/shared/ui/UserAvatar';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';

function getRelativeTime(dateString?: string) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays < 7) return `${diffDays - 1} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} weeks ago`;
}

function AvatarStack({
  members,
  totalCount,
  max = 5,
}: {
  members?: GroupMember[];
  totalCount?: number;
  max?: number;
}) {
  const list = Array.isArray(members) ? members : [];
  const total = typeof totalCount === 'number' ? totalCount : list.length;
  const shownMembers = list.slice(0, Math.min(max, list.length));
  const hasMembers = shownMembers.length > 0;

  if (!hasMembers) {
    return null;
  }

  const labelFor = (member: GroupMember) => {
    const source = member.displayName || member.username || member.uniqueId || '';
    return source.trim().charAt(0).toUpperCase() || 'U';
  };

  const getBgColor = (label: string) => {
    const colors = ['#F97316', '#06B6D4', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981'];
    const charCode = (label.charCodeAt(0) || 0) % colors.length;
    return colors[charCode];
  };

  return (
    <XStack ai="center">
      {shownMembers.map((member, index) => {
        const label = labelFor(member);
        const bg = getBgColor(label);
        return (
          <View key={`${member.uniqueId ?? 'member'}-${index}`} ml={index === 0 ? 0 : -8}>
            <UserAvatar
              uri={member.avatarUrl ?? member.user?.avatarUrl ?? undefined}
              label={label}
              size={28}
              textSize={12}
              backgroundColor={bg}
            />
          </View>
        );
      })}
      {total > shownMembers.length && (
        <View
          w={28}
          h={28}
          br={14}
          bg="#9CA3AF"
          ai="center"
          jc="center"
          ml={-8}
        >
          <Text fontSize={11} fontWeight="700" color="white">
            +{total - shownMembers.length}
          </Text>
        </View>
      )}
    </XStack>
  );
}

export default function GroupsListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { groups, counts, loading, error, fetchGroups } = useGroupsStore();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchGroups();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchGroups]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const hasNoGroups = groups.length === 0;

  const cards = useMemo(
    () =>
      groups.map((group) => {
        const members = Array.isArray(group.members) ? group.members : [];
        const storedCount = counts?.[group.id];
        const apiCount = typeof group.counts?.members === 'number' ? group.counts.members : undefined;
        const memberCount =
          typeof storedCount === 'number'
            ? storedCount
            : typeof apiCount === 'number'
            ? apiCount
            : members.length;

        const groupName = group.name ?? t('groups.common.untitled', 'Group');
        const emptyMembersLabel = t('groups.list.members_zero', 'No members yet');
        const relativeTime = getRelativeTime((group as any).createdAt);

        return (
          <Card
            key={group.id}
            pressStyle={{ scale: 0.98 }}
            animation="quick"
            onPress={() =>
              router.push({
                pathname: '/tabs/groups/[groupId]',
                params: { groupId: String(group.id) },
              } as never)
            }
            bg="rgba(255, 255, 255, 0.04)"
            br={18}
            p="$4"
            bw={0.5}
            bc="rgba(255, 255, 255, 0.08)"
            gap="$2.5"
          >
            <XStack jc="space-between" ai="center">
              <Text fontSize={18} fontWeight="700" color="rgba(255,255,255,0.88)">
                {groupName}
              </Text>
              <View bg="rgba(0,188,140,0.18)" px="$2.5" py="$1" br={12}>
                <Text fontSize={12} fontWeight="600" color="#00d4a0" textTransform="uppercase" letterSpacing={0.5}>
                  {t('groups.list.settled', 'Settled')}
                </Text>
              </View>
            </XStack>

            <Text fontSize={13} color="rgba(255,255,255,0.4)" mt={-2}>
              {memberCount === 0 ? emptyMembersLabel : `${memberCount} members • ${relativeTime}`}
            </Text>

            <XStack ai="center" gap="$2.5" mt="$1">
              <Users size={16} color="rgba(255,255,255,0.4)" />
              <AvatarStack members={members} totalCount={memberCount} />
            </XStack>
          </Card>
        );
      }),
    [counts, groups, router, t]
  );

  return (
    <ScreenContainer>
      {/* Custom Header Row */}
      <XStack jc="space-between" ai="center" mb="$3">
        <Text fontSize={28} fontWeight="800" color="rgba(255,255,255,0.88)">
          {t('groups.title', 'Groups')}
        </Text>
        <Button
          onPress={() => router.push('/tabs/groups/create' as never)}
          w={42}
          h={42}
          br={21}
          bg="#7c4dff"
          pressStyle={{ bg: '#448aff', scale: 0.95 }}
          ai="center"
          jc="center"
          p={0}
          style={{
            shadowColor: '#7c4dff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <Plus size={24} color="white" />
        </Button>
      </XStack>

      {error && (
        <View bg="rgba(239, 83, 80, 0.15)" p="$3" br={12} mb="$3" borderWidth={0.5} borderColor="rgba(239, 83, 80, 0.3)">
          <Text color="#ef5350" fontSize={14}>
            {error}
          </Text>
        </View>
      )}

      {loading && hasNoGroups ? (
        <YStack f={1} ai="center" jc="center">
          <Spinner size="large" color="#7c4dff" />
        </YStack>
      ) : hasNoGroups ? (
        <YStack f={1} ai="center" jc="center" gap="$3">
          <Text color="rgba(255,255,255,0.4)" fontSize={15} textAlign="center">
            {t('groups.empty', 'No groups yet. Tap + to create.')}
          </Text>
        </YStack>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          f={1}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7c4dff"
              colors={["#7c4dff"]}
            />
          }
        >
          <YStack gap="$3" pb="$4">
            {cards}
          </YStack>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
