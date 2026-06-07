import React from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '@/shared/lib/stores/app-store';

export default function Welcome() {
  const token = useAppStore((state) => state.token);

  // Если уже залогинен — сразу в табы, иначе на логин
  if (token) return <Redirect href="/tabs" />;
  return <Redirect href="/login" />;
}
