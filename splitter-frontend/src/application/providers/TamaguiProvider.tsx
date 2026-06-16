import React, { useEffect, useState } from 'react'
import { TamaguiProvider as Provider, Theme } from '@tamagui/core'
import { PortalProvider } from '@tamagui/portal'
import { useFonts } from 'expo-font'
import config from '../../../tamagui.config'
import { useAppStore } from '@/shared/lib/stores/app-store'

interface TamaguiProviderProps {
  children: React.ReactNode
}

// Force dark theme only — no useColorScheme
const THEME = 'dark'

export const TamaguiProvider: React.FC<TamaguiProviderProps> = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false)

  const [fontsLoaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setIsHydrated(true)
      return
    }

    const unsubscribe = useAppStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
    })

    return unsubscribe
  }, [])

  if (!fontsLoaded || !isHydrated) {
    return null
  }

  return (
    <Provider config={config} defaultTheme={THEME}>
      <PortalProvider>
        <Theme name={THEME}>
          {children}
        </Theme>
      </PortalProvider>
    </Provider>
  )
}