import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import {
  YStack, XStack, Paragraph, Separator, Button, Input, Spinner, Text
} from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Crown, Pencil, Trash2, Check, X as IconX, ChevronLeft, QrCode, BarChart3, Clock } from '@tamagui/lucide-icons';

import { useGroupsStore } from '@/features/groups/model/groups.store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';

const fmtUid = (uid?: string) => (uid ? `@${uid.toLowerCase().replace('user#', 'user')}` : '');

function computeIsOwner(
  current: { group?: { ownerId?: number }, role?: 'owner' | 'member' } | undefined,
  me?: { id?: number } | null
): boolean {
  if (!current) return false;
  if (current.role === 'owner') return true;
  if (typeof current.group?.ownerId === 'number' && typeof me?.id === 'number') {
    return current.group.ownerId === me.id;
  }
  return false;
}

export default function GroupDetailsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const gid = Number(groupId);
  const router = useRouter();
  const { t } = useTranslation();

  const { current, loading, error, openGroup, renameGroup, deleteGroup, addMember, removeMember } = useGroupsStore();
  const { friends, fetchAll: fetchFriends } = useFriendsStore();
  const me = useAppStore(s => s.user);

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [filter, setFilter] = useState('');
  const [opUid, setOpUid] = useState<string | null>(null);
  const [busyHdr, setBusyHdr] = useState<string | number | undefined>();

  useEffect(() => { if (gid) openGroup(gid); }, [gid, openGroup]);
  useEffect(() => { if (!friends?.length) fetchFriends(); }, [friends?.length, fetchFriends]);
  useEffect(() => {
    if (current?.group?.name) { setNewName(current.group.name!); setEditing(false); }
  }, [current?.group?.name]);

  const canManage = useMemo(() => computeIsOwner(current, me), [current, me]);
  const title = current?.group?.name ?? t('groupDetail.group', 'Group');
  const members = useMemo(() => current?.members ?? [], [current]);
  const ownerId = current?.group?.ownerId;

  const memberSetUpper = useMemo(
    () => new Set((members ?? []).map(m => (m?.uniqueId || '').toUpperCase())),
    [members]
  );

  const candidatesBase = useMemo(() => {
    return (friends ?? [])
      .map((f: any) => {
        const uid = f?.user?.uniqueId ?? f?.uniqueId ?? '';
        const label = f?.user?.displayName || f?.user?.username || f?.displayName || f?.username || uid;
        return { uniqueId: uid, username: label, displayName: f?.user?.displayName ?? f?.displayName };
      })
      .filter(u => !!u.uniqueId && !memberSetUpper.has(u.uniqueId.toUpperCase()));
  }, [friends, memberSetUpper]);

  const candidates = useMemo(() => {
    const q = filter.toLowerCase();
    return candidatesBase.filter(u => {
      const name = (u.displayName || u.username || u.uniqueId || '').toLowerCase();
      const uid = (u.uniqueId || '').toLowerCase();
      return !filter || name.includes(q) || uid.includes(q);
    });
  }, [candidatesBase, filter]);

  async function onRenameConfirm() {
    if (!gid || !newName.trim() || newName.trim() === title) { setEditing(false); return; }
    setBusyHdr('rename');
    try { await renameGroup(gid, newName.trim()); await openGroup(gid); }
    finally { setBusyHdr(undefined); setEditing(false); }
  }

  function onDeleteAsk() {
    Alert.alert(
      t('groupDetail.deleteGroup'),
      t('groupDetail.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (!gid) return;
            setBusyHdr('delete');
            try { await deleteGroup(gid); router.replace('/tabs/groups' as never); }
            finally { setBusyHdr(undefined); }
          },
        },
      ],
      { cancelable: true }
    );
  }

  async function onAdd(uid: string) {
    if (!gid) return;
    setOpUid(uid);
    try { await addMember(gid, uid); await openGroup(gid); }
    finally { setOpUid(null); }
  }

  async function onRemove(uid: string) {
    if (!gid) return;
    setOpUid(uid);
    try { await removeMember(gid, uid); await openGroup(gid); }
    finally { setOpUid(null); }
  }

  const openGroupQR = () => {
    if (!groupId) return;
    router.push({ pathname: '/tabs/groups/invite', params: { groupId } });
  };

  const openAnalytics = () => {
    if (!groupId) return;
    router.push({ pathname: '/tabs/groups/analytics', params: { groupId } });
  };

  const openActivity = () => {
    if (!groupId) return;
    router.push({ pathname: '/tabs/groups/activity', params: { groupId } });
  };

  if (loading && !current) return <YStack style={{ flex: 1, alignItems: 'center', justifyContent: 'center' } as any}><Spinner /></YStack>;
  if (error) return <YStack style={{ flex: 1, padding: 16 } as any}><Paragraph style={{ color: '$red10' } as any}>{error}</Paragraph></YStack>;
  if (!current) return <YStack style={{ flex: 1, padding: 16 } as any}><Paragraph>{t('groupDetail.noGroup')}</Paragraph></YStack>;

  return (
    <ScreenContainer paddingHorizontal={0}>
      <YStack style={{ flex: 1, paddingHorizontal: 16, gap: 12 } as any}>
        {/* Back (text-only) with chevron) */}
      <XStack>
        <Button
          onPress={() => router.replace('/tabs/groups' as never)}
          size="$2"
          style={{ height: 22, paddingHorizontal: 0, backgroundColor: 'transparent' } as any}
          unstyled
          chromeless
          borderWidth={0}
          color="$gray12"
          pressStyle={{ opacity: 0.6 }}
          icon={<ChevronLeft size={18} color="$gray12" />}
        >
          {t('groupDetail.backToGroups')}
        </Button>
      </XStack>

      {/* Title row: title + inline actions */}
      <XStack style={{ alignItems: 'center', gap: 8 } as any}>
        <XStack style={{ flex: 1, alignItems: 'center', gap: 8, minHeight: 22 } as any}>
          {!editing ? (
            <Text numberOfLines={1} fontSize={14} fontWeight="400">
              {title}
            </Text>
          ) : (
            <Input
              value={newName}
              onChangeText={setNewName}
              autoFocus
              style={{ flex: 1, height: 38, paddingHorizontal: 10, backgroundColor: '$backgroundPress' } as any}
              borderRadius={8}
              fontSize={14}
              color="$gray12"
              placeholderTextColor="$gray10"
              borderWidth={0}
              returnKeyType="done"
              onSubmitEditing={onRenameConfirm}
            />
          )}
        </XStack>

        {canManage && !editing && (
          <XStack style={{ alignItems: 'center', gap: 4 } as any}>
            <Button
              chromeless
              circular
              size="$2"
              aria-label="Rename"
              icon={<Pencil size={18} color="$gray12" />}
              onPress={() => setEditing(true)}
            />
            <Button
              chromeless
              circular
              size="$2"
              aria-label="Delete group"
              icon={<Trash2 size={18} color="$red10" />}
              onPress={onDeleteAsk}
              disabled={busyHdr === 'delete'}
            />
          </XStack>
        )}

        {canManage && editing && (
          <XStack style={{ alignItems: 'center', gap: 4 } as any}>
            <Button
              chromeless
              circular
              size="$2"
              aria-label="Confirm rename"
              icon={<Check size={18} color="$green10" />}
              onPress={onRenameConfirm}
              disabled={busyHdr === 'rename'}
            />
            <Button
              chromeless
              circular
              size="$2"
              aria-label="Cancel rename"
              icon={<IconX size={18} color="$gray11" />}
              onPress={() => { setNewName(title); setEditing(false); }}
            />
          </XStack>
        )}
      </XStack>

      {/* ACTIONS: QR, Analytics, Activity */}
      {canManage && (
        <>
          <XStack style={{ justifyContent: 'flex-end', alignItems: 'center', paddingVertical: 8, gap: 8, flexWrap: 'wrap' } as any}>
            <Button
              onPress={openAnalytics}
              theme="dark"
              backgroundColor="rgba(255,255,255,0.07)"
              color="white"
              size="$3"
              borderRadius="$3"
              icon={<BarChart3 size={18} color="#8A2BE2" />}
            >
              {t('groupDetail.statistics')}
            </Button>
            <Button
              onPress={openActivity}
              theme="dark"
              backgroundColor="rgba(255,255,255,0.07)"
              color="white"
              size="$3"
              borderRadius="$3"
              icon={<Clock size={18} color="#8A2BE2" />}
            >
              {t('groupDetail.history')}
            </Button>
            <Button
              onPress={openGroupQR}
              theme="dark"
              backgroundColor="rgba(255,255,255,0.07)"
              color="white"
              size="$3"
              borderRadius="$3"
              icon={<QrCode size={18} />}
            >
              QR
            </Button>
          </XStack>
          <Separator />
        </>
      )}

      {/* MEMBERS */}
      <Paragraph style={{ fontWeight: '700', fontSize: 18 } as any}>{t('groupDetail.members')}</Paragraph>
      {members.length === 0 ? (
        <Paragraph style={{ color: '$gray10' } as any}>{t('groupDetail.noMembers')}</Paragraph>
      ) : (
        <YStack borderWidth={1} borderColor="$gray5" borderRadius={8} overflow="hidden">
          {members.map((m, idx) => {
            const uid = m.uniqueId;
            const label = m.displayName || m.username || uid;
            const avatarUrl = m.avatarUrl ?? m.user?.avatarUrl ?? null;
            const isOwnerMember =
              m.role === 'owner' ||
              (typeof m.id === 'number' && typeof ownerId === 'number' && ownerId === m.id);
            const busy = opUid === uid;

            return (
              <React.Fragment key={uid ?? `${label}-${idx}`}>
                <XStack style={{ height: 60, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)' } as any}>
                  <XStack style={{ alignItems: 'center', gap: 12 } as any}>
                    <UserAvatar uri={avatarUrl ?? undefined} label={(label || "U").slice(0, 1).toUpperCase()} size={36} textSize={14} backgroundColor="$gray5" />
                    <YStack>
                      <Text fontSize={17} fontWeight="600">{label}</Text>
                      {!!uid && <Paragraph fontSize={14} color="$gray10">{fmtUid(uid)}</Paragraph>}
                    </YStack>
                  </XStack>

                  <XStack style={{ alignItems: 'center', gap: 8 } as any}>
                    {isOwnerMember && <Crown size={18} color="$yellow10" />}
                    {canManage && !isOwnerMember && (
                      <Button size="$2" theme="dark" backgroundColor="rgba(239,83,80,0.15)" color="#ef5350" onPress={() => uid && onRemove(uid)} disabled={!uid || busy}>
                        {busy ? '...' : t('groupDetail.remove')}
                      </Button>
                    )}
                  </XStack>
                </XStack>
                {idx < (members.length - 1) && <Separator />}
              </React.Fragment>
            );
          })}
        </YStack>
      )}

      <Separator />

      {/* ADD FROM FRIENDS */}
      <Paragraph style={{ fontWeight: '700', fontSize: 18 } as any}>{t('groupDetail.addFromFriends')}</Paragraph>
      <Input
        value={filter}
        onChangeText={setFilter}
        placeholder={t('groupDetail.searchFriends')}
        style={{ height: 41, paddingHorizontal: 16, backgroundColor: '$backgroundPress' } as any}
        borderRadius={10}
        fontSize={14}
        fontWeight="500"
        color="$gray12"
        placeholderTextColor="$gray10"
        borderWidth={0}
        returnKeyType="search"
      />

      {(candidates ?? []).length === 0 ? (
        <Paragraph style={{ color: '$gray10', marginTop: 8 } as any}>{t('groupDetail.noFriendsToAdd')}</Paragraph>
      ) : (
        <YStack borderWidth={1} borderColor="$gray5" borderRadius={8} overflow="hidden" style={{ marginTop: 8 } as any}>
          {candidates.map((u, idx) => {
            const uid = u.uniqueId;
            const label = u.displayName || u.username || uid;
            const uAny = u as any;
            const avatarUrl = uAny.avatarUrl ?? uAny.user?.avatarUrl ?? null;
            const busy = opUid === uid;

            return (
              <React.Fragment key={uid ?? `${label}-${idx}`}>
                <XStack style={{ height: 60, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 } as any}>
                  <XStack style={{ alignItems: 'center', gap: 12 } as any}>
                    <UserAvatar uri={avatarUrl ?? undefined} label={(label || "U").slice(0, 1).toUpperCase()} size={36} textSize={14} backgroundColor="$gray5" />
                    <YStack>
                      <Text fontSize={17} fontWeight="600">{label}</Text>
                      {!!uid && <Paragraph fontSize={14} color="$gray10">{fmtUid(uid)}</Paragraph>}
                    </YStack>
                  </XStack>

                  {canManage && (
                    <Button size="$2" onPress={() => uid && onAdd(uid)} disabled={!uid || busy}>
                      {busy ? '...' : t('groupDetail.add')}
                    </Button>
                  )}
                </XStack>
                {idx < (candidates.length - 1) && <Separator />}
              </React.Fragment>
            );
          })}
        </YStack>
      )}
      </YStack>
    </ScreenContainer>
  );
}
