import React, { useCallback, useEffect, useState } from 'react';
import {
  YStack,
  XStack,
  Input,
  Button,
  Spinner,
  Text,
  ScrollView,
  View,
} from 'tamagui';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Users, X as XIcon } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { useGroupsStore } from '@/features/groups/model/groups.store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { useAppStore } from '@/shared/lib/stores/app-store';
import UserAvatar from '@/shared/ui/UserAvatar';

function useAutoNotice() {
  const [text, setText] = useState<string | undefined>();
  const [kind, setKind] = useState<'success' | 'error' | undefined>();

  useEffect(() => {
    if (!text) return;
    const timeout = setTimeout(() => {
      setText(undefined);
      setKind(undefined);
    }, 2500);
    return () => clearTimeout(timeout);
  }, [text]);

  return {
    ok: (message: string) => {
      setKind('success');
      setText(message);
    },
    err: (message: string) => {
      setKind('error');
      setText(message);
    },
    node: text ? (
      <View
        bg={kind === 'error' ? '#FEE2E2' : '#D1FAE5'}
        p="$3"
        br={12}
        borderWidth={1}
        borderColor={kind === 'error' ? '#FCA5A5' : '#6EE7B7'}
      >
        <Text color={kind === 'error' ? '#B91C1C' : '#065F46'} fontSize={14} fontWeight="600">
          {text}
        </Text>
      </View>
    ) : null,
  };
}

interface DraftMember {
  uniqueId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export default function GroupCreateScreen() {
  const router = useRouter();
  const notice = useAutoNotice();
  const { t } = useTranslation();

  const { createGroup, addMember, clearCurrent } = useGroupsStore();
  const { search: searchFriends } = useFriendsStore();
  const currentUser = useAppStore((s) => s.user);

  const [name, setName] = useState('');
  const [emailOrId, setEmailOrId] = useState('');
  const [optionalName, setOptionalName] = useState('');
  
  const [draftMembers, setDraftMembers] = useState<DraftMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      clearCurrent();
      setName('');
      setEmailOrId('');
      setOptionalName('');
      setDraftMembers([]);
      setCreating(false);
      setSearching(false);
    }, [clearCurrent])
  );

  async function onAddDraftMember() {
    const query = emailOrId.trim();
    if (!query) {
      notice.err(t('groups.create.validation.emptyQuery', 'Enter Email or ID.'));
      return;
    }

    // Check if user is adding themselves
    if (
      query.toLowerCase() === currentUser?.uniqueId?.toLowerCase() ||
      query.toLowerCase() === currentUser?.email?.toLowerCase()
    ) {
      notice.err(t('groups.create.validation.selfAdd', 'You are already the owner of the group.'));
      return;
    }

    // Check duplicate in drafts
    const isDuplicate = draftMembers.some(
      (m) =>
        m.uniqueId.toLowerCase() === query.toLowerCase() ||
        m.username.toLowerCase() === query.toLowerCase()
    );
    if (isDuplicate) {
      notice.err(t('groups.create.validation.duplicate', 'User already added to list.'));
      return;
    }

    setSearching(true);
    try {
      const results = await searchFriends(query);
      if (results && results.length > 0) {
        const found = results[0];
        const memberName = optionalName.trim() || found.displayName || found.username || found.uniqueId;
        
        setDraftMembers((prev) => [
          ...prev,
          {
            uniqueId: found.uniqueId,
            username: found.username,
            displayName: memberName,
            avatarUrl: found.avatarUrl,
          },
        ]);
        
        setEmailOrId('');
        setOptionalName('');
        notice.ok(t('groups.create.notice.memberAddedList', 'Added to group list!'));
      } else {
        notice.err(t('groups.create.notice.notFound', 'User not found. They must be registered.'));
      }
    } catch (err: any) {
      notice.err(err?.message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  function removeDraftMember(uid: string) {
    setDraftMembers((prev) => prev.filter((m) => m.uniqueId !== uid));
    notice.ok(t('groups.create.notice.memberRemovedList', 'Removed from list'));
  }

  function onInviteCopy() {
    notice.ok(t('groups.create.notice.inviteCopied', 'Invite link copied to clipboard!'));
  }

  async function handleCreateGroup() {
    if (!name.trim()) {
      notice.err(t('groups.create.validation.nameEmpty', 'Please enter a group name.'));
      return;
    }

    setCreating(true);
    try {
      // 1. Create group
      const created = await createGroup(name.trim());
      
      // 2. Add members sequentially
      for (const member of draftMembers) {
        try {
          await addMember(created.id, member.uniqueId);
        } catch (err: any) {
          console.error(`Failed to add member ${member.uniqueId}:`, err);
        }
      }
      
      notice.ok(t('groups.create.notice.success', 'Group created successfully!'));
      
      // 3. Navigate back to Groups
      setTimeout(() => {
        router.replace('/tabs/groups' as never);
      }, 1500);
    } catch (error: any) {
      notice.err(error?.message ?? t('groups.create.notice.error', 'Failed to create group'));
      setCreating(false);
    }
  }

  return (
    <YStack f={1} bg="#F9FAFB">
      {/* Curved Header Banner */}
      <View
        bg="#4F46E5"
        pt="$5"
        pb="$6"
        px="$4"
        borderBottomLeftRadius={30}
        borderBottomRightRadius={30}
        position="relative"
      >
        <XStack ai="center" mt="$2">
          <Button
            onPress={() => router.replace('/tabs/groups')}
            circular
            size="$3.5"
            bg="rgba(255,255,255,0.15)"
            pressStyle={{ bg: 'rgba(255,255,255,0.25)', scale: 0.95 }}
            borderWidth={0}
            icon={<ArrowLeft color="white" size={20} />}
          />
          <Text color="white" fontSize={22} fontWeight="700" ml="$3">
            {t('groups.create.title', 'Create Group')}
          </Text>
        </XStack>

        <View
          w={74}
          h={74}
          br={37}
          bg="rgba(255,255,255,0.2)"
          ai="center"
          jc="center"
          alignSelf="center"
          mt="$3"
        >
          <Users size={36} color="white" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        f={1}
        bg="#F9FAFB"
        contentContainerStyle={{ pb: 30 }}
      >
        {/* Floating Card for Group Name */}
        <View
          bg="white"
          br={16}
          p="$4"
          mx="$4"
          mt={-24}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.06}
          shadowRadius={10}
          bw={1}
          bc="#F3F4F6"
        >
          <Text fontSize={13} fontWeight="600" color="#4B5563" mb="$2">
            Group Name
          </Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="e.g., Weekend Squad, Roommates, Trip 20"
            h={52}
            br={12}
            borderWidth={1.5}
            borderColor="#E5E7EB"
            focusStyle={{ borderColor: '#4F46E5' }}
            bg="white"
            fontSize={15}
          />
        </View>

        {/* Add Members Section */}
        <YStack px="$4" mt="$4" gap="$2.5">
          <Text fontSize={18} fontWeight="700" color="#111827">
            Add Members
          </Text>

          {notice.node && (
            <View py="$1">
              {notice.node}
            </View>
          )}

          <XStack gap="$2" ai="center">
            <Input
              f={2}
              value={emailOrId}
              onChangeText={setEmailOrId}
              placeholder="Email or ID"
              h={50}
              br={12}
              borderWidth={1.5}
              borderColor="#E5E7EB"
              focusStyle={{ borderColor: '#4F46E5' }}
              bg="white"
              fontSize={14}
              autoCapitalize="none"
            />
            <Input
              f={1.5}
              value={optionalName}
              onChangeText={setOptionalName}
              placeholder="Name (optional)"
              h={50}
              br={12}
              borderWidth={1.5}
              borderColor="#E5E7EB"
              focusStyle={{ borderColor: '#4F46E5' }}
              bg="white"
              fontSize={14}
            />
            <Button
              onPress={onAddDraftMember}
              bg="#4F46E5"
              pressStyle={{ bg: '#4338CA', scale: 0.97 }}
              h={50}
              br={12}
              px="$4"
              disabled={searching}
            >
              {searching ? (
                <Spinner size="small" color="white" />
              ) : (
                <Text color="white" fontWeight="700" fontSize={14}>
                  Add
                </Text>
              )}
            </Button>
          </XStack>

          {/* Invite link */}
          <Button
            chromeless
            onPress={onInviteCopy}
            p={0}
            h={30}
            alignSelf="center"
            pressStyle={{ opacity: 0.7 }}
          >
            <Text color="#4F46E5" fontWeight="600" fontSize={14}>
              + Invite via email or phone
            </Text>
          </Button>

          {/* Added members list */}
          {draftMembers.length > 0 && (
            <YStack gap="$2" mt="$2">
              <Text fontSize={14} fontWeight="600" color="#6B7280" mb="$1">
                Members to add ({draftMembers.length})
              </Text>
              {draftMembers.map((member, idx) => {
                const avatarLabel = (member.displayName || member.username || 'U').slice(0, 1).toUpperCase();
                const getBgColor = (label: string) => {
                  const colors = ['#F97316', '#06B6D4', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981'];
                  const charCode = (label.charCodeAt(0) || 0) % colors.length;
                  return colors[charCode];
                };
                return (
                  <XStack
                    key={member.uniqueId ?? idx}
                    ai="center"
                    jc="space-between"
                    p="$3"
                    bg="white"
                    br={14}
                    borderWidth={1}
                    borderColor="#F3F4F6"
                    shadowColor="#000"
                    shadowOffset={{ width: 0, height: 1 }}
                    shadowOpacity={0.01}
                    shadowRadius={4}
                  >
                    <XStack ai="center" gap="$3">
                      <UserAvatar
                        uri={member.avatarUrl}
                        label={avatarLabel}
                        size={36}
                        textSize={14}
                        backgroundColor={getBgColor(avatarLabel)}
                      />
                      <YStack>
                        <Text fontSize={15} fontWeight="600" color="#111827">
                          {member.displayName || member.username}
                        </Text>
                        <Text fontSize={13} color="#6B7280">
                          {member.uniqueId}
                        </Text>
                      </YStack>
                    </XStack>
                    <Button
                      size="$2.5"
                      circular
                      chromeless
                      icon={<XIcon size={18} color="#EF4444" />}
                      onPress={() => removeDraftMember(member.uniqueId)}
                      pressStyle={{ bg: '#FEE2E2' }}
                    />
                  </XStack>
                );
              })}
            </YStack>
          )}

          {/* Submit Button */}
          <Button
            onPress={handleCreateGroup}
            bg="#4F46E5"
            pressStyle={{ bg: '#4338CA', scale: 0.98 }}
            h={52}
            br={14}
            mt="$4"
            disabled={creating}
          >
            {creating ? (
              <XStack gap="$2" ai="center">
                <Spinner size="small" color="white" />
                <Text color="white" fontWeight="700" fontSize={16}>
                  Creating...
                </Text>
              </XStack>
            ) : (
              <Text color="white" fontWeight="700" fontSize={16}>
                Create Group
              </Text>
            )}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
