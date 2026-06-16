import React from 'react';
import { XStack, YStack, Text, View } from 'tamagui';
import { GlassCard } from './GlassCard';

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tag?: string;
  variant?: 'purple' | 'amber' | 'teal';
}

export function InsightCard({
  icon,
  title,
  desc,
  tag,
  variant = 'purple',
}: InsightCardProps) {
  const getColors = () => {
    switch (variant) {
      case 'amber':
        return {
          borderColor: 'rgba(239, 159, 39, 0.25)',
          backgroundColor: 'rgba(239, 159, 39, 0.06)',
          tagColor: '#ef9f27',
          tagBg: 'rgba(239, 159, 39, 0.15)',
        };
      case 'teal':
        return {
          borderColor: 'rgba(0, 188, 140, 0.25)',
          backgroundColor: 'rgba(0, 188, 140, 0.06)',
          tagColor: '#00bc8c',
          tagBg: 'rgba(0, 188, 140, 0.15)',
        };
      case 'purple':
      default:
        return {
          borderColor: 'rgba(124, 77, 255, 0.25)',
          backgroundColor: 'rgba(124, 77, 255, 0.06)',
          tagColor: '#7c4dff',
          tagBg: 'rgba(124, 77, 255, 0.15)',
        };
    }
  };

  const colors = getColors();

  return (
    <GlassCard
      radius={18}
      padding={16}
      style={{
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
      }}
    >
      <XStack space="$3" alignItems="flex-start">
        <View
          padding="$2"
          borderRadius={12}
          backgroundColor={colors.tagBg}
          alignItems="center"
          justifyContent="center"
        >
          {icon}
        </View>
        <YStack flex={1} space="$1">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={15} fontWeight="700" color="rgba(255, 255, 255, 0.88)">
              {title}
            </Text>
            {tag && (
              <View px="$2" py="$0.5" borderRadius={99} backgroundColor={colors.tagBg}>
                <Text fontSize={10} fontWeight="700" color={colors.tagColor}>
                  {tag.toUpperCase()}
                </Text>
              </View>
            )}
          </XStack>
          <Text fontSize={13} fontWeight="500" color="rgba(255, 255, 255, 0.45)" lineHeight={18}>
            {desc}
          </Text>
        </YStack>
      </XStack>
    </GlassCard>
  );
}

export default InsightCard;
