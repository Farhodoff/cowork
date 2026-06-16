import React from 'react';
import { useRouter } from 'expo-router';
import { XStack, Text, View, Button } from 'tamagui';
import { ChevronLeft, Bell } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import UserAvatar from '@/shared/ui/UserAvatar';

interface TopBarProps {
  title: string;
  backLabel?: string;
  showBell?: boolean;
  showAvatar?: boolean;
}

export function TopBar({
  title,
  backLabel,
  showBell = false,
  showAvatar = false,
}: TopBarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tabs' as any);
    }
  };

  const displayName = user?.username || user?.name || 'Guest';
  const userInitial = displayName.slice(0, 1).toUpperCase();

  return (
    <XStack
      height={56 + insets.top}
      paddingTop={insets.top}
      alignItems="center"
      justifyContent="space-between"
      px="$4"
      backgroundColor="transparent"
    >
      {/* Left Side: Back action or blank spacing */}
      <XStack alignItems="center" width="25%">
        {router.canGoBack() ? (
          <Button
            chromeless
            padding={0}
            height={40}
            onPress={handleBack}
            icon={<ChevronLeft size={24} color="rgba(255, 255, 255, 0.88)" />}
          >
            {backLabel && (
              <Text color="rgba(255, 255, 255, 0.45)" fontSize={14} fontWeight="500" marginLeft="$1">
                {backLabel}
              </Text>
            )}
          </Button>
        ) : null}
      </XStack>

      {/* Middle: Title */}
      <XStack flex={1} justifyContent="center" alignItems="center">
        <Text
          fontFamily="$heading"
          fontSize={18}
          fontWeight="700"
          color="rgba(255, 255, 255, 0.88)"
          numberOfLines={1}
          textAlign="center"
        >
          {title}
        </Text>
      </XStack>

      {/* Right Side: Bell and/or Avatar */}
      <XStack space="$3.5" alignItems="center" justifyContent="flex-end" width="25%">
        {showBell && (
          <Button
            chromeless
            padding={0}
            height={40}
            width={40}
            alignItems="center"
            justifyContent="center"
            onPress={() => router.push('/modals/notifications' as any)}
            icon={<Bell size={22} color="rgba(255, 255, 255, 0.88)" />}
          />
        )}
        {showAvatar && (
          <View
            onPress={() => router.push('/tabs/profile' as any)}
            pressStyle={{ scale: 0.95 }}
          >
            <UserAvatar
              uri={user?.avatar ?? undefined}
              label={userInitial}
              size={32}
              textSize={12}
            />
          </View>
        )}
      </XStack>
    </XStack>
  );
}

export default TopBar;
