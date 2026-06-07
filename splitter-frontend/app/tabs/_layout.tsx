// app/tabs/_layout.tsx

import React, { useCallback, useEffect, useMemo } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text, View } from 'tamagui';
import { Home, Settings, Bell, ChevronLeft, Users, Scan, Contact, User as UserIcon } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAppStore } from '@/shared/lib/stores/app-store';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useFriendsStore } from '@/features/friends/model/friends.store';

// --- Reusable Badge Component ---
function DotBadge({ value }: { value?: number }) {
  if (!value || value <= 0) return null;
  return (
    <View
      position="absolute"
      top={-4} right={-4}
      w={20} h={20}
      br={999}
      ai="center" jc="center"
      backgroundColor="#2ECC71"
    >
      <Text color="white" fontSize={10} fontWeight="700">
        {value}
      </Text>
    </View>
  );
}

// --- Global Header for all Tabs ---
function GlobalTabsHeader(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAppStore();
  const fetchAll = useFriendsStore((s) => s.fetchAll);
  const { t } = useTranslation();
  const routeName = props?.route?.name ?? '';
  const showHomeShortcut =
    routeName === 'profile' ||
    routeName.startsWith('friends') ||
    routeName.startsWith('groups') ||
    routeName.startsWith('sessions');
  const onBackToHome = () => router.replace({ pathname: '/tabs' });

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchAll();
    });
    return () => sub.remove();
  }, [fetchAll]);

  const requestsCount = useFriendsStore((s) => s.requestsRaw?.incoming?.length ?? 0);
  const displayName = user?.username || t('profile.labels.guest', 'Guest');
  const userInitial = displayName.slice(0, 1).toUpperCase();

  const handleOpenProfile = useCallback(() => {
    router.push({ pathname: '/tabs/profile' });
  }, [router]);

  return (
    <YStack bg="$background" pt={insets.top}>
      <XStack h={50} ai="center" jc="space-between" px="$4">
        <XStack ai="center" gap="$2">
          {showHomeShortcut && (
            <Pressable onPress={onBackToHome} hitSlop={10}>
              <XStack ai="center" gap="$1">
                <ChevronLeft size={20} color="$gray11" />
                <Text fontSize={14} color="$gray11">
                  {t('navigation.mainMenu', 'Main menu')}
                </Text>
              </XStack>
            </Pressable>
          )}
          <Text fontSize={18} fontWeight="600" numberOfLines={1} miw={150}>
            {props.options.title}
          </Text>
        </XStack>

        <XStack ai="center" gap="$3">
          <Pressable onPress={() => router.push('/tabs/friends/requests')}>
            <View>
              <Bell size={22} color="$gray11" />
              <DotBadge value={requestsCount} />
            </View>
          </Pressable>

          <Pressable onPress={handleOpenProfile} hitSlop={10}>
            <UserAvatar uri={user?.avatarUrl ?? undefined} label={userInitial} size={36} textSize={14} />
          </Pressable>
        </XStack>
      </XStack>
    </YStack>
  );
}

function CustomTabBar({ state }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Find active route index based on active route name
  const currentRouteName = state.routes[state.index]?.name || '';

  const activeIndex = useMemo(() => {
    if (currentRouteName === 'index') return 0;
    if (currentRouteName.startsWith('groups')) return 1;
    if (currentRouteName.startsWith('scan-receipt')) return 2;
    if (currentRouteName.startsWith('friends')) return 3;
    if (currentRouteName.startsWith('profile')) return 4;
    return 0;
  }, [currentRouteName]);

  const tabs = [
    { key: 'home', label: 'Home', route: '/tabs', icon: Home },
    { key: 'groups', label: 'Groups', route: '/tabs/groups', icon: Users },
    { key: 'scan', label: 'Scan', route: '/tabs/scan-receipt', icon: Scan, isSpecial: true },
    { key: 'contacts', label: 'Contacts', route: '/tabs/friends', icon: Contact },
    { key: 'profile', label: 'Profile', route: '/tabs/profile', icon: UserIcon },
  ];

  return (
    <XStack
      bg="white"
      pt="$2.5"
      pb={Math.max(insets.bottom, 12)}
      px="$2"
      borderTopWidth={1}
      borderTopColor="#F3F4F6"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: -4 }}
      shadowOpacity={0.03}
      shadowRadius={8}
      elevation={8}
      jc="space-between"
      ai="center"
    >
      {tabs.map((tab, idx) => {
        const isActive = activeIndex === idx;
        const Icon = tab.icon;
        const activeColor = '#312E81';
        const inactiveColor = '#9CA3AF';

        if (tab.isSpecial) {
          return (
            <Pressable
              key={tab.key}
              onPress={() => router.push(tab.route as any)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <YStack ai="center" gap="$1" mt={-4}>
                <View
                  w={48}
                  h={48}
                  br={24}
                  bg="rgba(49, 46, 129, 0.08)"
                  ai="center"
                  jc="center"
                  pressStyle={{ scale: 0.95 }}
                >
                  <Icon size={26} color={activeColor} />
                </View>
                <View w={4} h={4} br={2} bg={isActive ? activeColor : 'transparent'} />
              </YStack>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={tab.key}
            onPress={() => router.push(tab.route as any)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <YStack ai="center" gap="$1">
              <Icon size={22} color={isActive ? activeColor : inactiveColor} />
              <Text
                fontSize={12}
                fontWeight={isActive ? '700' : '500'}
                color={isActive ? activeColor : inactiveColor}
              >
                {tab.label}
              </Text>
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}

export default function TabLayout() {
  const { user } = useAppStore();
  const { t } = useTranslation();

  const greetingName = user?.username || t('home.header.friendFallback', 'friend');
  const homeTitle = t('home.header.greeting', { name: greetingName });
  const homeLabel = t('navigation.tabs.home', 'Home');
  const settingsTitle = t('navigation.tabs.settings', 'Settings');
  const profileTitle = t('profile.title', 'Profile');
  const groupsTitle = t('navigation.groups.title', 'Groups');
  const newGroupTitle = t('navigation.groups.create', 'New group');
  const groupDetailsTitle = t('navigation.groups.details', 'Group');
  const scanInviteTitle = t('navigation.scanInvite', 'Scan Invite');
  const friendQrTitle = t('navigation.friendQr', 'My Friend QR');
  const groupQrTitle = t('navigation.groupQr', 'Group QR');
  const scanReceiptTitle = t('navigation.scanReceipt', 'Scan Receipt');
  const participantsTitle = t('navigation.participants', 'Participants');
  const itemsSplitTitle = t('navigation.itemsSplit', 'Items Split');
  const finishTitle = t('navigation.finish', 'Finish');
  const historyTitle = t('navigation.history', 'Recent bills');
  const historyDetailsTitle = t('navigation.historyDetails', 'Bill details');

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        header: (props) => <GlobalTabsHeader {...props} />,
      }}
    >
      {/* 5 Main Tab Screens */}
      <Tabs.Screen
        name="index"
        options={{
          title: homeTitle,
          tabBarLabel: homeLabel,
        }}
      />
      <Tabs.Screen
        name="groups/index"
        options={{
          title: groupsTitle,
        }}
      />
      <Tabs.Screen
        name="scan-receipt"
        options={{
          title: scanReceiptTitle,
        }}
      />
      <Tabs.Screen
        name="friends/index"
        options={{
          title: t('friends.title', 'Friends'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: profileTitle,
        }}
      />

      {/* Hidden Sub-routes */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: settingsTitle,
        }}
      />
      <Tabs.Screen name="friends/search" options={{ href: null, title: t('friends.search', 'Search') }} />
      <Tabs.Screen name="friends/requests" options={{ href: null, title: t('friends.requests', 'Requests') }} />
      <Tabs.Screen name="groups/create"  options={{ href: null, title: newGroupTitle }} />
      <Tabs.Screen name="groups/[groupId]" options={{ href: null, title: groupDetailsTitle }} />

      <Tabs.Screen name="scan-invite" options={{ href: null, title: scanInviteTitle }} />
      <Tabs.Screen name="friends/invite" options={{ href: null, title: friendQrTitle }} />
      <Tabs.Screen name="groups/invite" options={{ href: null, title: groupQrTitle }} />

      <Tabs.Screen name="sessions/participants" options={{ href: null, title: participantsTitle }} />
      <Tabs.Screen name="sessions/items-split" options={{ href: null, title: itemsSplitTitle }} />
      <Tabs.Screen name="sessions/finish" options={{ href: null, title: finishTitle }} />
      <Tabs.Screen name="sessions/history/index" options={{ href: null, title: historyTitle }} />
      <Tabs.Screen name="sessions/history/[historyId]" options={{ href: null, title: historyDetailsTitle }} />
    </Tabs>
  );
}
