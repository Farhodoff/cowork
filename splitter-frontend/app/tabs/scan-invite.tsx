// app/tabs/scan-invite.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Button, Paragraph, View, Text } from 'tamagui';
import { ChevronLeft } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseInviteFromScan } from '@/shared/lib/utils/invite';
import { FriendsApi } from '@/features/friends/api/friends.api';
import { GroupsApi } from '@/features/groups/api/groups.api';

type FromParam = 'friends-requests' | 'groups-index' | undefined;

interface UserData {
  avatar?: string;
  name: string;
  username: string;
  bio?: string;
}

export default function ScanInviteScreen() {
  const [perm, requestPerm] = useCameraPermissions();
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [userData, setUserData] = useState<UserData | null>(null);
  const lock = useRef(false);
  const isFocused = useIsFocused();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: FromParam }>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Анимации для модалки
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isFocused && !perm?.granted) requestPerm();
    if (!isFocused) {
      setStatus('idle');
      lock.current = false;
    }
  }, [isFocused, perm?.granted, requestPerm]);

  useEffect(() => {
    if (status === 'ok') {
      // Запускаем анимацию появления
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [status, fadeAnim, scaleAnim]);

  const goBack = () => {
    if (from === 'friends-requests') router.replace('/tabs/friends/requests' as never);
    else if (from === 'groups-index') router.replace('/tabs/groups' as never);
    else router.back();
  };

  async function redeem(data: string) {
    try {
      const parsed = parseInviteFromScan(data);
      if (!parsed) throw new Error('not-our-qr');

      setStatus('loading');
      
      let response;
      if (parsed.kind === 'friend') {
        response = await FriendsApi.joinByToken(parsed.token);
      } else {
        response = await GroupsApi.joinByToken(parsed.token);
      }

      // Извлекаем данные пользователя из ответа API
      // Адаптируйте под структуру вашего API
      if (response?.data) {
        setUserData({
          avatar: response.data.avatar || response.data.photo,
          name: response.data.name || response.data.fullName,
          username: response.data.username || `@${response.data.login}`,
          bio: response.data.bio || `${response.data.name} endi sizning do'stingiz!`
        });
      }

      setStatus('ok');
      setTimeout(goBack, 3000); // 3 секунды показываем успех
    } catch {
      setStatus('error');
      setTimeout(() => {
        setStatus('idle');
        lock.current = false;
      }, 900);
    }
  }

  return (
    <YStack flex={1} backgroundColor="#000">
      {/* Header */}
      <YStack position="absolute" top={0} left={0} right={0} zIndex={10} pt={insets.top > 0 ? insets.top : 8} backgroundColor="rgba(0,0,0,0.4)">
        <XStack height={50} alignItems="center" justifyContent="space-between" px="$4">
          <Button
            onPress={goBack}
            circular
            size="$3.5"
            bg="rgba(0,0,0,0.5)"
            pressStyle={{ bg: 'rgba(0,0,0,0.7)', scale: 0.95 }}
            borderWidth={0}
            icon={<ChevronLeft color="white" size={22} />}
          />
          <Text fontSize={18} fontWeight="700" color="white">
            {t('scanInviteScreen.title', 'Scan invite')}
          </Text>
          <View width={42} />
        </XStack>
      </YStack>

      {/* Camera */}
      <YStack flex={1} backgroundColor="#000">
        {isFocused && perm?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] as const }}
            onBarcodeScanned={(res) => {
              if (lock.current || status === 'loading') return;
              lock.current = true;
              redeem(res.data);
            }}
          />
        ) : (
          <YStack f={1} ai="center" jc="center">
            <Paragraph col="$gray1">{t('scanInviteScreen.allowCamera', 'Allow camera access')}</Paragraph>
          </YStack>
        )}
      </YStack>

      {/* Loading */}
      {status === 'loading' && (
        <YStack position="absolute" bottom={40} alignSelf="center" backgroundColor="rgba(0,0,0,0.85)" px={16} py={10} br={12}>
          <YStack ai="center" gap="$2">
            <ActivityIndicator color="white" />
            <Paragraph col="white">{t('scanInviteScreen.connecting', 'Connecting…')}</Paragraph>
          </YStack>
        </YStack>
      )}

      {/* Error */}
      {status === 'error' && (
        <YStack position="absolute" bottom={40} alignSelf="center" backgroundColor="rgba(0,0,0,0.85)" px={16} py={10} br={12}>
          <Paragraph col="white">{t('scanInviteScreen.error', 'Error 😕')}</Paragraph>
        </YStack>
      )}

      {/* Success Modal */}
      <Modal
        visible={status === 'ok'}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.6)" jc="center" ai="center" px={16}>
          <Animated.View
            style={{
              width: 358,
              backgroundColor: '#0a0a0f',
              borderRadius: 28,
              borderWidth: 1,
              borderColor: 'rgba(46, 204, 113, 0.3)',
              paddingVertical: 24,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              shadowColor: '#2ECC71',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Checkmark */}
            <View
              position="absolute"
              top={-12}
              right={-12}
              w={40}
              h={40}
              br={20}
              backgroundColor="#2ECC71"
              ai="center"
              jc="center"
              zIndex={1}
            >
              <Paragraph fos={24} fow="bold" col="white">✓</Paragraph>
            </View>

            {/* Avatar */}
            <YStack ai="center" pt={16} pb={12}>
              {userData?.avatar ? (
                <Image
                  source={{ uri: userData.avatar }}
                  style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#2ECC71' }}
                  contentFit="cover"
                />
              ) : (
                <View w={64} h={64} br={32} backgroundColor="rgba(255,255,255,0.04)" ai="center" jc="center" borderWidth={2} borderColor="#2ECC71">
                  <Paragraph fos={32} col="$gray8">
                    {userData?.name?.[0]?.toUpperCase() || '?'}
                  </Paragraph>
                </View>
              )}
            </YStack>

            {/* User info */}
            <YStack ai="center" px="$4" pt="$2" gap="$1">
              <Paragraph fos={20} fow="700" col="white" ta="center">
                {userData?.name || 'User'}
              </Paragraph>
              <Paragraph fos={14} col="rgba(255,255,255,0.45)" ta="center">
                {userData?.username || '@user'}
              </Paragraph>
            </YStack>

            {/* Bio */}
            {userData?.bio && (
              <YStack px="$6" pt="$4">
                <Paragraph fos={14} col="rgba(255,255,255,0.45)" ta="center" lh={20}>
                  {userData.bio}
                </Paragraph>
              </YStack>
            )}

            <View h={24} />
          </Animated.View>
        </YStack>
      </Modal>
    </YStack>
  );
}