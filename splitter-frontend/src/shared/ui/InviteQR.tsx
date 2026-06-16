// src/shared/ui/InviteQR.tsx
import React from 'react';
import { YStack, Paragraph, Card, Text } from 'tamagui';
import QRCode from 'react-native-qrcode-svg';

type Props = {
  url: string;
  title?: string;
  expiresAt?: string; // ISO
  caption?: string;
};

export function InviteQR({ url, title, expiresAt, caption }: Props) {
  return (
    <YStack style={{ alignItems: 'center', gap: 12 } as any}>
      {!!title && (
        <Paragraph fontWeight="700" fontSize="$6">
          {title}
        </Paragraph>
      )}

      <Card
        bordered
        elevate={false}
        style={{
          borderWidth: 0.5,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderRadius: 16,
          padding: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
        } as any}
      >
        <QRCode value={url} size={250} ecl="M" />
      </Card>

      <YStack style={{ alignItems: 'center', gap: 4 } as any}>
        <Paragraph color="rgba(255, 255, 255, 0.55)" size="$2">
          {caption ?? 'Valid for a limited time'}
        </Paragraph>
        {!!expiresAt && (
          <Text color="rgba(255, 255, 255, 0.35)" fontSize={12}>
            Expires: {new Date(expiresAt).toLocaleString()}
          </Text>
        )}
      </YStack>
    </YStack>
  );
}
