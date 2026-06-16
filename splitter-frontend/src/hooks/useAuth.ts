import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/axios';
import { useAuthStore, User } from '@/stores/authStore';

interface LoginResponse {
  token: string;
  user: User;
}

export function useAuth() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const logoutStore = useAuthStore((s) => s.logout);

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post<LoginResponse>('/auth/login', data);
      return res.data;
    },
    onSuccess: async (data) => {
      try {
        const { useAppStore } = require('@/shared/lib/stores/app-store');
        useAppStore.getState().setAuth(data.token, data.user);
      } catch (e) {}
      await setToken(data.token);
      setUser(data.user);
      router.replace('/(tabs)' as any);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post<LoginResponse>('/auth/register', data);
      return res.data;
    },
    onSuccess: async (data) => {
      try {
        const { useAppStore } = require('@/shared/lib/stores/app-store');
        useAppStore.getState().setAuth(data.token, data.user);
      } catch (e) {}
      await setToken(data.token);
      setUser(data.user);
      router.replace('/(tabs)' as any);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await logoutStore();
    },
    onSuccess: () => {
      router.replace('/(auth)/login' as any);
    },
  });

  return {
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}
