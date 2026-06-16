import React from 'react';
import { Image } from 'expo-image';
import { View, Text } from 'tamagui';

interface UserAvatarProps {
  uri?: string | null;
  label: string;
  size?: number;
  textSize?: number;
  backgroundColor?: string;
}

export function UserAvatar({
  uri,
  label,
  size = 48,
  textSize,
  backgroundColor = '$gray5',
}: UserAvatarProps) {
  const radius = size / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: backgroundColor.startsWith('$') ? undefined : backgroundColor,
      } as any}
    >
      {uri ? (
        <Image source={uri} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <Text fontSize={textSize ?? Math.round(size / 2.5)} fontWeight="700">
          {label}
        </Text>
      )}
    </View>
  );
}

export default UserAvatar;
