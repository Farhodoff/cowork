import React from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

const ABS_FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

interface GlassCardProps {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
  style?: any;
  onPress?: () => void;
}

export function GlassCard({ children, padding = 16, radius = 18, style, onPress }: GlassCardProps) {
  const content = (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.09)' }, style]}>
      {/* Blur background */}
      <BlurView intensity={24} tint="dark" style={ABS_FILL} />
      
      {/* Fallback solid color overlay */}
      <View style={[ABS_FILL, { backgroundColor: 'rgba(255, 255, 255, 0.04)' }]} />

      {/* Top light border highlight gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(255, 255, 255, 0.15)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 1, width: '100%', position: 'absolute', top: 0 }}
      />

      <View style={{ padding }}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable 
        onPress={onPress} 
        style={({ pressed }) => ({ 
          opacity: pressed ? 0.88 : 1, 
          transform: pressed ? [{ scale: 0.98 }] : [] 
        })}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export default GlassCard;
