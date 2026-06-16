import { create } from 'zustand';
import { getToken, saveToken, removeToken } from '@/shared/lib/utils/token-storage';
import i18n from '@/lib/i18n';

export interface User {
  id: string;
  name?: string;
  username?: string;
  email: string;
  avatar?: string | null;
  language: string;
  uniqueId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  language: 'uz' | 'en' | 'ja';
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => Promise<void>;
  setLanguage: (lang: 'uz' | 'en' | 'ja') => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  language: 'uz',
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: async (token) => {
    if (token) {
      await saveToken(token);
      set({ token, isAuthenticated: true });
    } else {
      await removeToken();
      set({ token: null, isAuthenticated: false, user: null });
    }
  },
  setLanguage: (language) => {
    set({ language });
    i18n.changeLanguage(language);
  },
  logout: async () => {
    await removeToken();
    set({ token: null, isAuthenticated: false, user: null });
    // Clear other stores
    try {
      const { useGroupsStore } = require('@/features/groups/model/groups.store');
      useGroupsStore.getState().clearCurrent();
    } catch (e) {}
    try {
      const { useSessionsHistoryStore } = require('@/features/sessions/model/history.store');
      useSessionsHistoryStore.getState().reset();
    } catch (e) {}
  },
}));
