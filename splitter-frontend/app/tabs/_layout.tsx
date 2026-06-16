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
import { BlurView } from 'expo-blur';

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


function CustomTabBar({ state }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  // Find active route name
  const currentRouteName = state.routes[state.index]?.name || '';

  // Only show the tab bar on the main 4 root tabs
  const visibleRoutes = ['index', 'groups/index', 'friends/index', 'profile'];
  if (!visibleRoutes.includes(currentRouteName)) {
    return null;
  }

  const activeIndex = useMemo(() => {
    if (currentRouteName === 'index') return 0;
    if (currentRouteName.startsWith('groups')) return 1;
    if (currentRouteName.startsWith('scan-receipt')) return 2;
    if (currentRouteName.startsWith('friends')) return 3;
    if (currentRouteName.startsWith('profile')) return 4;
    return 0;
  }, [currentRouteName]);

  const tabs = useMemo(() => [
    { key: 'home', label: t('navigation.tabs.home', 'Home'), route: '/tabs', icon: Home },
    { key: 'groups', label: t('navigation.groups.title', 'Groups'), route: '/tabs/groups', icon: Users },
    { key: 'scan', label: t('navigation.scanReceipt', 'Scan'), route: '/tabs/scan-receipt', icon: Scan, isSpecial: true },
    { key: 'contacts', label: t('friends.title', 'Contacts'), route: '/tabs/friends', icon: Contact },
    { key: 'profile', label: t('profile.title', 'Profile'), route: '/tabs/profile', icon: UserIcon },
  ], [t]);

  return (
    <View
      position="absolute"
      bottom={Math.max(insets.bottom, 12)}
      left={16}
      right={16}
      borderRadius={24}
      overflow="hidden"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
      } as any}
    >
      <BlurView
        intensity={80}
        tint="dark"
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(10, 10, 15, 0.65)',
          paddingTop: 10,
          paddingBottom: 10,
          paddingHorizontal: 8,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
      {tabs.map((tab, idx) => {
        const isActive = activeIndex === idx;
        const Icon = tab.icon;
        const activeColor = '#7c4dff';
        const inactiveColor = 'rgba(255,255,255,0.4)';

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
                  backgroundColor="#7c4dff"
                  ai="center"
                  jc="center"
                  pressStyle={{ scale: 0.95 }}
                  style={{
                    shadowColor: '#7c4dff',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 5,
                  }}
                >
                  <Icon size={24} color="white" />
                </View>
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
            <YStack
              ai="center"
              gap="$1"
              px="$3"
              py="$1.5"
              br={14}
              backgroundColor={isActive ? 'rgba(124, 77, 255, 0.14)' : 'transparent'}
            >
              <Icon size={20} color={isActive ? activeColor : inactiveColor} />
              <Text
                fontSize={11}
                fontWeight={isActive ? '700' : '500'}
                color={isActive ? activeColor : inactiveColor}
              >
                {tab.label}
              </Text>
            </YStack>
          </Pressable>
        );
      })}
      </BlurView>
    </View>
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
        headerShown: false,
      }}
    >
      {/* 5 Main Tab Screens */}
      <Tabs.Screen
        name="index"
        options={{
          title: homeTitle,
          tabBarLabel: homeLabel,
          headerShown: false,
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
          headerShown: false,
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
