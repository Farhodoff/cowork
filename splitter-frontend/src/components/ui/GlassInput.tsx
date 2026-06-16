import React, { useState } from 'react';
import { Controller, Control } from 'react-hook-form';
import { TextInput, Pressable } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { Eye, EyeOff } from '@tamagui/lucide-icons';

interface GlassInputProps {
  name: string;
  control: Control<any>;
  placeholder: string;
  icon?: React.ReactNode;
  secureText?: boolean;
}

export function GlassInput({
  name,
  control,
  placeholder,
  icon,
  secureText = false,
}: GlassInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isSecure = secureText && !showPassword;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <YStack space="$1.5" width="100%">
          <XStack
            alignItems="center"
            height={52}
            borderWidth={1}
            borderColor={error ? '$danger' : 'rgba(255, 255, 255, 0.09)'}
            borderRadius={14}
            backgroundColor="rgba(255, 255, 255, 0.04)"
            paddingHorizontal="$3.5"
            space="$2"
          >
            {icon && <View opacity={0.65}>{icon}</View>}
            <TextInput
              style={{
                flex: 1,
                color: 'rgba(255, 255, 255, 0.88)',
                fontSize: 15,
                height: '100%',
              }}
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value || ''}
              secureTextEntry={isSecure}
              autoCapitalize="none"
            />
            {secureText && (
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color="rgba(255, 255, 255, 0.45)" />
                ) : (
                  <Eye size={18} color="rgba(255, 255, 255, 0.45)" />
                )}
              </Pressable>
            )}
          </XStack>
          {error && (
            <Text color="$danger" fontSize={12} paddingLeft="$2">
              {error.message}
            </Text>
          )}
        </YStack>
      )}
    />
  );
}

export default GlassInput;
