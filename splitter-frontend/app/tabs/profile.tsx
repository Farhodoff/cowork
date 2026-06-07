import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, TextInputProps } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { YStack, XStack, Text, Button, Separator, Spinner, Card, View, ScrollView } from 'tamagui';
import {
  Copy,
  LogOut,
  Upload,
  RotateCcw,
  CheckCircle,
  User as UserIcon,
  Mail,
  Lock,
  Edit3,
  X,
  Check,
  Languages,
  ChevronRight,
  HelpCircle,
  Settings as SettingsIcon,
  ArrowLeft,
} from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/shared/ui/UserAvatar';
import Input from '@/shared/ui/Input';
import PasswordInput from '@/shared/ui/PasswordInput';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { changePassword, resetAvatar, updateEmail, updateUsername, uploadAvatar } from '@/features/auth/api';
import { LANGUAGE_OPTIONS, type LanguageCode } from '@/shared/config/languages';
import { LanguageSegmentedControl } from '@/shared/ui/LanguageSegmentedControl';
import { useGroupsStore } from '@/features/groups/model/groups.store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';

type SuccessKey = 'avatar' | 'password';
type StatusState = 'idle' | 'saving' | 'success';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.9,
};

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  successTrigger?: number;
}

function SectionCard({ title, icon, children, successTrigger = 0 }: SectionCardProps) {
  return (
    <YStack
      borderWidth={0.5}
      borderColor="#E5E7EB"
      borderRadius={16}
      padding="$4"
      gap="$3"
      backgroundColor="white"
      position="relative"
    >
      <XStack ai="center" jc="space-between">
        <XStack ai="center" gap="$2">
          {icon}
          <Text fontSize={16} fontWeight="700">
            {title}
          </Text>
        </XStack>
        <SuccessBadge trigger={successTrigger} />
      </XStack>
      {children}
    </YStack>
  );
}

function SuccessBadge({ trigger }: { trigger?: number }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!trigger) return;

    setVisible(true);
    opacity.setValue(0);
    scale.setValue(0.9);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 140,
      }),
    ]).start(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        delay: 1200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    });
  }, [trigger, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ scale }],
        backgroundColor: 'rgba(34,197,94,0.15)',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 4,
      }}
    >
      <XStack ai="center" gap="$1">
        <CheckCircle size={16} color="#22c55e" />
        <Text fontSize={12} fontWeight="600" color="$green10">
          {t('profile.status.saved', 'Saved')}
        </Text>
      </XStack>
    </Animated.View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  onCopy?: () => void;
}

function InfoRow({ label, value, onCopy }: InfoRowProps) {
  const { t } = useTranslation();
  return (
    <YStack gap="$1">
      <Text fontSize={12} color="$gray9">
        {label}
      </Text>
      <XStack ai="center" jc="space-between">
        <Text fontSize={16} fontWeight="600">
          {value || '—'}
        </Text>
        {onCopy && (
          <Button size="$2.5" variant="outlined" icon={<Copy size={14} color="$gray11" />} onPress={onCopy}>
            {t('profile.actions.copy', 'Copy')}
          </Button>
        )}
      </XStack>
    </YStack>
  );
}

interface EditableFieldRowProps {
  label: string;
  value: string;
  draft: string;
  setDraft: (value: string) => void;
  placeholder: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  status: StatusState;
  error?: string | null;
  onCopy?: () => void;
  textInputProps?: Partial<TextInputProps>;
}

function EditableFieldRow({
  label,
  value,
  draft,
  setDraft,
  placeholder,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  status,
  error,
  onCopy,
  textInputProps,
}: EditableFieldRowProps) {
  const { t } = useTranslation();
  const animatedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'success' && !isEditing) {
      animatedScale.setValue(0.85);
      Animated.spring(animatedScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 120,
      }).start();
    }
  }, [animatedScale, status, isEditing]);

  const editIcon = () => {
    if (status === 'saving') {
      return <Spinner size="small" color="$gray11" />;
    }
    if (status === 'success' && !isEditing) {
      return (
        <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
          <CheckCircle size={16} color="#22c55e" />
        </Animated.View>
      );
    }
    return <Edit3 size={16} color="$gray11" />;
  };

  return (
    <YStack gap="$2">
      <XStack ai="center" jc="space-between">
        <Text fontSize={12} color="$gray9">
          {label}
        </Text>
        <XStack gap="$2">
          {isEditing ? (
            <>
              <Button
                size="$2"
                variant="outlined"
                icon={<X size={16} color="$gray11" />}
                onPress={onCancelEdit}
              />
              <Button
                size="$2"
                bg="$green9"
                color="white"
                icon={status === 'saving' ? <Spinner size="small" color="white" /> : <Check size={16} color="white" />}
                onPress={onSave}
                disabled={status === 'saving'}
              />
            </>
          ) : (
            <>
              {onCopy && (
                <Button
                  size="$2"
                  variant="outlined"
                  icon={<Copy size={16} color="$gray11" />}
                  onPress={onCopy}
                >
                  {t('profile.actions.copy', 'Copy')}
                </Button>
              )}
              <Button
                size="$2"
                variant="outlined"
                onPress={onStartEdit}
                icon={editIcon()}
              />
            </>
          )}
        </XStack>
      </XStack>
      {isEditing ? (
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          error={error || undefined}
          textInputProps={{ autoCapitalize: 'none', autoCorrect: false, ...textInputProps }}
        />
      ) : (
        <Text fontSize={16} fontWeight="600">
          {value || '—'}
        </Text>
      )}
    </YStack>
  );
}

interface MenuItemProps {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  onPress: () => void;
  textColor?: string;
  hideChevron?: boolean;
}

function MenuItem({ label, icon, iconBg, onPress, textColor = '#111827', hideChevron = false }: MenuItemProps) {
  return (
    <Card
      pressStyle={{ scale: 0.98 }}
      onPress={onPress}
      bg="white"
      br={16}
      p="$4"
      bw={0.5}
      bc="#E5E7EB"
      shadowOpacity={0}
    >
      <XStack jc="space-between" ai="center">
        <XStack ai="center" gap="$3.5">
          <View w={38} h={38} br={10} bg={iconBg} ai="center" jc="center">
            {icon}
          </View>
          <Text fontSize={16} fontWeight="600" color={textColor}>
            {label}
          </Text>
        </XStack>
        {!hideChevron && (
          <ChevronRight size={20} color="#9CA3AF" />
        )}
      </XStack>
    </Card>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAppStore();

  const language = useAppStore((s) => s.language);
  const { t } = useTranslation();
  const setLanguage = useAppStore((s) => s.setLanguage);

  // Active Sub-screen State
  const [activeSubScreen, setActiveSubScreen] = useState<'edit' | 'settings' | 'help' | null>(null);

  // Stats Stores
  const { fetchGroups, groups } = useGroupsStore();
  const { fetchAll: fetchFriends, friends } = useFriendsStore();
  const { fetchHistory, count: expensesCount } = useSessionsHistoryStore();

  useEffect(() => {
    fetchGroups();
    fetchFriends();
    fetchHistory();
  }, [fetchGroups, fetchFriends, fetchHistory]);

  const joinDateLabel = useMemo(() => {
    if (!(user as any)?.createdAt) return 'Member since Jun 2026';
    const date = new Date((user as any).createdAt);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `Member since ${months[date.getMonth()]} ${date.getFullYear()}`;
  }, [user]);

  const guestLabel = t('profile.labels.guest', 'Guest');
  const notAvailableLabel = t('profile.labels.notAvailable', 'N/A');
  const avatarTitle = t('profile.avatar.title', 'Avatar');
  const avatarHint = t(
    'profile.avatar.hint',
    'Uploaded avatars are delivered via our CDN and refresh instantly.'
  );
  const avatarUploadLabel = t('profile.avatar.upload', 'Upload from phone');
  const avatarUploadingLabel = t('profile.avatar.uploading', 'Uploading...');
  const avatarResetLabel = t('profile.avatar.reset', 'Reset avatar');
  const avatarResettingLabel = t('profile.avatar.resetting', 'Resetting...');
  const userInfoTitle = t('profile.info.title', 'User information');
  const usernameLabel = t('profile.info.usernameLabel', 'Username');
  const usernamePlaceholder = t('profile.info.usernamePlaceholder', 'Enter a new username');
  const emailLabel = t('profile.info.emailLabel', 'Email');
  const emailPlaceholder = t('profile.info.emailPlaceholder', 'Enter a new email');
  const userIdLabel = t('profile.info.userId', 'User ID');
  const passwordTitle = t('profile.password.title', 'Change password');
  const currentPasswordLabel = t('profile.password.currentLabel', 'Current password');
  const currentPasswordPlaceholder = t('profile.password.currentPlaceholder', 'Enter current password');
  const newPasswordLabel = t('profile.password.newLabel', 'New password');
  const newPasswordPlaceholder = t('profile.password.newPlaceholder', 'Enter new password');
  const confirmPasswordLabel = t('profile.password.confirmLabel', 'Confirm new password');
  const confirmPasswordPlaceholder = t('profile.password.confirmPlaceholder', 'Confirm new password');
  const passwordRequirements = t(
    'profile.password.requirements',
    'Password must be at least 8 characters and include uppercase, lowercase, number, and special symbol.'
  );
  const passwordSubmitLabel = t('profile.password.submit', 'Change password');
  const passwordUpdatingLabel = t('profile.password.updating', 'Updating...');
  const logoutLabel = t('profile.logout', 'Log out');

  const displayName = user?.username || guestLabel;
  const userId = user?.uniqueId ?? '';

  const [previewUri, setPreviewUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);
  const [successCounters, setSuccessCounters] = useState<Record<SuccessKey, number>>({
    avatar: 0,
    password: 0,
  });

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<StatusState>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(user?.email ?? '');
  const [emailStatus, setEmailStatus] = useState<StatusState>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    setPreviewUri(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  useEffect(() => {
    setUsernameDraft(user?.username ?? '');
    setIsEditingUsername(false);
    setUsernameStatus('idle');
    setUsernameError(null);
  }, [user?.username]);

  useEffect(() => {
    setEmailDraft(user?.email ?? '');
    setIsEditingEmail(false);
    setEmailStatus('idle');
    setEmailError(null);
  }, [user?.email]);

  useEffect(() => () => {
    if (usernameResetTimer.current) clearTimeout(usernameResetTimer.current);
    if (emailResetTimer.current) clearTimeout(emailResetTimer.current);
  }, []);

  const triggerSuccess = useCallback((key: SuccessKey) => {
    setSuccessCounters((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  }, []);

  const validateUsername = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return t('profile.validation.usernameRequired', 'Username cannot be empty');
      if (trimmed.length < 2) return t('profile.validation.usernameMin', 'Username must be at least 2 characters');
      return null;
    },
    [t]
  );

  const validateEmail = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return t('profile.validation.emailRequired', 'Email cannot be empty');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return t('profile.validation.emailInvalid', 'Enter a valid email address');
      return null;
    },
    [t]
  );

  const validatePasswordForm = useCallback(() => {
    if (!currentPassword.trim()) {
      return t('profile.validation.passwordCurrent', 'Enter your current password');
    }
    if (newPassword.length < 8) {
      return t('profile.validation.passwordLength', 'New password must be at least 8 characters');
    }
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9\s]/.test(newPassword);
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return t(
        'profile.validation.passwordComplexity',
        'Password must include uppercase, lowercase, number, and special character'
      );
    }
    if (newPassword !== confirmPassword) {
      return t('profile.validation.passwordMismatch', 'Passwords do not match');
    }
    if (newPassword === currentPassword) {
      return t('profile.validation.passwordDifferent', 'Choose a different password');
    }
    return null;
  }, [confirmPassword, currentPassword, newPassword, t]);

  useEffect(() => {
    if (usernameError) {
      const error = validateUsername(usernameDraft);
      if (!error) setUsernameError(null);
    }
  }, [usernameDraft, usernameError, validateUsername]);

  useEffect(() => {
    if (emailError) {
      const error = validateEmail(emailDraft);
      if (!error) setEmailError(null);
    }
  }, [emailDraft, emailError, validateEmail]);

  useEffect(() => {
    if (passwordError) {
      const error = validatePasswordForm();
      if (!error) setPasswordError(null);
    }
  }, [passwordError, validatePasswordForm]);

  const ensureMediaPermission = useCallback(async () => {
    if (mediaPermission?.granted) return true;
    const response = await requestMediaPermission();
    if (response?.granted) return true;
    Alert.alert(
      t('profile.alerts.permissionTitle', 'Permission needed'),
      t(
        'profile.alerts.permissionMessage',
        'Please allow access to your photo library to pick an avatar.'
      )
    );
    return false;
  }, [mediaPermission?.granted, requestMediaPermission, t]);

  const buildAvatarFormData = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset.uri) {
        throw new Error(t('profile.alerts.imageMissing', 'Image file is missing a URI.'));
      }

      const formData = new FormData();
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const extension = mimeType.split('/').pop() || 'jpg';
      const fileName = asset.fileName ?? `avatar.${extension}`;

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        if (!response.ok) {
          throw new Error(
            t('profile.alerts.uploadReadFailed', 'Unable to read the selected file for upload.')
          );
        }
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any);
      }

      return formData;
    },
    [t]
  );

  const handleUploadSelectedAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset) return;
      if (!user) {
        Alert.alert(
          t('profile.alerts.unavailableTitle', 'Unavailable'),
          t('profile.alerts.avatarLoginRequired', 'Sign in to update your avatar.')
        );
        return;
      }

      try {
        setIsSavingAvatar(true);
        const formData = await buildAvatarFormData(asset);
        const { avatarUrl: uploadedUrl } = await uploadAvatar(formData);
        setPreviewUri(uploadedUrl);
        setUser({ ...user, avatarUrl: uploadedUrl });
        triggerSuccess('avatar');
      } catch (error) {
        console.error('Avatar upload error:', error);
        const fallback = t('profile.alerts.avatarUpdateFailed', 'Could not update the avatar.');
        const message = error instanceof Error && error.message ? error.message : fallback;
        Alert.alert(t('common.error', 'Error'), message);
      } finally {
        setIsSavingAvatar(false);
      }
    },
    [buildAvatarFormData, setUser, t, triggerSuccess, user]
  );

  const handlePickFromLibrary = useCallback(async () => {
    const allowed = await ensureMediaPermission();
    if (!allowed) return;
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleUploadSelectedAsset(result.assets[0]);
    }
  }, [ensureMediaPermission, handleUploadSelectedAsset]);

  const handleResetAvatar = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.avatarLoginRequired', 'Sign in to update your avatar.')
      );
      return;
    }
    try {
      setIsResettingAvatar(true);
      try {
        const updatedUser = await resetAvatar();
        setUser(updatedUser);
        setPreviewUri(updatedUser.avatarUrl ?? null);
      } catch (apiError) {
        console.warn('Reset avatar API unavailable, falling back to local reset.', apiError);
        setUser({ ...user, avatarUrl: null });
        setPreviewUri(null);
      }
      triggerSuccess('avatar');
    } catch (error) {
      console.error('Reset avatar error:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.alerts.avatarResetFailed', 'Could not reset the avatar.')
      );
    } finally {
      setIsResettingAvatar(false);
    }
  }, [setUser, t, triggerSuccess, user]);

  const handleCopy = useCallback(
    async (label: string, value: string | null | undefined) => {
      if (!value) {
        Alert.alert(
          t('profile.alerts.unavailableTitle', 'Unavailable'),
          t('profile.copy.unavailableMessage', {
            field: label,
            defaultValue: `${label} is not available yet.`,
          })
        );
        return;
      }
      await Clipboard.setStringAsync(value);
      Alert.alert(
        t('profile.copy.successTitle', 'Copied'),
        t('profile.copy.successMessage', {
          field: label,
          defaultValue: `${label} copied to the clipboard.`,
        })
      );
    },
    [t]
  );

  const handleSaveUsername = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.profileLoginRequired', 'Sign in to update your profile.')
      );
      return;
    }

    const issue = validateUsername(usernameDraft);
    setUsernameError(issue);
    if (issue) return;

    const trimmed = usernameDraft.trim();
    if (trimmed === (user.username ?? '')) {
      setIsEditingUsername(false);
      return;
    }

    try {
      setUsernameStatus('saving');
      const updatedUser = await updateUsername({ username: trimmed });
      setUser(updatedUser);
      setUsernameStatus('success');
      setIsEditingUsername(false);
      if (usernameResetTimer.current) clearTimeout(usernameResetTimer.current);
      usernameResetTimer.current = setTimeout(() => setUsernameStatus('idle'), 1600);
    } catch (error) {
      console.error('Username update failed:', error);
      const fallback = t('profile.alerts.usernameUpdateFailed', 'Could not update the username.');
      const message = error instanceof Error && error.message ? error.message : fallback;
      Alert.alert(t('common.error', 'Error'), message);
      setUsernameStatus('idle');
    }
  }, [setUser, t, user, usernameDraft, validateUsername]);

  const handleSaveEmail = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.profileLoginRequired', 'Sign in to update your profile.')
      );
      return;
    }

    const issue = validateEmail(emailDraft);
    setEmailError(issue);
    if (issue) return;

    const trimmed = emailDraft.trim();
    if (trimmed.toLowerCase() === (user.email ?? '').toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    try {
      setEmailStatus('saving');
      const updatedUser = await updateEmail({ email: trimmed });
      setUser(updatedUser);
      setEmailStatus('success');
      setIsEditingEmail(false);
      if (emailResetTimer.current) clearTimeout(emailResetTimer.current);
      emailResetTimer.current = setTimeout(() => setEmailStatus('idle'), 1600);
    } catch (error) {
      console.error('Email update failed:', error);
      const fallback = t('profile.alerts.emailUpdateFailed', 'Could not update the email.');
      const message = error instanceof Error && error.message ? error.message : fallback;
      Alert.alert(t('common.error', 'Error'), message);
      setEmailStatus('idle');
    }
  }, [emailDraft, setUser, t, user, validateEmail]);

  const handleChangePassword = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.passwordLoginRequired', 'Sign in to change your password.')
      );
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
      triggerSuccess('password');
    } catch (err) {
      console.error('Password change failed:', err);
      const fallback = t('profile.alerts.passwordChangeFailed', 'Could not change the password.');
      const message = err instanceof Error && err.message ? err.message : fallback;
      Alert.alert(t('common.error', 'Error'), message);
    } finally {
      setIsChangingPassword(false);
    }
  }, [
    changePassword,
    confirmPassword,
    currentPassword,
    newPassword,
    t,
    triggerSuccess,
    user,
    validatePasswordForm,
  ]);

  const handleLogout = useCallback(() => {
    logout()
      .then(() => router.replace({ pathname: '/' }))
      .catch(() =>
        Alert.alert(
          t('common.error', 'Error'),
          t('profile.alerts.logoutFailed', 'Could not log out. Please try again.')
        )
      );
  }, [logout, router, t]);

  const isResetDisabled = isResettingAvatar || (!user?.avatarUrl && !previewUri);

  // Sub-screens conditional rendering
  if (activeSubScreen === 'edit') {
    return (
      <YStack f={1} bg="#F9FAFB">
        <View bg="#312E81" pt="$5" pb="$4" px="$4" borderBottomLeftRadius={24} borderBottomRightRadius={24}>
          <XStack ai="center" mt="$2">
            <Button
              onPress={() => setActiveSubScreen(null)}
              circular
              size="$3.5"
              bg="rgba(255,255,255,0.15)"
              pressStyle={{ bg: 'rgba(255,255,255,0.25)', scale: 0.95 }}
              borderWidth={0}
              icon={<ArrowLeft color="white" size={20} />}
            />
            <Text color="white" fontSize={22} fontWeight="700" ml="$3">
              {t('profile.info.editTitle', 'Edit Profile')}
            </Text>
          </XStack>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} f={1} bg="#F9FAFB" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          {/* Avatar Upload */}
          <SectionCard
            title={avatarTitle}
            icon={<Upload size={18} color="#312E81" />}
            successTrigger={successCounters.avatar}
          >
            <YStack ai="center" gap="$3">
              <UserAvatar
                uri={previewUri ?? undefined}
                label={displayName.slice(0, 1).toUpperCase()}
                size={96}
                textSize={34}
                backgroundColor="#4E788F"
              />
              <Text fontSize={12} color="$gray10" textAlign="center">
                {avatarHint}
              </Text>
              <XStack gap="$2" w="100%">
                <Button
                  flex={1}
                  size="$3.5"
                  bg="#312E81"
                  color="white"
                  pressStyle={{ bg: '#1E1B4B' }}
                  icon={<Upload size={16} color="white" />}
                  disabled={isSavingAvatar}
                  onPress={handlePickFromLibrary}
                >
                  <Text color="white" fontWeight="600">{isSavingAvatar ? avatarUploadingLabel : avatarUploadLabel}</Text>
                </Button>
                <Button
                  flex={1}
                  size="$3.5"
                  variant="outlined"
                  icon={<RotateCcw size={16} color="$gray11" />}
                  disabled={isResetDisabled}
                  onPress={handleResetAvatar}
                >
                  {isResettingAvatar ? avatarResettingLabel : avatarResetLabel}
                </Button>
              </XStack>
            </YStack>
          </SectionCard>

          {/* User Info */}
          <SectionCard title={userInfoTitle} icon={<UserIcon size={18} color="#312E81" />}>
            <EditableFieldRow
              label={usernameLabel}
              value={user?.username ?? ''}
              draft={usernameDraft}
              setDraft={setUsernameDraft}
              placeholder={usernamePlaceholder}
              isEditing={isEditingUsername}
              onStartEdit={() => setIsEditingUsername(true)}
              onCancelEdit={() => {
                setUsernameDraft(user?.username ?? '');
                setIsEditingUsername(false);
                setUsernameError(null);
              }}
              onSave={handleSaveUsername}
              status={usernameStatus}
              error={usernameError}
              onCopy={() => handleCopy(usernameLabel, user?.username)}
            />
            <Separator />
            <EditableFieldRow
              label={emailLabel}
              value={user?.email ?? ''}
              draft={emailDraft}
              setDraft={setEmailDraft}
              placeholder={emailPlaceholder}
              isEditing={isEditingEmail}
              onStartEdit={() => setIsEditingEmail(true)}
              onCancelEdit={() => {
                setEmailDraft(user?.email ?? '');
                setIsEditingEmail(false);
                setEmailError(null);
              }}
              onSave={handleSaveEmail}
              status={emailStatus}
              error={emailError}
              onCopy={() => handleCopy(emailLabel, user?.email)}
              textInputProps={{ keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false }}
            />
            <Separator />
            <InfoRow
              label={userIdLabel}
              value={userId || notAvailableLabel}
              onCopy={() => handleCopy(userIdLabel, userId)}
            />
          </SectionCard>
        </ScrollView>
      </YStack>
    );
  }

  if (activeSubScreen === 'settings') {
    return (
      <YStack f={1} bg="#F9FAFB">
        <View bg="#312E81" pt="$5" pb="$4" px="$4" borderBottomLeftRadius={24} borderBottomRightRadius={24}>
          <XStack ai="center" mt="$2">
            <Button
              onPress={() => setActiveSubScreen(null)}
              circular
              size="$3.5"
              bg="rgba(255,255,255,0.15)"
              pressStyle={{ bg: 'rgba(255,255,255,0.25)', scale: 0.95 }}
              borderWidth={0}
              icon={<ArrowLeft color="white" size={20} />}
            />
            <Text color="white" fontSize={22} fontWeight="700" ml="$3">
              {t('settings.title', 'Settings')}
            </Text>
          </XStack>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} f={1} bg="#F9FAFB" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          {/* Language */}
          <SectionCard
            title={t('settings.language.title', 'Language')}
            icon={<Languages size={18} color="#312E81" />}
          >
            <YStack gap="$2">
              <Text fontSize={12} color="$gray9">
                {t('settings.language.description', 'Choose the language used across the app.')}
              </Text>

              <LanguageSegmentedControl
                value={language}
                onChange={(code) => setLanguage(code)}
                getLabel={(code, fallback) => t(`settings.language.options.${code}`, fallback)}
              />
            </YStack>
          </SectionCard>

          {/* Password Change */}
          <SectionCard
            title={passwordTitle}
            icon={<Lock size={18} color="#312E81" />}
            successTrigger={successCounters.password}
          >
            <YStack gap="$3">
              <PasswordInput
                label={currentPasswordLabel}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={currentPasswordPlaceholder}
                textInputProps={{ returnKeyType: 'next' }}
              />
              <PasswordInput
                label={newPasswordLabel}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={newPasswordPlaceholder}
                textInputProps={{ returnKeyType: 'next' }}
              />
              <Text fontSize={12} color="$gray10">
                {passwordRequirements}
              </Text>
              <PasswordInput
                label={confirmPasswordLabel}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={confirmPasswordPlaceholder}
                error={passwordError || undefined}
                textInputProps={{ returnKeyType: 'done' }}
              />
              <Button
                size="$4"
                bg="#312E81"
                color="white"
                pressStyle={{ bg: '#1E1B4B' }}
                disabled={isChangingPassword}
                onPress={handleChangePassword}
                br={12}
              >
                <Text color="white" fontWeight="700">
                  {isChangingPassword ? passwordUpdatingLabel : passwordSubmitLabel}
                </Text>
              </Button>
            </YStack>
          </SectionCard>
        </ScrollView>
      </YStack>
    );
  }

  if (activeSubScreen === 'help') {
    return (
      <YStack f={1} bg="#F9FAFB">
        <View bg="#312E81" pt="$5" pb="$4" px="$4" borderBottomLeftRadius={24} borderBottomRightRadius={24}>
          <XStack ai="center" mt="$2">
            <Button
              onPress={() => setActiveSubScreen(null)}
              circular
              size="$3.5"
              bg="rgba(255,255,255,0.15)"
              pressStyle={{ bg: 'rgba(255,255,255,0.25)', scale: 0.95 }}
              borderWidth={0}
              icon={<ArrowLeft color="white" size={20} />}
            />
            <Text color="white" fontSize={22} fontWeight="700" ml="$3">
              {t('profile.help.title', 'Help & Support')}
            </Text>
          </XStack>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} f={1} bg="#F9FAFB" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <Card bg="white" br={16} p="$4" bw={0.5} bc="#E5E7EB" shadowOpacity={0}>
            <YStack gap="$3">
              <Text fontSize={18} fontWeight="700" color="#1A1A1A">
                Splitter App Support
              </Text>
              <Text fontSize={14} color="#4B5563" lh={20}>
                Welcome to Splitter! If you need any assistance with splitting receipts, managing groups, or adding friends, please feel free to reach out.
              </Text>
              <Separator />
              <YStack gap="$1.5">
                <Text fontSize={13} color="#6B7280">
                  Support Email
                </Text>
                <Text fontSize={15} fontWeight="600" color="#312E81">
                  support@splitter.io
                </Text>
              </YStack>
              <YStack gap="$1.5">
                <Text fontSize={13} color="#6B7280">
                  Version
                </Text>
                <Text fontSize={15} fontWeight="600" color="#1A1A1A">
                  1.0.0 (Production)
                </Text>
              </YStack>
            </YStack>
          </Card>
        </ScrollView>
      </YStack>
    );
  }

  // Main Dashboard View (activeSubScreen === null)
  return (
    <YStack f={1} bg="#F9FAFB">
      {/* Curved Blue Header */}
      <View
        bg="#312E81"
        pt="$5"
        pb="$6"
        px="$4"
        borderBottomLeftRadius={30}
        borderBottomRightRadius={30}
      >
        <Text color="white" fontSize={32} fontWeight="800" mt="$2">
          {t('profile.title', 'Profile')}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        f={1}
        bg="#F9FAFB"
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Profile Summary Card */}
        <Card
          bg="white"
          br={18}
          p="$4"
          mx="$4"
          mt={-24}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.01}
          shadowRadius={6}
          bw={0.5}
          bc="#E5E7EB"
          gap="$3.5"
        >
          <XStack ai="center" gap="$4">
            {previewUri ? (
              <UserAvatar
                uri={previewUri}
                label={displayName.slice(0, 1).toUpperCase()}
                size={68}
                textSize={24}
                backgroundColor="#4E788F"
              />
            ) : (
              <View
                w={68}
                h={68}
                br={34}
                bg="#4E788F"
                ai="center"
                jc="center"
              >
                <Text fontSize={26} fontWeight="800" color="white">
                  {displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}

            <YStack>
              <Text fontSize={20} fontWeight="800" color="#1A1A1A">
                {displayName}
              </Text>
              <Text fontSize={14} color="#6B7280" mt="$1">
                {joinDateLabel}
              </Text>
            </YStack>
          </XStack>
        </Card>

        {/* Stats Row */}
        <XStack gap="$3" px="$4" mt="$4" jc="space-between">
          <View
            f={1}
            bg="#F5F6F8"
            br={16}
            p="$3"
            ai="center"
            jc="center"
            bw={0.5}
            bc="#E5E7EB"
          >
            <Text fontSize={22} fontWeight="800" color="#312E81">
              {groups.length}
            </Text>
            <Text fontSize={13} color="#6B7280" mt="$1">
              Groups
            </Text>
          </View>

          <View
            f={1}
            bg="#F5F6F8"
            br={16}
            p="$3"
            ai="center"
            jc="center"
            bw={0.5}
            bc="#E5E7EB"
          >
            <Text fontSize={22} fontWeight="800" color="#312E81">
              {expensesCount}
            </Text>
            <Text fontSize={13} color="#6B7280" mt="$1">
              Expenses
            </Text>
          </View>

          <View
            f={1}
            bg="#F5F6F8"
            br={16}
            p="$3"
            ai="center"
            jc="center"
            bw={0.5}
            bc="#E5E7EB"
          >
            <Text fontSize={22} fontWeight="800" color="#312E81">
              {friends.length}
            </Text>
            <Text fontSize={13} color="#6B7280" mt="$1">
              Friends
            </Text>
          </View>
        </XStack>

        {/* User Information Card */}
        <Card
          bg="white"
          br={18}
          p="$4"
          mx="$4"
          mt="$4"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.01}
          shadowRadius={6}
          bw={0.5}
          bc="#E5E7EB"
          gap="$3.5"
        >
          {/* Header */}
          <XStack ai="center" gap="$2" mb="$1">
            <UserIcon size={18} color="#6B7280" />
            <Text fontSize={16} fontWeight="700" color="#1A1A1A">
              User information
            </Text>
          </XStack>

          {/* Username Field */}
          <YStack gap="$1">
            <XStack jc="space-between" ai="center">
              <Text fontSize={13} color="#9CA3AF" fontWeight="500">
                Username
              </Text>
              <XStack gap="$2">
                <Button
                  unstyled
                  onPress={() => handleCopy('Username', user?.username)}
                  flexDirection="row"
                  ai="center"
                  gap="$1.5"
                  bw={1}
                  bc="#E5E7EB"
                  br={8}
                  px="$2.5"
                  py="$1.5"
                  bg="white"
                  pressStyle={{ bg: '#F9FAFB' }}
                >
                  <Copy size={13} color="#374151" />
                  <Text fontSize={12} fontWeight="600" color="#374151">Copy</Text>
                </Button>
                <Button
                  unstyled
                  onPress={() => setActiveSubScreen('edit')}
                  ai="center"
                  jc="center"
                  bw={1}
                  bc="#E5E7EB"
                  br={8}
                  px="$2.5"
                  py="$1.5"
                  bg="white"
                  pressStyle={{ bg: '#F9FAFB' }}
                >
                  <Edit3 size={13} color="#374151" />
                </Button>
              </XStack>
            </XStack>
            <View bg="#F5F6F8" br={10} p="$3" mt="$1">
              <Text fontSize={15} fontWeight="600" color="#1A1A1A">
                {user?.username || '—'}
              </Text>
            </View>
          </YStack>

          <Separator bc="#F3F4F6" />

          {/* Email Field */}
          <YStack gap="$1">
            <XStack jc="space-between" ai="center">
              <Text fontSize={13} color="#9CA3AF" fontWeight="500">
                Email
              </Text>
              <XStack gap="$2">
                <Button
                  unstyled
                  onPress={() => handleCopy('Email', user?.email)}
                  flexDirection="row"
                  ai="center"
                  gap="$1.5"
                  bw={1}
                  bc="#E5E7EB"
                  br={8}
                  px="$2.5"
                  py="$1.5"
                  bg="white"
                  pressStyle={{ bg: '#F9FAFB' }}
                >
                  <Copy size={13} color="#374151" />
                  <Text fontSize={12} fontWeight="600" color="#374151">Copy</Text>
                </Button>
                <Button
                  unstyled
                  onPress={() => setActiveSubScreen('edit')}
                  ai="center"
                  jc="center"
                  bw={1}
                  bc="#E5E7EB"
                  br={8}
                  px="$2.5"
                  py="$1.5"
                  bg="white"
                  pressStyle={{ bg: '#F9FAFB' }}
                >
                  <Edit3 size={13} color="#374151" />
                </Button>
              </XStack>
            </XStack>
            <View bg="#F5F6F8" br={10} p="$3" mt="$1">
              <Text fontSize={15} fontWeight="600" color="#1A1A1A">
                {user?.email || '—'}
              </Text>
            </View>
          </YStack>

          <Separator bc="#F3F4F6" />

          {/* User ID Field */}
          <YStack gap="$1">
            <XStack jc="space-between" ai="center">
              <Text fontSize={13} color="#9CA3AF" fontWeight="500">
                User ID
              </Text>
              <Button
                unstyled
                onPress={() => handleCopy('User ID', userId)}
                flexDirection="row"
                ai="center"
                gap="$1.5"
                bw={1}
                bc="#E5E7EB"
                br={8}
                px="$2.5"
                py="$1.5"
                bg="white"
                pressStyle={{ bg: '#F9FAFB' }}
              >
                <Copy size={13} color="#374151" />
                <Text fontSize={12} fontWeight="600" color="#374151">Copy</Text>
              </Button>
            </XStack>
            <View bg="#F5F6F8" br={10} p="$3" mt="$1">
              <Text fontSize={15} fontWeight="600" color="#1A1A1A">
                {userId ? (userId.startsWith('#') ? userId : `#${userId}`) : '—'}
              </Text>
            </View>
          </YStack>
        </Card>

        {/* Menu Items List */}
        <YStack gap="$3" px="$4" mt="$4">
          <MenuItem
            label={t('profile.menu.edit', 'Edit Profile')}
            icon={<UserIcon size={18} color="#312E81" />}
            iconBg="rgba(49, 46, 129, 0.08)"
            onPress={() => setActiveSubScreen('edit')}
          />
          <MenuItem
            label={t('profile.menu.settings', 'Settings')}
            icon={<SettingsIcon size={18} color="#312E81" />}
            iconBg="rgba(49, 46, 129, 0.08)"
            onPress={() => setActiveSubScreen('settings')}
          />
          <MenuItem
            label={t('profile.menu.help', 'Help & Support')}
            icon={<HelpCircle size={18} color="#312E81" />}
            iconBg="rgba(49, 46, 129, 0.08)"
            onPress={() => setActiveSubScreen('help')}
          />
          <MenuItem
            label={logoutLabel}
            icon={<LogOut size={18} color="#EF4444" />}
            iconBg="#FEF2F2"
            onPress={handleLogout}
            textColor="#EF4444"
            hideChevron
          />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
