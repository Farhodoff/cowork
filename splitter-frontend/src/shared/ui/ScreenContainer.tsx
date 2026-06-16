import React, { useEffect } from 'react'
import { YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated'

interface ScreenContainerProps {
  children: React.ReactNode
  paddingHorizontal?: any
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  paddingHorizontal = "$4"
}) => {
  const insets = useSafeAreaInsets()
  
  const orb1Scale = useSharedValue(1)
  const orb2Scale = useSharedValue(1)

  useEffect(() => {
    orb1Scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    )
    orb2Scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    )
  }, [])

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb1Scale.value }]
  }))
  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb2Scale.value }]
  }))

  return (
    <YStack
      flex={1}
      backgroundColor="#0a0a0f"
      position="relative"
      overflow="hidden"
    >
      {/* Orb 1: Purple Ambient Glow (Top Left) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -120,
            left: -120,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: 'rgba(124, 77, 255, 0.14)',
            opacity: 0.7,
          },
          orb1Style
        ]}
      />
      {/* Orb 2: Blue Ambient Glow (Bottom Right) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: -150,
            right: -150,
            width: 350,
            height: 350,
            borderRadius: 175,
            backgroundColor: 'rgba(68, 138, 255, 0.08)',
            opacity: 0.7,
          },
          orb2Style
        ]}
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