import React, { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { YStack, XStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable } from 'react-native';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import ScreenFormContainer from '@/shared/ui/ScreenFormContainer';
import PasswordInput from '@/shared/ui/PasswordInput';
import { login, LoginRequest, getCurrentUser } from '../api';
import { saveToken } from '@/shared/lib/utils/token-storage';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { Mail, Lock } from '@tamagui/lucide-icons';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function LoginForm() {
  const { t } = useTranslation();
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const setAuth = useAppStore((s) => s.setAuth);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: LoginRequest) => {
    try {
      setIsLoading(true);
      const res = await login(values);
      await saveToken(res.token);

      let profile = res.user;
      try {
        profile = await getCurrentUser(res.token);
      } catch (fetchError) {
        console.warn('Login profile refresh failed:', fetchError);
      }

      setAuth(res.token, profile);
      router.replace('/');
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Error'),
        error.message || t('auth.loginError', 'An error occurred during login')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenFormContainer>
      <YStack space="$5" width="100%">
        {/* Brand Icon & Header */}
        <YStack alignItems="center" space="$2" marginTop="$4">
          <YStack
            width={64}
            height={64}
            backgroundColor="#4F46E5"
            borderRadius={18}
            alignItems="center"
            justifyContent="center"
            marginBottom="$2"
            elevation={2}
          >
            <Text fontSize={32}>💰</Text>
          </YStack>
          <Text fontSize={30} fontWeight="800" color="$gray12">
            {t('auth.signIn', 'Sign In')}
          </Text>
          <Text fontSize="$4" color="$gray10" textAlign="center">
            {t('auth.signInDesc', 'Sign in to continue splitting bills')}
          </Text>
        </YStack>

        {/* Form Card */}
        <Card padding="$5">
          <YStack space="$4">
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

            {/* Forgot Password */}
            <XStack justifyContent="flex-end" marginTop="$-1">
              <Pressable onPress={() => {}}>
                <Text fontSize="$3" color="#4F46E5" fontWeight="600">
                  {t('auth.forgotPassword', 'Forgot password?')}
                </Text>
              </Pressable>
            </XStack>

            {/* Submit */}
            <Button
              title={isLoading ? t('common.loading', 'Signing In...') : t('auth.signIn', 'Sign In')}
              variant="primary"
              size="large"
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            />
          </YStack>
        </Card>



        {/* Footer (Sign Up link) */}
        <XStack justifyContent="center" space="$2" marginTop="$3">
          <Text fontSize="$4" color="$gray10">
            {t('auth.noAccount', "Don't have an account?")}
          </Text>
          <Link href="/register" asChild>
            <Pressable>
              <Text fontSize="$4" color="#4F46E5" fontWeight="700">
                {t('auth.signUp', 'Sign Up')}
              </Text>
            </Pressable>
          </Link>
        </XStack>
      </YStack>
    </ScreenFormContainer>
  );
}
