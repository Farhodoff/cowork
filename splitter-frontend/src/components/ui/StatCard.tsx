import React from 'react';
import { YStack, Text } from 'tamagui';

interface StatCardProps {
  value: string | number;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function StatCard({ value, label, active = false, onPress }: StatCardProps) {
  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      py="$3.5"
      px="$2"
      borderRadius={18}
      borderWidth={active ? 1.5 : 1}
      borderColor={active ? '#7c4dff' : 'rgba(255, 255, 255, 0.09)'}
      backgroundColor={active ? 'rgba(124, 77, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)'}
      pressStyle={{ scale: 0.97 }}
      onPress={onPress}
    >
      <Text
        fontFamily="$heading"
        fontSize={22}
        fontWeight="700"
        color={active ? '#7c4dff' : 'rgba(255, 255, 255, 0.88)'}
      >
        {value}
      </Text>
      <Text
        fontSize={12}
        fontWeight="500"
        color={active ? '#7c4dff' : 'rgba(255, 255, 255, 0.45)'}
        marginTop="$1"
        textAlign="center"
      >
        {label}
      </Text>
    </YStack>
  );
}

export default StatCard;
