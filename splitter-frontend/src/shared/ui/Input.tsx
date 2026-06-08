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
    <YStack space="$2" w="100%">
      {!!label && (
        <Text fontSize="$3" fontWeight="600" color="$gray11">
          {label}
          {required && <Text color="$red10"> *</Text>}
        </Text>
      )}

      <XStack position="relative" w="100%">
        {leftAdornment && (
          <XStack
            position="absolute"
            left={14}
            top={0}
            bottom={0}
            ai="center"
            jc="center"
            zIndex={10}
            pointerEvents="box-none"
          >
            {leftAdornment}
          </XStack>
        )}

        <TInput
          w="100%"      // >>> всегда на полную ширину строки
          f={1}         // >>> растягивается внутри строки
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          // запас под адорнменты
          paddingLeft={leftAdornment ? 44 : 16}
          paddingRight={rightAdornment ? 44 : 16}
          borderRadius={14}
          borderWidth={1}
          borderColor={error ? '$red8' : '$gray7'}
          backgroundColor="$white1"
          height={52}
          fontSize="$4"
          focusStyle={{ borderColor: error ? '$red8' : '#312E81' }}
          {...textInputProps}
        />

        {rightAdornment && (
          <XStack
            position="absolute"
            right={8}
            top={0}
            bottom={0}
            ai="center"
            jc="center"
            zIndex={10}
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
