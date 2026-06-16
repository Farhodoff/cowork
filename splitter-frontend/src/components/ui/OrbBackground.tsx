import React from 'react';
import { View } from 'tamagui';
import { BlurView } from 'expo-blur';

const ABS_FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

export function OrbBackground() {
  return (
    <View {...ABS_FILL} zIndex={0} pointerEvents="none" backgroundColor="#0a0a0f">
      {/* Orb 1: Purple (Top Left) */}
      <View
        position="absolute"
        top={-100}
        left={-100}
        width={300}
        height={300}
        borderRadius={9999}
        backgroundColor="rgba(124, 77, 255, 0.20)"
      />

      {/* Orb 2: Blue (Top Right) */}
      <View
        position="absolute"
        top={100}
        right={-150}
        width={350}
        height={350}
        borderRadius={9999}
        backgroundColor="rgba(68, 138, 255, 0.12)"
      />

      {/* Orb 3: Purple (Bottom Left) */}
      <View
        position="absolute"
        bottom={-120}
        left={-120}
        width={320}
        height={320}
        borderRadius={9999}
        backgroundColor="rgba(124, 77, 255, 0.15)"
      />

      <BlurView intensity={80} tint="dark" style={ABS_FILL} />
    </View>
  );
}

export default OrbBackground;
