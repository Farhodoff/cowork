import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { YStack, XStack, Button, Paragraph, Input, Text, Spinner, View } from 'tamagui';
import { ChevronLeft, AlertTriangle, Camera as CameraIcon, Image as ImageIcon } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useReceiptSessionStore,
  CapturedReceiptImage,
} from '@/features/receipt/model/receipt-session.store';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { DEFAULT_LANGUAGE } from '@/shared/config/languages';

const getDefaultSessionName = () => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `${date} ${time}`;
};

function guessMime(uri?: string): string {
  if (!uri) return 'image/jpeg';
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export default function ScanReceiptScreen() {
  const [perm, requestPerm] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const isFocused = useIsFocused();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraView | null>(null);

  const parsing = useReceiptSessionStore((s) => s.parsing);
  const parseReceipt = useReceiptSessionStore((s) => s.parseReceipt);
  const parseError = useReceiptSessionStore((s) => s.parseError);
  const setCapture = useReceiptSessionStore((s) => s.setCapture);
  const clearCapture = useReceiptSessionStore((s) => s.clearCapture);
  const storedCapture = useReceiptSessionStore((s) => s.capture);
  const setSessionNameStore = useReceiptSessionStore((s) => s.setSessionName);
  const storedSessionName = useReceiptSessionStore((s) => s.session?.sessionName);
  const appLanguage = useAppStore((s) => s.language);

  const [sessionName, setSessionName] = useState(() => storedSessionName || getDefaultSessionName());
  const [isAutoName, setIsAutoName] = useState(() => !storedSessionName);
  const [localError, setLocalError] = useState<string | null>(null);

  const language = appLanguage || DEFAULT_LANGUAGE;

  useEffect(() => {
    if (isFocused && !perm?.granted) requestPerm();
  }, [isFocused, perm?.granted, requestPerm]);

  useEffect(() => {
    if (storedSessionName) {
      setIsAutoName(false);
      setSessionName((prev) => (prev === storedSessionName ? prev : storedSessionName));
    } else {
      setIsAutoName(true);
    }
  }, [storedSessionName]);

  useFocusEffect(
    useCallback(() => {
      if (storedSessionName) return;
      if (!isAutoName) return;
      const freshName = getDefaultSessionName();
      setSessionName((prev) => (prev === freshName ? prev : freshName));
    }, [storedSessionName, isAutoName])
  );

  useEffect(() => () => clearCapture(), [clearCapture]);

  const handleParse = useCallback(async () => {
    if (!cameraRef.current || parsing) return;

    try {
      setLocalError(null);
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: true,
      });

      if (!picture?.uri) {
        throw new Error('Could not capture the receipt photo. Please try again.');
      }

      const targetWidth = picture.width ? Math.min(picture.width, 1280) : undefined;
      const manipResult = await manipulateAsync(
        picture.uri,
        targetWidth ? [{ resize: { width: targetWidth } }] : [],
        { compress: 0.45, format: SaveFormat.JPEG, base64: true }
      );

      if (!manipResult?.base64) {
        throw new Error('Failed to prepare the receipt photo for upload.');
      }

      const base64SizeKb = (manipResult.base64.length * 3) / 4 / 1024;
      if (__DEV__) {
        console.log('[ReceiptScan] resized image ~KB:', base64SizeKb.toFixed(1), 'dims:', manipResult.width, 'x', manipResult.height);
      }

      const preparedName = sessionName.trim() || getDefaultSessionName();
      const capture: CapturedReceiptImage = {
        uri: manipResult.uri ?? picture.uri,
        base64: manipResult.base64,
        mimeType: 'image/jpeg',
        width: manipResult.width ?? picture.width,
        height: manipResult.height ?? picture.height,
      };

      setSessionNameStore(preparedName);
      setCapture(capture);

      await parseReceipt({
        sessionName: preparedName,
        language,
        image: {
          data: capture.base64,
          mimeType: capture.mimeType,
        },
      });

      router.push('/tabs/sessions/participants');
    } catch (error: any) {
      console.error('[ReceiptScan] Capture/Parse error:', error);
      let message = error instanceof Error ? error.message : 'Something went wrong while sending the receipt';
      
      // Handle camera unmounted or unresponsive states
      if (message.includes('unmounted') || message.includes('Camera') || message.includes('inactive')) {
        message = t('scanReceiptScreen.cameraError', 'Camera error occurred. Please try restarting the screen or checking permissions.');
      }
      setLocalError(message);
    }
  }, [cameraRef, parsing, sessionName, setSessionNameStore, setCapture, parseReceipt, language, router, t]);

  const handleGalleryPick = useCallback(async () => {
    if (parsing) return;
    try {
      setLocalError(null);

      if (!mediaPermission?.granted) {
        const response = await requestMediaPermission();
        if (!response.granted) {
          throw new Error('Gallery access permission is required to upload a receipt.');
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        throw new Error('Could not read the selected image URI.');
      }

      const targetWidth = asset.width ? Math.min(asset.width, 1280) : undefined;
      const manipResult = await manipulateAsync(
        asset.uri,
        targetWidth ? [{ resize: { width: targetWidth } }] : [],
        { compress: 0.45, format: SaveFormat.JPEG, base64: true }
      );

      if (!manipResult?.base64) {
        throw new Error('Failed to prepare the selected photo for upload.');
      }

      const preparedName = sessionName.trim() || getDefaultSessionName();
      const capture: CapturedReceiptImage = {
        uri: manipResult.uri ?? asset.uri,
        base64: manipResult.base64,
        mimeType: 'image/jpeg',
        width: manipResult.width ?? asset.width ?? 0,
        height: manipResult.height ?? asset.height ?? 0,
      };

      setSessionNameStore(preparedName);
      setCapture(capture);

      await parseReceipt({
        sessionName: preparedName,
        language,
        image: {
          data: capture.base64,
          mimeType: capture.mimeType,
        },
      });

      router.push('/tabs/sessions/participants');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong while choosing the receipt';
      setLocalError(message);
    }
  }, [parsing, mediaPermission, requestMediaPermission, sessionName, setSessionNameStore, setCapture, parseReceipt, language, router]);

  const useMock = useCallback(() => {
    router.push({
      pathname: '/tabs/sessions/participants',
      params: { receiptId: 'mock-001' },
    } as never);
  }, [router]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSessionNameChange = useCallback((value: string) => {
    setIsAutoName(false);
    setSessionName(value);
  }, [setIsAutoName, setSessionName]);

  const disableAction = parsing || !perm?.granted;
  const errorMessage = localError || parseError;

  return (
    <YStack flex={1} backgroundColor="#000">
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
            {t('scanReceiptScreen.title', 'Scan receipt')}
          </Text>
          <View width={42} />
        </XStack>
      </YStack>

      <YStack flex={1} backgroundColor="#000">
        {isFocused && perm?.granted ? (
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
          />
        ) : (
          <YStack style={{ flex: 1, alignItems: 'center', justifyContent: 'center' } as any}>
            {!perm ? <ActivityIndicator color="white" /> : <Paragraph style={{ color: '$gray1' } as any}>{t('scanReceiptScreen.allowCamera', 'Allow camera access')}</Paragraph>}
          </YStack>
        )}

        {parsing && (
          <YStack position="absolute" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.55)" style={{ alignItems: 'center', justifyContent: 'center' } as any}>
            <Spinner size="large" color="white" />
            <Paragraph style={{ marginTop: 8, color: 'white' } as any}>{t('scanReceiptScreen.uploading', 'Uploading receipt...')}</Paragraph>
          </YStack>
        )}
      </YStack>

      <YStack
        position="absolute"
        bottom={Math.max(insets.bottom, 16)}
        left={16}
        right={16}
        backgroundColor="rgba(10, 10, 15, 0.85)"
        borderWidth={0.5}
        borderColor="rgba(255,255,255,0.12)"
        style={{ padding: 16, borderRadius: 16, overflow: 'hidden' } as any}
      >
        <YStack gap="$3">
          <YStack gap={8}>
            <Paragraph color="$gray1" fontSize={12}>
              {t('scanReceiptScreen.sessionName', 'Session name')}
            </Paragraph>
            <Input
              value={sessionName}
              onChangeText={handleSessionNameChange}
              placeholder={t('scanReceiptScreen.sessionPlaceholder', 'e.g. Cafe on October')}
              height={41}
              borderRadius={10}
              style={{ paddingHorizontal: 16 } as any}
              backgroundColor="rgba(255,255,255,0.1)"
              color="white"
              borderWidth={1}
              borderColor="rgba(255,255,255,0.25)"
            />
          </YStack>

          <Paragraph color="$gray1" fontSize={12}>
            {t('scanReceiptScreen.language', 'language:')} <Text fontWeight="700" color="white">{language}</Text>
          </Paragraph>

          {storedCapture?.uri && (
            <XStack style={{ alignItems: 'center', gap: 8 } as any}>
              <Image source={storedCapture.uri} style={{ width: 56, height: 56, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }} contentFit="cover" />
              <Paragraph color="$gray1" fontSize={12}>
                {t('scanReceiptScreen.photoStored', 'Last photo stored; capturing again will overwrite it.')}
              </Paragraph>
            </XStack>
          )}

          {errorMessage && (
            <XStack style={{ alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,99,71,0.18)', paddingHorizontal: 8, paddingVertical: 8 } as any} borderRadius={8}>
              <AlertTriangle size={16} color="#FF6B6B" />
              <Paragraph color="#FF6B6B" flexShrink={1}>{errorMessage}</Paragraph>
            </XStack>
          )}

          <XStack style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 } as any}>
            <Button
              flex={1}
              size="$4"
              borderRadius={12}
              backgroundColor="rgba(255,255,255,0.06)"
              pressStyle={{ bg: 'rgba(255,255,255,0.15)', scale: 0.96 }}
              borderWidth={0}
              onPress={goBack}
              disabled={parsing}
              opacity={parsing ? 0.6 : 1}
            >
              <Text color="white" fontWeight="600" fontSize={14}>
                {t('scanReceiptScreen.cancel', 'Cancel')}
              </Text>
            </Button>
            <Button
              flex={1}
              size="$4"
              borderRadius={12}
              backgroundColor="#7c4dff"
              pressStyle={{ bg: '#5e35b1', scale: 0.96 }}
              borderWidth={0}
              onPress={handleParse}
              disabled={disableAction}
              icon={parsing ? undefined : <CameraIcon size={18} color="white" />}
            >
              <Text color="white" fontWeight="600" fontSize={14}>
                {parsing ? t('scanReceiptScreen.processing', 'Processing...') : t('scanReceiptScreen.takePhoto', 'Take photo')}
              </Text>
            </Button>
          </XStack>

          <Button
            size="$4"
            borderRadius={12}
            backgroundColor="rgba(255,255,255,0.04)"
            pressStyle={{ bg: 'rgba(255,255,255,0.12)', scale: 0.96 }}
            borderWidth={0.5}
            borderColor="rgba(255,255,255,0.1)"
            onPress={handleGalleryPick}
            disabled={parsing}
            icon={parsing ? undefined : <ImageIcon size={18} color="white" />}
          >
            <Text color="white" fontWeight="600" fontSize={14}>
              {parsing ? t('scanReceiptScreen.processing', 'Processing...') : t('scanReceiptScreen.uploadGallery', 'Upload from gallery')}
            </Text>
          </Button>

          <Button
            size="$3.5"
            borderRadius={12}
            backgroundColor="transparent"
            pressStyle={{ scale: 0.96 }}
            borderWidth={0.5}
            borderColor="rgba(255,255,255,0.1)"
            onPress={useMock}
            disabled={parsing}
          >
            <Text color="rgba(255,255,255,0.45)" fontWeight="500" fontSize={13}>
              {t('scanReceiptScreen.useMock', 'Use mock receipt')}
            </Text>
          </Button>
        </YStack>
      </YStack>
    </YStack>
  );
}
















