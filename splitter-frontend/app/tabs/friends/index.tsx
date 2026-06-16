import React, { useEffect, useState, useMemo } from 'react';
import { YStack, XStack, Paragraph, Input, ScrollView, Spinner, Separator, Text, View, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { Search, Bell } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { FriendListItem } from '@/features/friends/ui/FriendListItem';
import Fab from '@/shared/ui/Fab';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';


export default function FriendsScreen() {
  const { friends, loading, error, fetchAll, requestsRaw } = useFriendsStore();
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const requestsCount = requestsRaw?.incoming?.length ?? 0;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  const setReceiptItems = useReceiptSessionStore((s) => s.setItems);
  const setSessionName = useReceiptSessionStore((s) => s.setSessionName);
  const setSessionMeta = useReceiptSessionStore((s) => s.setSessionMeta);


  useEffect(() => {
    fetchAll();
  }, []);

  const filteredFriends = useMemo(() => {
    if (!searchQuery) {
      return friends;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return friends.filter(friend => {
      const title = (
        friend?.user?.displayName || friend?.user?.username || ''
      ).toLowerCase();
      const uniqueId = (friend?.user?.uniqueId || friend?.uniqueId || '').toLowerCase();
      return title.includes(lowerCaseQuery) || uniqueId.includes(lowerCaseQuery);
    });
  }, [friends, searchQuery]);

  if (loading && friends.length === 0) {
    return (
      <ScreenContainer>
        <Spinner size="large" color="$gray10" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer paddingHorizontal={0}>
      <XStack height={50} alignItems="center" justifyContent="space-between" px="$4" mb="$3">
        <Text fontSize={20} fontWeight="700" color="rgba(255,255,255,0.88)">
          {t('friends.title', 'Friends')}
        </Text>
        <Button
          onPress={() => router.push('/tabs/friends/requests' as never)}
          circular
          size="$3.5"
          bg="rgba(255,255,255,0.06)"
          pressStyle={{ bg: 'rgba(255,255,255,0.15)', scale: 0.95 }}
          borderWidth={0}
          icon={
            <View position="relative">
              <Bell color="rgba(255, 255, 255, 0.88)" size={20} />
              {requestsCount > 0 && (
                <View
                  position="absolute"
                  top={-2}
                  right={-2}
                  width={8}
                  height={8}
                  borderRadius={4}
                  backgroundColor="#ff4d4f"
                />
              )}
            </View>
          }
        />
      </XStack>

      <YStack f={1} px="$4">
        {/* Search Input */}
        <XStack position="relative" ai="center" mb="$4">
          <Input
            placeholder={t('friends.searchPlaceholder', 'Search friends...')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            f={1}
            h={44}
            pl={42}
            borderRadius={12}
            bg="rgba(255,255,255,0.04)"
            borderWidth={0.5}
            borderColor="rgba(255,255,255,0.08)"
            color="rgba(255,255,255,0.88)"
            placeholderTextColor="rgba(255,255,255,0.3)"
            focusStyle={{
              borderColor: 'rgba(124, 77, 255, 0.5)',
              bg: 'rgba(255,255,255,0.06)'
            }}
          />
          <Search
            size={18}
            color="rgba(255,255,255,0.35)"
            position="absolute"
            left={14}
            pointerEvents="none"
          />
        </XStack>

        {error && <Paragraph col="$red10" p="$4">{error}</Paragraph>}

        <ScrollView
          f={1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#312E81"
              colors={["#312E81"]}
            />
          }
        >
          {filteredFriends.length > 0 && (
            <YStack
              borderWidth={0.5}
              borderColor="rgba(255, 255, 255, 0.08)"
              borderRadius={16}
              overflow="hidden"
              backgroundColor="rgba(255, 255, 255, 0.02)"
            >
              {filteredFriends.map((f, index) => (
                <React.Fragment key={f?.uniqueId || f.user?.uniqueId || f?.id || index}>
                  <FriendListItem friend={f} />
                  {index < filteredFriends.length - 1 && <Separator borderColor="rgba(255, 255, 255, 0.06)" />}
                </React.Fragment>
              ))}
            </YStack>
          )}

          {filteredFriends.length === 0 && !loading && (
            <Paragraph ta="center" col="$gray10" mt="$4">
              {searchQuery
                ? t('friends.search.noResults', 'No friends found')
                : t('friends.empty', 'No friends yet. Tap + to add.')
              }
            </Paragraph>
          )}
        </ScrollView>
      </YStack>

      <Fab onPress={() => router.push('/tabs/friends/requests')} />
    </ScreenContainer>
  );
}
