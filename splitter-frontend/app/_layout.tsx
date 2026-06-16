import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppProviders from '../src/application/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0f' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="tabs" />
      </Stack>
    </AppProviders>
  );
}