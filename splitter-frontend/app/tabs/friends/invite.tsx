import React, { useEffect, useState } from 'react';
import { YStack, XStack, Button, Paragraph, Spinner, Text, View } from 'tamagui';
import { QrCode, ChevronLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { InviteQR } from '@/shared/ui/InviteQR';
import { FriendsApi } from '@/features/friends/api/friends.api';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';

type InviteDTO = { url: string; expiresAt: string };

export default function FriendInviteScreen() {
  const [data, setData] = useState<InviteDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const goBack = () => router.replace('/tabs/friends/requests' as never);

  async function refresh() {
    setLoading(true);
    try {
      const resp = await FriendsApi.createInvite(300);
      setData({ url: resp.url, expiresAt: resp.expiresAt });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <ScreenContainer paddingHorizontal={0}>
      <YStack f={1} gap="$4" bg="transparent">
        {/* Header with back button */}
        <XStack height={50} alignItems="center" justifyContent="space-between" px="$4" mb="$2">
          <Button
            onPress={goBack}
            circular
            size="$3.5"
            bg="rgba(255,255,255,0.06)"
            pressStyle={{ bg: 'rgba(255,255,255,0.15)', scale: 0.95 }}
            borderWidth={0}
            icon={<ChevronLeft color="rgba(255, 255, 255, 0.88)" size={22} />}
          />
          <Text fontSize={18} fontWeight="700" color="rgba(255,255,255,0.88)">
            {t('friends.invite.title', 'My Friend QR')}
          </Text>
          <View width={42} />
        </XStack>

        {/* Body */}
        <YStack f={1} ai="center" jc="center" gap="$4" px="$4">
          {loading && !data ? (
            <Spinner color="#7c4dff" />
          ) : data ? (
            <>
              <InviteQR
                url={data.url}
                title={t('friends.invite.description', 'Show this QR to your friend')}
                expiresAt={data.expiresAt}
              />
              <Button
                onPress={refresh}
                size="$4"
                borderRadius={12}
                bg="#7c4dff"
                pressStyle={{ bg: '#5e35b1', scale: 0.96 }}
                borderWidth={0}
                px="$6"
                mt="$3"
              >
                <Text color="white" fontWeight="600" fontSize={14}>
                  {t('friends.invite.new', 'New QR')}
                </Text>
              </Button>
            </>
          ) : (
            <>
              <Paragraph color="rgba(255,255,255,0.55)">{t('friends.invite.error', 'Failed to get invite')}</Paragraph>
              <Button
                onPress={refresh}
                borderRadius={12}
                bg="#7c4dff"
                pressStyle={{ bg: '#5e35b1', scale: 0.96 }}
                borderWidth={0}
                px="$5"
              >
                <Text color="white" fontWeight="600">
                  {t('common.retry', 'Retry')}
                </Text>
              </Button>
            </>
          )}
        </YStack>
      </YStack>
    </ScreenContainer>
  );
}

