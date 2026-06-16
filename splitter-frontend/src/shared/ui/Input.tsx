import React, { ReactNode } from 'react';
import { TextInputProps } from 'react-native';
import { YStack, XStack, Text, Input as TInput } from 'tamagui';

export type CustomInputProps = {
  label?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
  error?: string;
  required?: boolean;

  /** Иконка/кнопка справа (например, «глаз»). */
  rightAdornment?: ReactNode;

  /** Иконка слева inside input */
  leftAdornment?: ReactNode;

  /** Любые нативные пропсы TextInput (returnKeyType, autoComplete и т.п.). */
  textInputProps?: Partial<TextInputProps>;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  error,
  required,
  rightAdornment,
  leftAdornment,
  textInputProps,
}: CustomInputProps) {
  return (
    <YStack space="$2" style={{ width: '100%' } as any}>
      {!!label && (
        <Text fontSize="$3" fontWeight="600" color="$gray11">
          {label}
          {required && <Text color="$red10"> *</Text>}
        </Text>
      )}

      <XStack position="relative" style={{ width: '100%' } as any}>
        {leftAdornment && (
          <XStack
            position="absolute"
            left={14}
            top={0}
            bottom={0}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            } as any}
            pointerEvents="box-none"
          >
            {leftAdornment}
          </XStack>
        )}

        <TInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.35)"
          color="rgba(255, 255, 255, 0.88)"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          // запас под адорнменты
          paddingLeft={leftAdornment ? 44 : 16}
          paddingRight={rightAdornment ? 44 : 16}
          borderRadius={14}
          borderWidth={1}
          borderColor={error ? '$red8' : 'rgba(255, 255, 255, 0.1)'}
          backgroundColor="rgba(255, 255, 255, 0.04)"
          height={52}
          fontSize="$4"
          focusStyle={{ borderColor: error ? '$red8' : '#7c4dff' }}
          style={{ width: '100%', flex: 1 } as any}
          {...textInputProps}
        />

        {rightAdornment && (
          <XStack
            position="absolute"
            right={8}
            top={0}
            bottom={0}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            } as any}
            pointerEvents="box-none"
          >
            {rightAdornment}
          </XStack>
        )}
      </XStack>

      {!!error && (
        <Text fontSize="$3" color="$red10">
          {error}
        </Text>
      )}
    </YStack>
  );
}

export default Input;
