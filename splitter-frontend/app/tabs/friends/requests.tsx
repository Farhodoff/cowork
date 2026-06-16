import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  YStack,
  XStack,
  Paragraph,
  Separator,
  Button,
  Spinner,
  Input,
  Text,
  ScrollView,
  View,
} from 'tamagui';
import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { CircleCheck, CircleX, QrCode, Scan, ChevronLeft, Search, Users } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFriendsStore } from '@/features/friends/model/friends.store';
import UserAvatar from '@/shared/ui/UserAvatar';
import { FriendsApi } from '@/features/friends/api/friends.api';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import GlassCard from '@/components/ui/GlassCard';

const ROW_H = 60;
const TAB_W = 171;
const TAB_H = 37;

const TINT_REJECT = '#E74C3C1A';
const TINT_ACCEPT = '#2ECC711A';

function useAutoNotice() {
  const [text, setText] = useState<string | undefined>();
  const [kind, setKind] = useState<'success' | 'error' | undefined>();

  useEffect(() => {
    if (!text) return;
    const timeout = setTimeout(() => {
      setText(undefined);
      setKind(undefined);
    }, 2200);
    return () => clearTimeout(timeout);
  }, [text]);

  return {
    ok: (message: string) => {
      setKind('success');
      setText(message);
    },
    err: (message: string) => {
      setKind('error');
      setText(message);
    },
    node: text ? (
      <Paragraph style={{ color: kind === 'error' ? '#ef5350' : '#00bc8c' } as any}>{text}</Paragraph>
    ) : null,
  };
}

function IconPill({
  onPress,
  disabled,
  tint,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      chromeless
      circular
      onPress={onPress}
      disabled={disabled}
      pressStyle={{ opacity: 0.8, scale: 0.9 }}
      hitSlop={10}
      style={{
        width: 34,
        height: 34,
        padding: 0,
        backgroundColor: tint,
        alignItems: 'center',
        justifyContent: 'center',
      } as any}
    >
      {children}
    </Button>
  );
}

type UserLite = { uniqueId?: string; username?: string; displayName?: string; id?: number };

interface UserRowProps {
  title: string;
  uid?: string;
  right?: React.ReactNode;
  index: number;
  total: number;
  avatarUrl?: string;
}

function UserRow({ title, uid, right, index, total, avatarUrl }: UserRowProps) {
  const isLast = index === total - 1;
  const avatarLabel = (title || 'U').slice(0, 1).toUpperCase() || 'U';

  return (
    <XStack
      style={{
        width: '100%',
        height: ROW_H,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
      } as any}
    >
      <XStack style={{ alignItems: 'center', gap: 12 } as any}>
        <UserAvatar
          uri={avatarUrl ?? undefined}
          label={avatarLabel}
          size={36}
          textSize={14}
          backgroundColor="rgba(255, 255, 255, 0.08)"
        />
        <YStack>
          <Text fontSize={15} fontWeight="600" color="rgba(255,255,255,0.88)">
            {title}
          </Text>
          {!!uid && (
            <Paragraph fontSize={12} color="rgba(255,255,255,0.4)">
              {uid}
            </Paragraph>
          )}
        </YStack>
      </XStack>
      {right}
    </XStack>
  );
}

export default function FriendsRequestsUnified() {
  const router = useRouter();
  const notice = useAutoNotice();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { requestsRaw, fetchAll, loading, error, search, send, friends } = useFriendsStore();
  const meUniqueId = useAppStore((s) => s.user?.uniqueId);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<'outgoing' | 'incoming'>('incoming');

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const incoming = useMemo(() => requestsRaw?.incoming ?? [], [requestsRaw]);
  const outgoing = useMemo(() => requestsRaw?.outgoing ?? [], [requestsRaw]);

  const friendsSet = useMemo(() => {
    const set = new Set<string>();
    (friends ?? []).forEach((friend: any) => {
      const uid = friend?.user?.uniqueId ?? friend?.uniqueId;
      if (uid) set.add(uid);
    });
    return set;
  }, [friends]);

  const outgoingSet = useMemo(() => {
    const set = new Set<string>();
    (outgoing ?? []).forEach((request: any) => {
      const uid = request?.to?.uniqueId ?? request?.toUniqueId ?? request?.uniqueId;
      if (uid) set.add(uid);
    });
    return set;
  }, [outgoing]);

  const incomingSet = useMemo(() => {
    const set = new Set<string>();
    (incoming ?? []).forEach((request: any) => {
      const uid = request?.from?.uniqueId ?? request?.fromUniqueId ?? request?.uniqueId;
      if (uid) set.add(uid);
    });
    return set;
  }, [incoming]);

  const statusLabels = useMemo(
    () => ({
      add: t('friends.status.add', 'Add'),
      you: t('friends.status.you', 'You'),
      friend: t('friends.status.friend', 'Friend'),
      requested: t('friends.status.requested', 'Requested'),
      incoming: t('friends.status.incoming', 'Incoming'),
    }),
    [t]
  );

  const unknownUser = t('friends.common.unknownUser', 'Unknown user');

  const wrap = useCallback(
    async (fn: () => Promise<any>, id: number, successMessage: string) => {
      setBusyId(id);
      try {
        await fn();
        notice.ok(successMessage);
        await fetchAll();
      } catch (error: any) {
        notice.err(error?.message || t('friends.common.error', 'Something went wrong'));
      } finally {
        setBusyId(null);
      }
    },
    [fetchAll, notice, t]
  );

  const accept = (fromId: number, name?: string, uid?: string) => {
    const target = name ?? uid ?? unknownUser;
    return wrap(
      () => FriendsApi.accept(meUniqueId!, fromId),
      fromId,
      t('friends.requests.accepted', { target })
    );
  };

  const reject = (fromId: number, name?: string, uid?: string) => {
    const target = name ?? uid ?? unknownUser;
    return wrap(
      () => FriendsApi.reject(meUniqueId!, fromId),
      fromId,
      t('friends.requests.rejected', { target })
    );
  };

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const response = await search(query.trim());
      setResults(response || []);
      if (!response || response.length === 0) {
        notice.ok(t('friends.search.noResults', 'No results found'));
      }
    } catch (error: any) {
      notice.err(error?.message ?? t('friends.search.error', 'Search failed'));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function sendInvite(uniqueId?: string, label?: string) {
    if (!uniqueId) return;
    setSendingId(uniqueId);
    try {
      await send(uniqueId);
      const target = label ?? uniqueId ?? unknownUser;
      notice.ok(t('friends.search.inviteSent', { target }));
    } catch (error: any) {
      notice.err(error?.message ?? t('friends.search.inviteFailed', 'Could not send invite'));
    } finally {
      setSendingId(null);
    }
  }

  const onSubmitSearch = () => {
    if (!searching) doSearch();
  };

  const tabLabels = useMemo(
    () => ({
      outgoing: t('friends.requests.tabOutgoing', 'Outgoing'),
      incoming: t('friends.requests.tabIncoming', 'Incoming'),
    }),
    [t]
  );

  return (
    <ScreenContainer paddingHorizontal={0}>
      <XStack height={50} alignItems="center" justifyContent="space-between" px="$4" mb="$2">
        <Button
          onPress={() => router.replace('/tabs/friends' as never)}
          circular
          size="$3.5"
          bg="rgba(255,255,255,0.06)"
          pressStyle={{ bg: 'rgba(255,255,255,0.15)', scale: 0.95 }}
          borderWidth={0}
          icon={<ChevronLeft color="rgba(255, 255, 255, 0.88)" size={22} />}
        />
        <Text fontSize={18} fontWeight="700" color="rgba(255,255,255,0.88)">
          {t('friends.requests.title', 'Friend Requests')}
        </Text>
        <View width={42} />
      </XStack>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c4dff"
            colors={["#7c4dff"]}
          />
        }
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack gap="$4" style={{ flex: 1 } as any}>
          {notice.node}
          {error && <Paragraph style={{ color: '#ef5350' } as any}>{error}</Paragraph>}

          {/* Quick Actions Card */}
          <GlassCard radius={18} padding={16} style={{ width: '100%', maxWidth: 400, alignSelf: 'center' } as any}>
            <XStack justifyContent="space-between" gap="$3">
              <Button
                onPress={() =>
                  router.push({ pathname: '/tabs/scan-invite', params: { from: 'friends-requests' } } as never)
                }
                flex={1}
                height={44}
                borderRadius={12}
                bg="#7c4dff"
                pressStyle={{ bg: '#5e35b1', scale: 0.96 }}
                borderWidth={0}
                icon={<Scan size={18} color="white" />}
              >
                <Text color="white" fontSize={14} fontWeight="600">
                  {t('friends.requests.scanInvite', 'Scan invite')}
                </Text>
              </Button>
              <Button
                onPress={() => router.push('/tabs/friends/invite' as never)}
                flex={1}
                height={44}
                borderRadius={12}
                bg="rgba(255,255,255,0.06)"
                pressStyle={{ bg: 'rgba(255,255,255,0.15)', scale: 0.96 }}
                borderWidth={0.5}
                borderColor="rgba(255,255,255,0.15)"
                icon={<QrCode size={18} color="rgba(255, 255, 255, 0.88)" />}
              >
                <Text color="rgba(255, 255, 255, 0.88)" fontSize={14} fontWeight="600">
                  {t('friends.requests.showMyQr', 'My QR Code')}
                </Text>
              </Button>
            </XStack>
          </GlassCard>

          {/* Search Input Box */}
          <View alignSelf="center" style={{ width: '100%', maxWidth: 400, position: 'relative', justifyContent: 'center' } as any}>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={t('friends.search.placeholder', 'Search by unique ID, e.g. USER#1234')}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={onSubmitSearch}
              borderRadius={12}
              fontSize={14}
              fontWeight="500"
              borderWidth={0.5}
              borderColor="rgba(255,255,255,0.08)"
              color="rgba(255,255,255,0.88)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              bg="rgba(255,255,255,0.04)"
              h={44}
              pl={42}
              pr={16}
              focusStyle={{
                borderColor: 'rgba(124, 77, 255, 0.5)',
                bg: 'rgba(255,255,255,0.06)'
              }}
            />
            <Search
              size={18}
              color="rgba(255,255,255,0.35)"
              position="absolute"
              left={14}
              pointerEvents="none"
            />
          </View>

          {/* Search results */}
          {searching ? (
            <Spinner color="#7c4dff" />
          ) : results.length > 0 ? (
            <View style={{ borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 400, alignSelf: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' } as any}>
              {results.map((user, index) => {
                const uid = user.uniqueId;
                const avatarUrl = (user as any)?.avatarUrl ?? (user as any)?.user?.avatarUrl ?? undefined;
                const fallbackTitle = user.displayName || user.username || uid;
                const title = fallbackTitle || unknownUser;

                const isMe = !!uid && !!meUniqueId && uid === meUniqueId;
                const isFriend = !!uid && friendsSet.has(uid);
                const isOutgoing = !!uid && outgoingSet.has(uid);
                const isIncoming = !!uid && incomingSet.has(uid);

                let label = statusLabels.add;
                let disabled = false;
                if (isMe) {
                  label = statusLabels.you;
                  disabled = true;
                } else if (isFriend) {
                  label = statusLabels.friend;
                  disabled = true;
                } else if (isOutgoing) {
                  label = statusLabels.requested;
                  disabled = true;
                } else if (isIncoming) {
                  label = statusLabels.incoming;
                  disabled = true;
                }

                const isBusy = sendingId === uid;

                return (
                  <UserRow
                    key={`${uid ?? 'u'}-${index}`}
                    index={index}
                    total={results.length}
                    title={title}
                    uid={uid}
                    avatarUrl={avatarUrl}
                    right={
                      <Button
                        size="$2"
                        borderRadius={10}
                        borderWidth={0}
                        bg={disabled ? "rgba(255,255,255,0.04)" : "#7c4dff"}
                        pressStyle={{ bg: '#5e35b1', scale: 0.96 }}
                        style={{ height: 32, paddingHorizontal: 12 } as any}
                        onPress={() => sendInvite(uid, title)}
                        disabled={!uid || disabled || isBusy}
                      >
                        <Text color={disabled ? "rgba(255,255,255,0.3)" : "white"} fontSize={12} fontWeight="600">
                          {isBusy ? '...' : label}
                        </Text>
                      </Button>
                    }
                  />
                );
              })}
            </View>
          ) : (
            <Paragraph fontSize={12} color="rgba(255,255,255,0.3)" textAlign="center" mt="$-2" mb="$2">
              {t('friends.search.hint', 'Search by unique ID to find someone')}
            </Paragraph>
          )}

          {/* Premium Segmented Tab Control */}
          <View
            alignSelf="center"
            w="100%"
            maxWidth={400}
            h={44}
            br={14}
            bg="rgba(255, 255, 255, 0.04)"
            p={3}
            flexDirection="row"
            mb="$1"
            borderWidth={0.5}
            borderColor="rgba(255, 255, 255, 0.06)"
          >
            <Button
              flex={1}
              h="100%"
              br={11}
              bg={tab === 'incoming' ? '#7c4dff' : 'transparent'}
              pressStyle={{ scale: 0.97 }}
              onPress={() => setTab('incoming')}
              unstyled
              ai="center"
              jc="center"
            >
              <Text
                fontSize={13}
                fontWeight="700"
                color={tab === 'incoming' ? 'white' : 'rgba(255,255,255,0.45)'}
              >
                {tabLabels.incoming}
              </Text>
            </Button>
            <Button
              flex={1}
              h="100%"
              br={11}
              bg={tab === 'outgoing' ? '#7c4dff' : 'transparent'}
              pressStyle={{ scale: 0.97 }}
              onPress={() => setTab('outgoing')}
              unstyled
              ai="center"
              jc="center"
            >
              <Text
                fontSize={13}
                fontWeight="700"
                color={tab === 'outgoing' ? 'white' : 'rgba(255,255,255,0.45)'}
              >
                {tabLabels.outgoing}
              </Text>
            </Button>
          </View>

          {/* Lists */}
          {tab === 'incoming' ? (
            incoming.length === 0 ? (
              <GlassCard radius={18} padding={24} style={{ width: '100%', maxWidth: 400, alignSelf: 'center', alignItems: 'center', gap: 10 } as any}>
                <Users size={32} color="rgba(255,255,255,0.2)" />
                <Paragraph fontSize={14} color="rgba(255,255,255,0.4)" textAlign="center">
                  {t('friends.requests.emptyIncoming', 'No incoming requests yet')}
                </Paragraph>
              </GlassCard>
            ) : (
              <View style={{ borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 400, alignSelf: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' } as any}>
                {incoming.map((request: any, index: number) => {
                  const name =
                    request.from?.displayName ||
                    request.from?.username ||
                    (request.from?.id ? `User #${request.from.id}` : undefined) ||
                    unknownUser;
                  const uid = request.from?.uniqueId;
                  const fromId = request.from?.id as number;
                  const avatarUrl = request.from?.avatarUrl ?? null;
                  const isBusy = busyId === fromId;

                  return (
                    <UserRow
                      key={`in-${fromId}-${index}`}
                      index={index}
                      total={incoming.length}
                      title={name}
                      uid={uid}
                      avatarUrl={avatarUrl ?? undefined}
                      right={
                        <XStack gap={10}>
                          <IconPill
                            tint={TINT_REJECT}
                            onPress={() => reject(fromId, name, uid)}
                            disabled={isBusy}
                          >
                            <CircleX size={18} color="#E74C3C" />
                          </IconPill>
                          <IconPill
                            tint={TINT_ACCEPT}
                            onPress={() => accept(fromId, name, uid)}
                            disabled={isBusy}
                          >
                            <CircleCheck size={18} color="#2ECC71" />
                          </IconPill>
                        </XStack>
                      }
                    />
                  );
                })}
              </View>
            )
          ) : (
            outgoing.length === 0 ? (
              <GlassCard radius={18} padding={24} style={{ width: '100%', maxWidth: 400, alignSelf: 'center', alignItems: 'center', gap: 10 } as any}>
                <Users size={32} color="rgba(255,255,255,0.2)" />
                <Paragraph fontSize={14} color="rgba(255,255,255,0.4)" textAlign="center">
                  {t('friends.requests.emptyOutgoing', 'No outgoing requests yet')}
                </Paragraph>
              </GlassCard>
            ) : (
              <View style={{ borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 400, alignSelf: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' } as any}>
                {outgoing.map((request: any, index: number) => {
                  const name =
                    request.to?.displayName ||
                    request.to?.username ||
                    request.to?.uniqueId ||
                    unknownUser;
                  const uid = request.to?.uniqueId;
                  const avatarUrl = request.to?.avatarUrl ?? null;

                  return (
                    <UserRow
                      key={`out-${uid ?? index}`}
                      index={index}
                      total={outgoing.length}
                      title={name}
                      uid={uid}
                      avatarUrl={avatarUrl ?? undefined}
                      right={
                        <Text fontSize={13} fontWeight="600" color="rgba(255,255,255,0.3)">
                          {t('friends.requests.requestedLabel', 'Requested')}
                        </Text>
                      }
                    />
                  );
                })}
              </View>
            )
          )}
        </YStack>
      </ScrollView>
    </ScreenContainer>
  );
}
