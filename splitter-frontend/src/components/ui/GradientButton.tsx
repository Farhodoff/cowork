import React from 'react';
import { Pressable, ActivityIndicator, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

export function GradientButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
}: GradientButtonProps) {
  // Safe style extraction
  const customStyles = style
    ? (Array.isArray(style)
        ? style.reduce((acc, curr) => ({ ...acc, ...curr }), {})
        : typeof style === 'object'
        ? style
        : {})
    : {};

  const baseStyle: ViewStyle = {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#7c4dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    opacity: disabled ? 0.5 : 1,
    ...customStyles,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={baseStyle}
    >
      <LinearGradient
        colors={['#7c4dff', '#448aff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: 15,
              letterSpacing: 0.5,
            }}
          >
            {label}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default GradientButton;
