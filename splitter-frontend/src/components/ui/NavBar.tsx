import React from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { XStack, YStack, Text, View } from 'tamagui';
import { Home, Users, ScanLine, BookUser, User } from '@tamagui/lucide-icons';

interface NavBarProps {
  currentRouteName: string;
}

export function NavBar({ currentRouteName }: NavBarProps) {
  const router = useRouter();

  const getActiveIndex = () => {
    if (currentRouteName === 'index' || currentRouteName === '/tabs' || currentRouteName === 'tabs') return 0;
    if (currentRouteName.startsWith('groups')) return 1;
    if (currentRouteName.startsWith('scan') || currentRouteName.includes('scan-check')) return 2;
    if (currentRouteName.includes('contacts')) return 3;
    if (currentRouteName.includes('profile')) return 4;
    return 0;
  };

  const activeIndex = getActiveIndex();

  const tabs = [
    { key: 'home', label: 'Home', route: '/tabs', icon: Home },
    { key: 'groups', label: 'Groups', route: '/tabs/groups', icon: Users },
    { key: 'scan', label: 'Scan', route: '/modals/scan-check', icon: ScanLine, isSpecial: true },
    { key: 'contacts', label: 'Contacts', route: '/tabs/friends', icon: BookUser },
    { key: 'profile', label: 'Profile', route: '/tabs/profile', icon: User },
  ];

  return (
    <XStack
      backgroundColor="rgba(10, 10, 15, 0.92)"
      pt="$2.5"
      pb="$4"
      px="$2"
      borderTopWidth={0.5}
      borderTopColor="rgba(255, 255, 255, 0.09)"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: -4 }}
      shadowOpacity={0.05}
      shadowRadius={10}
      elevation={8}
      justifyContent="space-between"
      alignItems="center"
    >
      {tabs.map((tab, idx) => {
        const isActive = activeIndex === idx;
        const Icon = tab.icon;
        const activeColor = '#7c4dff';
        const inactiveColor = 'rgba(255, 255, 255, 0.45)';

        if (tab.isSpecial) {
          return (
            <Pressable
              key={tab.key}
              onPress={() => router.push(tab.route as any)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <YStack alignItems="center" marginTop={-4}>
                <View
                  width={48}
                  height={48}
                  borderRadius={24}
                  backgroundColor="#7c4dff"
                  alignItems="center"
                  justifyContent="center"
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
              alignItems="center"
              gap="$1"
              px="$3"
              py="$1.5"
              borderRadius={14}
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
    </XStack>
  );
}

export default NavBar;
