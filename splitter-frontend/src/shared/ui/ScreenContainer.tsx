import React from 'react'
import { YStack, View } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ScreenContainerProps {
  children: React.ReactNode
  paddingHorizontal?: any
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  paddingHorizontal = "$4"
}) => {
  const insets = useSafeAreaInsets()
  return (
    <YStack
      flex={1}
      backgroundColor="#0a0a0f"
      position="relative"
      overflow="hidden"
    >
      {/* Orb 1: Purple Ambient Glow (Top Left) */}
      <View
        position="absolute"
        top={-120}
        left={-120}
        width={300}
        height={300}
        borderRadius={150}
        backgroundColor="rgba(124, 77, 255, 0.14)"
        opacity={0.7}
      />
      {/* Orb 2: Blue Ambient Glow (Bottom Right) */}
      <View
        position="absolute"
        bottom={-150}
        right={-150}
        width={350}
        height={350}
        borderRadius={175}
        backgroundColor="rgba(68, 138, 255, 0.08)"
        opacity={0.7}
      />
      <YStack
        flex={1}
        paddingHorizontal={paddingHorizontal}
        paddingTop={insets.top > 0 ? insets.top : 24}
        paddingBottom={Math.max(insets.bottom, 12)}
        zIndex={1}
      >
        {children}
      </YStack>
    </YStack>
  )
}