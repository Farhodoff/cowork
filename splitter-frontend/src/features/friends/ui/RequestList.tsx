// src/features/friends/ui/RequestList.tsx

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  YStack, XStack, Paragraph, Separator, Card, Button, Spinner
} from 'tamagui';
import { useFriendsStore } from '../model/friends.store';
import { FriendsApi } from '../api/friends.api';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useTranslation } from 'react-i18next';

type Props = { type: 'incoming' | 'outgoing' };

export function RequestList({ type }: Props) {
  const { requestsRaw, fetchAll, loading, error } = useFriendsStore();
  const meUniqueId = useAppStore((s) => s.user?.uniqueId);
  const { t } = useTranslation();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const [noticeKind, setNoticeKind] = useState<'success' | 'error' | undefined>();

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => { setNotice(undefined); setNoticeKind(undefined); }, 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const arr = useMemo(
    () => (type === 'incoming' ? requestsRaw?.incoming : requestsRaw?.outgoing) ?? [],
    [requestsRaw, type]
  );

  const wrap = useCallback(
    async (fn: () => Promise<any>, id: number, okMsg: string) => {
      setBusyId(id);
      try {
        await fn();
        setNoticeKind('success');
        setNotice(okMsg);
      } catch (e: any) {
        setNoticeKind('error');
        setNotice(e?.message || t('friends.common.error', 'Something went wrong'));
      } finally {
        setBusyId(null);
        fetchAll();
      }
    },
    [fetchAll]
  );

  const accept = (requesterId: number, label?: string) =>
    wrap(() => FriendsApi.accept(meUniqueId!, requesterId), requesterId, t('friends.requests.acceptedLabel', { name: label ?? '' }));

  const reject = (requesterId: number, label?: string) =>
    wrap(() => FriendsApi.reject(meUniqueId!, requesterId), requesterId, t('friends.requests.rejectedLabel', { name: label ?? '' }));

  if (loading) {
    return (
      <YStack style={{ gap: 12, alignItems: 'center', paddingVertical: 16 } as any}>
        <Spinner />
        <Paragraph style={{ color: '$gray10' } as any}>{t('friends.loading', 'Loading...')}</Paragraph>
      </YStack>
    );
  }

  if (error) {
    return <Paragraph style={{ color: '$red10' } as any}>{error}</Paragraph>;
  }

  return (
    <YStack gap="$3">
      {notice && (
        <Paragraph style={{ color: noticeKind === 'error' ? '$red10' : '$green10' } as any}>
          {notice}
        </Paragraph>
      )}

      {arr.length === 0 ? (
        <YStack style={{ gap: 8, alignItems: 'center', paddingVertical: 16 } as any}>
          <Paragraph style={{ color: '$gray10' } as any}>
            {type === 'incoming' ? t('friends.requests.emptyIncoming', 'No incoming requests') : t('friends.requests.emptyOutgoing', 'No outgoing requests')}
          </Paragraph>
          <Separator />
        </YStack>
      ) : (
        arr.map((r: any, i: number) => {
          const side = type === 'incoming' ? r.from : r.to;
          const title = side?.username || side?.uniqueId || `User #${side?.id}`;
          const sub = side?.uniqueId ? side.uniqueId : undefined;
          const idNum = side?.id as number | undefined;
          const isBusy = !!idNum && busyId === idNum;

          return (
            <Card key={`${type}-${side?.uniqueId ?? side?.id ?? i}`} style={{ padding: 12, borderRadius: 8, backgroundColor: '$backgroundFocus' } as any}>
              <XStack style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 } as any}>
                <YStack>
                  <Paragraph style={{ fontWeight: '600' } as any}>{title}</Paragraph>
                  {!!sub && <Paragraph size="$2" style={{ color: '$gray10' } as any}>{sub}</Paragraph>}
                </YStack>

                {type === 'incoming' ? (
                  <XStack gap="$2">
                    <Button
                      size="$2"
                      onPress={() => idNum != null && accept(idNum, title)}
                      disabled={isBusy || idNum == null}
                    >
                      {isBusy ? '...' : t('friends.requests.accept', 'Accept')}
                    </Button>
                    <Button
                      size="$2"
                      theme="dark"
                      backgroundColor="rgba(239,83,80,0.15)"
                      color="#ef5350"
                      onPress={() => idNum != null && reject(idNum, title)}
                      disabled={isBusy || idNum == null}
                    >
                      {isBusy ? '...' : t('friends.requests.reject', 'Reject')}
                    </Button>
                  </XStack>
                ) : (
                  // Outgoing: no actions for now (spec doesn’t have cancel)
                  <Paragraph size="$2" style={{ color: '$gray10' } as any}>{t('friends.requests.requestedLabel', 'Requested')}</Paragraph>
                )}
              </XStack>
            </Card>
          );
        })
      )}
    </YStack>
  );
}
