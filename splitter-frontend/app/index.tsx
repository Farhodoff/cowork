import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Welcome() {
  const token = useAuthStore((state) => state.token);

  if (token) return <Redirect href="/tabs" />;
  return <Redirect href="/(auth)/login" />;
}
