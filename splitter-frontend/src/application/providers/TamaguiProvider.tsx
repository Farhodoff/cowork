import React from 'react'
import { TamaguiProvider as Provider, Theme } from '@tamagui/core'
import { PortalProvider } from '@tamagui/portal'
import { useFonts } from 'expo-font'
import config from '../../../tamagui.config'
import { useAppStore } from '@/shared/lib/stores/app-store'

interface TamaguiProviderProps {
  children: React.ReactNode
}

export const TamaguiProvider: React.FC<TamaguiProviderProps> = ({ children }) => {
  const theme = useAppStore((s) => s.theme)
  const [fontsLoaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  if (!fontsLoaded) {
    return null
  }

  return (
    <Provider config={config} defaultTheme={theme}>
      <PortalProvider>
        <Theme name={theme}>
          {children}
        </Theme>
      </PortalProvider>
    </Provider>
  )
}