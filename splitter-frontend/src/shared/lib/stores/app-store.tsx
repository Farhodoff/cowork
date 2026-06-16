import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '@/features/auth/api';
import { getToken, removeToken } from '../utils/token-storage';
import type { LanguageCode } from '@/shared/config/languages';
import { DEFAULT_LANGUAGE } from '@/shared/config/languages';

export interface User {
  id: number;
  email: string;
  username: string;
  uniqueId: string;
  avatarUrl: string | null;
}

interface AppStore {
  // Auth state
  token: string | null;
  user: User | null;
  isLoading: boolean;
  
  // App settings
  theme: 'light' | 'dark' | 'system';
  language: LanguageCode;
  dashboardCurrency: 'UZS' | 'USD';
  
  // Actions
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setAuth: (token: string, user: User) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: LanguageCode) => void;
  setDashboardCurrency: (currency: 'UZS' | 'USD') => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      user: null,
      isLoading: false,
      theme: 'system',
      language: DEFAULT_LANGUAGE,
      dashboardCurrency: 'UZS',

      // Auth actions
      setToken: (token: string) => {
        set({ token });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setAuth: (token: string, user: User) => {
        set({ token, user });
      },

      logout: async () => {
        try {
          await removeToken();
          set({ token: null, user: null });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true });
        try {
          const token = await getToken();
          if (!token) {
            set({ token: null, user: null });
            return;
          }

          set({ token });

          try {
            const currentUser = await getCurrentUser(token);
            set({ user: currentUser });
          } catch (error) {
            console.error('Current user fetch error:', error);
            set({ user: null });

            if (error instanceof Error && /authorization|unauthorized|not found/i.test(error.message)) {
              await removeToken();
              set({ token: null, user: null });
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ token: null, user: null });
        } finally {
          set({ isLoading: false });
        }
      },

      // App settings actions
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setDashboardCurrency: (dashboardCurrency) => set({ dashboardCurrency }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        dashboardCurrency: state.dashboardCurrency,
        // Не сохраняем токен и пользователя в AsyncStorage, 
        // так как токен сохраняется отдельно в SecureStore
      }),
    }
  )
);

// Provider component for initialization
import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { onUnauthorized } from '@/shared/api/auth-events';
import { registerForPushNotificationsAsync } from '@/shared/lib/notifications';
import { updatePushToken } from '@/features/auth/api';

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const initializeAuth = useAppStore((s) => s.initializeAuth);
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();
  const [isAuthReady, setIsAuthReady] = useState(false);

  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const setAuthStoreUser = require('@/stores/authStore').useAuthStore.getState().setUser;
  const setAuthStoreToken = require('@/stores/authStore').useAuthStore.getState().setToken;

  useEffect(() => {
    let mounted = true;

    (async () => {
      await initializeAuth();
      if (mounted) {
        setIsAuthReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthReady) {
      if (user) setAuthStoreUser(user);
      if (token) setAuthStoreToken(token);
    }
  }, [isAuthReady, user, token]);

  useEffect(() => {
    const unsubscribe = onUnauthorized(async () => {
      await logout();
      router.replace('/');
    });
    return unsubscribe;
  }, [logout, router]);

  useEffect(() => {
    if (isAuthReady && user) {
      registerForPushNotificationsAsync()
        .then((pushToken) => {
          if (pushToken) {
            updatePushToken({ token: pushToken }).catch(() => {
              // Ignore failure, logged inside api
            });
          }
        })
        .catch(console.error);
    }
  }, [isAuthReady, user]);
  
  if (!isAuthReady) {
    return null;
  }

  return <>{children}</>;
}
