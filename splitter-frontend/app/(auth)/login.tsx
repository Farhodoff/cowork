import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { YStack, XStack, Text, View } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Mail, Lock } from '@tamagui/lucide-icons';
import { Link } from 'expo-router';
import { Alert } from 'react-native';

import OrbBackground from '@/components/ui/OrbBackground';
import GlassCard from '@/components/ui/GlassCard';
import GlassInput from '@/components/ui/GlassInput';
import GradientButton from '@/components/ui/GradientButton';
import { useAuth } from '@/hooks/useAuth';
import { LanguageSegmentedControl } from '@/shared/ui/LanguageSegmentedControl';
import { useAppStore } from '@/shared/lib/stores/app-store';

type LoginData = {
  email: string;
  password: string;
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, isLoggingIn } = useAuth();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const loginSchema = useMemo(() => z.object({
    email: z.string().email(t('auth.validation.emailInvalid', "Noto'g'ri email format")),
    password: z.string().min(6, t('auth.validation.passwordMin', "Kamida 6 ta belgi")),
  }), [t]);

  const { control, handleSubmit } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || t('auth.loginError');
      Alert.alert(t('common.error'), errMsg);
    }
  };

  return (
    <YStack flex={1} justifyContent="center" paddingHorizontal={16}>
      <OrbBackground />

      <YStack space="$6" width="100%" zIndex={1}>
        {/* Language Selector */}
        <XStack justifyContent="center" alignItems="center" marginTop="$2" marginBottom="$-4">
          <View style={{ width: 180 } as any}>
            <LanguageSegmentedControl
              value={language}
              onChange={(code) => setLanguage(code)}
              bg="rgba(255, 255, 255, 0.06)"
              activeBgColor="#00bc8c"
              activeTextColor="white"
              inactiveTextColor="rgba(255, 255, 255, 0.4)"
            />
          </View>
        </XStack>

        {/* Brand Header */}
        <YStack alignItems="center" space="$2">
          <Text fontSize={32}>💰</Text>
          <Text fontFamily="$heading" fontSize={32} fontWeight="800" color="white">
            {t('login')}
          </Text>
        </YStack>

        {/* Card containing inputs */}
        <GlassCard radius={28} padding={20}>
          <YStack space="$4">
            <GlassInput
              name="email"
              control={control}
              placeholder={t('email')}
              icon={<Mail size={20} color="rgba(255, 255, 255, 0.45)" />}
            />

            <GlassInput
              name="password"
              control={control}
              placeholder={t('password')}
              secureText
              icon={<Lock size={20} color="rgba(255, 255, 255, 0.45)" />}
            />



            <GradientButton
              label={t('login')}
              onPress={handleSubmit(onSubmit)}
              loading={isLoggingIn}
            />
          </YStack>
        </GlassCard>

        {/* Switch Auth toggle link */}
        <XStack justifyContent="center" space="$2">
          <Text color="rgba(255, 255, 255, 0.45)" fontSize={14}>
            {t('no_account')}
          </Text>
          <Link href={"/(auth)/register" as any} asChild>
            <Text color="#7c4dff" fontWeight="700" fontSize={14}>
              {t('sign_up')}
            </Text>
          </Link>
        </XStack>
      </YStack>
    </YStack>
  );
}
