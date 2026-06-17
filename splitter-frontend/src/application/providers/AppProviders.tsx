// src/application/providers/AppProviders.tsx
import { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import QueryProvider from './QueryProvider';
import I18nProvider from './I18nProvider';
import { TamaguiProvider } from './TamaguiProvider';
import { AppStoreProvider } from '@/shared/lib/stores/app-store';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <TamaguiProvider>
        <AppStoreProvider>
          <QueryProvider>
            <I18nProvider>{children}</I18nProvider>
          </QueryProvider>
        </AppStoreProvider>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
