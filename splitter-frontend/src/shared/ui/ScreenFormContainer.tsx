import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, View } from 'tamagui';

export default function ScreenFormContainer({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <YStack flex={1} position="relative" overflow="hidden" backgroundColor="#0a0a0f">
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
          zIndex={0}
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
          zIndex={0}
        />
        <KeyboardAvoidingView
          style={{ flex: 1, zIndex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
        >
          <ScrollView
            style={{ flex: 1, backgroundColor: 'transparent' }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </SafeAreaView>
  );
}
