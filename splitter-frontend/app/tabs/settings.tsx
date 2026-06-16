// app/tabs/settings.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { YStack, Text, Separator, XStack, useTheme, View } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Globe, Lock, User as UserIcon, Palette } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/shared/ui/Button';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import Input from '@/shared/ui/Input';
import PasswordInput from '@/shared/ui/PasswordInput';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { changePassword, updateUsername } from '@/features/auth/api';
import { LANGUAGE_OPTIONS, type LanguageCode } from '@/shared/config/languages';

export default function SettingsScreen() {
  const { user, setUser, language, setLanguage, theme: appTheme, setTheme: setAppTheme } = useAppStore();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const bg = '#0a0a0f';
  const isLoggedIn = !!user;

  const [usernameValue, setUsernameValue] = useState(user?.username ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setUsernameValue(user?.username ?? '');
  }, [user?.username]);

  const usernameDirty = useMemo(() => {
    const trimmed = usernameValue.trim();
    return trimmed.length > 0 && trimmed !== (user?.username ?? '').trim();
  }, [usernameValue, user?.username]);

  const validateUsername = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return t('settings.validation.usernameRequired', 'Username cannot be empty');
    if (trimmed.length < 2) return t('settings.validation.usernameMin', 'Username must be at least 2 characters');
    return null;
  };

  const validatePasswordForm = () => {
    if (!currentPassword.trim()) return t('settings.validation.passwordCurrent', 'Enter your current password');
    if (newPassword.length < 8) return t('settings.validation.passwordLength', 'New password must be at least 8 characters');
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9\s]/.test(newPassword);
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return t('settings.validation.passwordComplexity', 'Password must include uppercase, lowercase, number, and special character');
    }
    if (newPassword !== confirmPassword) return t('settings.validation.passwordMismatch', 'Passwords do not match');
    if (newPassword === currentPassword) return t('settings.validation.passwordDifferent', 'Choose a different password');
    return null;
  };

  const handleLanguageChange = (code: LanguageCode) => {
    if (code === language) return;
    setLanguage(code);
  };

  const handleSaveUsername = async () => {
    if (!isLoggedIn) {
      Alert.alert(t('settings.alerts.unavailable', 'Unavailable'), t('settings.alerts.loginToUpdateUsername', 'Sign in to update your username.'));
      return;
    }
    const error = validateUsername(usernameValue);
    if (error) {
      setUsernameError(error);
      return;
    }
    setUsernameError(null);

    const trimmed = usernameValue.trim();

    try {
      setIsUpdatingUsername(true);
      const updatedUser = await updateUsername({ username: trimmed });
      setUser(updatedUser);
      Alert.alert(t('settings.alerts.success', 'Success'), t('settings.alerts.usernameUpdated', 'Username updated.'));
    } catch (error) {
      console.error('Username update failed:', error);
      const fallback = t('settings.alerts.updateUsernameFailed', 'Could not update the username.');
      const message = error instanceof Error ? error.message : fallback;
      Alert.alert(t('settings.alerts.error', 'Error'), message);
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isLoggedIn) {
      Alert.alert(t('settings.alerts.unavailable', 'Unavailable'), t('settings.alerts.loginToChangePassword', 'Sign in to change your password.'));
      return;
    }

    const error = validatePasswordForm();
    if (error) {
      setPasswordError(error);
      return;
    }
    setPasswordError(null);

    try {
      setIsChangingPassword(true);
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(t('settings.alerts.passwordChanged', 'Password updated'), t('settings.alerts.passwordUpdated', 'Your password has been changed.'));
    } catch (error) {
      console.error('Password change failed:', error);
      const fallback = t('settings.alerts.changePasswordFailed', 'Could not change the password.');
      const message = error instanceof Error ? error.message : fallback;
      Alert.alert(t('settings.alerts.error', 'Error'), message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    if (usernameError && usernameValue.trim().length >= 2) {
      setUsernameError(null);
    }
  }, [usernameError, usernameValue]);

  useEffect(() => {
    if (passwordError) {
      const err = validatePasswordForm();
      if (!err) setPasswordError(null);
    }
  }, [currentPassword, newPassword, confirmPassword, passwordError]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 }) ?? 0}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: '#0a0a0f' }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenContainer>
            <YStack space="$5">
              {/* Custom Header */}
              <XStack alignItems="center" marginBottom="$4" marginTop={16}>
                <Pressable onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                  <ChevronLeft size={24} color="rgba(255,255,255,0.88)" />
                </Pressable>
                <Text fontSize={24} fontWeight="800" color="rgba(255,255,255,0.88)" marginLeft="$2">
                  {t('settings.accountSettings', 'Settings')}
                </Text>
              </XStack>

              {/* LANGUAGE CARD */}
              <YStack
                backgroundColor="rgba(255, 255, 255, 0.04)"
                borderRadius={20}
                borderWidth={0.5}
                borderColor="rgba(255, 255, 255, 0.08)"
                padding="$4"
                space="$3"
              >
                <XStack alignItems="center" space="$2">
                  <Globe size={18} color="#7c4dff" />
                  <Text fontSize={18} fontWeight="700" color="rgba(255, 255, 255, 0.88)">
                    {t('settings.language.title', 'Language')}
                  </Text>
                </XStack>
                <Text fontSize={13} color="$gray10" marginBottom="$2">
                  {t('settings.language.description', 'Choose your preferred language')}
                </Text>

                <XStack
                  backgroundColor="rgba(0,0,0,0.4)"
                  borderRadius={24}
                  padding="$1"
                  flexWrap="wrap"
                >
                  {LANGUAGE_OPTIONS.map((option) => {
                    const isActive = option.code === language;
                    const label = t(
                      `settings.language.options.${option.code}`,
                      option.shortLabel
                    );
                    return (
                      <Pressable
                        key={option.code}
                        onPress={() => handleLanguageChange(option.code)}
                        style={{ flex: 1 }}
                      >
                        <View
                          backgroundColor={isActive ? '#ffffff' : 'transparent'}
                          borderRadius={20}
                          paddingVertical={10}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text
                            fontSize={12}
                            fontWeight="800"
                            color={isActive ? '#000000' : '$gray10'}
                          >
                            {label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </XStack>
              </YStack>

              <Separator />

              {/* THEME CARD */}
              <YStack
                backgroundColor="rgba(255, 255, 255, 0.04)"
                borderRadius={20}
                borderWidth={0.5}
                borderColor="rgba(255, 255, 255, 0.08)"
                padding="$4"
                space="$3"
              >
                <XStack alignItems="center" space="$2">
                  <Palette size={18} color="#7c4dff" />
                  <Text fontSize={18} fontWeight="700" color="rgba(255, 255, 255, 0.88)">
                    {t('settings.theme.title', 'Appearance')}
                  </Text>
                </XStack>
                <Text fontSize={13} color="$gray10" marginBottom="$2">
                  {t('settings.theme.description', 'Choose between Light, Dark, or System theme')}
                </Text>

                <XStack
                  backgroundColor="rgba(0,0,0,0.4)"
                  borderRadius={24}
                  padding="$1"
                  flexWrap="wrap"
                >
                  {([
                    { code: 'light', label: t('settings.theme.options.light', 'Light') },
                    { code: 'dark', label: t('settings.theme.options.dark', 'Dark') },
                    { code: 'system', label: t('settings.theme.options.system', 'System') },
                  ] as const).map((option) => {
                    const isActive = appTheme === option.code;
                    return (
                      <Pressable
                        key={option.code}
                        onPress={() => setAppTheme(option.code as any)}
                        style={{ flex: 1 }}
                      >
                        <View
                          backgroundColor={isActive ? '#ffffff' : 'transparent'}
                          borderRadius={20}
                          paddingVertical={10}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text
                            fontSize={12}
                            fontWeight="800"
                            color={isActive ? '#000000' : '$gray10'}
                          >
                            {option.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </XStack>
              </YStack>

              <Separator />

              {/* USERNAME CARD */}
              <YStack
                backgroundColor="rgba(255, 255, 255, 0.04)"
                borderRadius={20}
                borderWidth={0.5}
                borderColor="rgba(255, 255, 255, 0.08)"
                padding="$4"
                space="$3"
              >
                <XStack alignItems="center" space="$2">
                  <UserIcon size={18} color="#7c4dff" />
                  <Text fontSize={18} fontWeight="700" color="rgba(255, 255, 255, 0.88)">
                    {t('settings.username', 'Username')}
                  </Text>
                </XStack>
                <Input
                  value={usernameValue}
                  onChangeText={setUsernameValue}
                  placeholder={t('settings.enterNewUsername', 'Enter a new username')}
                  textInputProps={{ autoCapitalize: 'none', autoCorrect: false }}
                  error={usernameError || undefined}
                />
                <XStack space="$2" marginTop="$2">
                  <Button
                    title={isUpdatingUsername ? t('settings.saving', 'Saving...') : t('settings.saveUsername', 'Save username')}
                    variant="primary"
                    size="medium"
                    disabled={!usernameDirty || isUpdatingUsername}
                    onPress={handleSaveUsername}
                  />
                  <Button
                    title={t('settings.reset', 'Reset')}
                    variant="outline"
                    size="medium"
                    disabled={!usernameDirty}
                    onPress={() => setUsernameValue(user?.username ?? '')}
                  />
                </XStack>
              </YStack>

              <Separator />

              {/* PASSWORD CARD */}
              <YStack
                backgroundColor="rgba(255, 255, 255, 0.04)"
                borderRadius={20}
                borderWidth={0.5}
                borderColor="rgba(255, 255, 255, 0.08)"
                padding="$4"
                space="$3"
              >
                <XStack alignItems="center" space="$2">
                  <Lock size={18} color="#7c4dff" />
                  <Text fontSize={18} fontWeight="700" color="rgba(255, 255, 255, 0.88)">
                    {t('settings.password', 'Change password')}
                  </Text>
                </XStack>
                <PasswordInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder={t('settings.currentPassword', 'Enter current password')}
                  textInputProps={{ returnKeyType: 'next' }}
                />
                <PasswordInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('settings.newPassword', 'Enter new password')}
                  textInputProps={{ returnKeyType: 'next' }}
                />
                <Text fontSize={12} color="$gray10">
                  {t('settings.passwordReq', 'Password must be at least 8 characters and include uppercase, lowercase, number, and special symbol.')}
                </Text>
                <PasswordInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('settings.confirmPassword', 'Confirm new password')}
                  textInputProps={{ returnKeyType: 'done' }}
                  error={passwordError || undefined}
                />
                <YStack marginTop={8}>
                  <Button
                    title={isChangingPassword ? t('settings.saving', 'Saving...') : t('settings.changePassword', 'Change password')}
                    variant="primary"
                    size="large"
                    width="100%"
                    disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
                    onPress={handleChangePassword}
                  />
                </YStack>
              </YStack>
            </YStack>
          </ScreenContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
