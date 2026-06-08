import React, { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { YStack, XStack, Text, View } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable } from 'react-native';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import ScreenFormContainer from '@/shared/ui/ScreenFormContainer';
import PasswordInput from '@/shared/ui/PasswordInput';
import { register as registerUser, RegisterRequest, getCurrentUser } from '../api';
import { saveToken } from '@/shared/lib/utils/token-storage';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { User, Mail, Lock } from '@tamagui/lucide-icons';
import { LanguageSegmentedControl } from '@/shared/ui/LanguageSegmentedControl';

const schema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterForm() {
  const { t } = useTranslation();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '' },
  });
  const setAuth = useAppStore((s) => s.setAuth);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: RegisterRequest) => {
    try {
      setIsLoading(true);
      const res = await registerUser(values);
      await saveToken(res.token);

      let profile = res.user;
      try {
        profile = await getCurrentUser(res.token);
      } catch (fetchError) {
        console.warn('Registration profile refresh failed:', fetchError);
      }

      setAuth(res.token, profile);
      router.replace('/');
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Error'),
        error.message || t('auth.registerError', 'An error occurred during registration')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenFormContainer>
      <YStack space="$5" width="100%">
        {/* Language Selector */}
        <XStack justifyContent="center" alignItems="center" marginTop="$2" marginBottom="$-2">
          <View width={180}>
            <LanguageSegmentedControl
              value={language}
              onChange={(code) => setLanguage(code)}
              bg="#F3F4F6"
              activeBgColor="#2ECC71"
              activeTextColor="white"
              inactiveTextColor="#6B7280"
            />
          </View>
        </XStack>

        {/* Brand Icon & Header */}
        <YStack alignItems="center" space="$2" marginTop="$2">
          <YStack
            width={64}
            height={64}
            backgroundColor="#312E81"
            borderRadius={18}
            alignItems="center"
            justifyContent="center"
            marginBottom="$2"
            elevation={2}
          >
            <Text fontSize={32}>💰</Text>
          </YStack>
          <Text fontSize={30} fontWeight="800" color="$gray12">
            {t('auth.signUp', 'Sign Up')}
          </Text>
          <Text fontSize="$4" color="$gray10" textAlign="center">
            {t('auth.signUpDesc', 'Create an account to start splitting')}
          </Text>
        </YStack>

        {/* Form Card */}
        <Card padding="$5">
          <YStack space="$4">
            {/* Username / Full Name */}
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t('auth.fullNamePlaceholder', 'Full Name')}
                  value={value}
                  onChangeText={onChange}
                  error={errors.username?.message}
                  leftAdornment={<User size={20} color="rgba(0,0,0,0.35)" />}
                />
              )}
            />

            {/* Email */}
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t('auth.email', 'Email')}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  leftAdornment={<Mail size={20} color="rgba(0,0,0,0.35)" />}
                />
              )}
            />

            {/* Password */}
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <PasswordInput
                  placeholder={t('auth.password', 'Password')}
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  leftAdornment={<Lock size={20} color="rgba(0,0,0,0.35)" />}
                />
              )}
            />

            {/* Submit */}
            <Button
              title={isLoading ? t('common.loading', 'Creating Account...') : t('auth.createAccount', 'Create Account')}
              variant="primary"
              size="large"
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            />
          </YStack>
        </Card>

        {/* Footer (Sign In link) */}
        <XStack justifyContent="center" space="$2" marginTop="$3">
          <Text fontSize="$4" color="$gray10">
            {t('auth.haveAccount', 'Already have an account?')}
          </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text fontSize="$4" color="#312E81" fontWeight="700">
                {t('auth.signIn', 'Sign In')}
              </Text>
            </Pressable>
          </Link>
        </XStack>
      </YStack>
    </ScreenFormContainer>
  );
}
