import React, { useEffect, useState } from 'react'
import { TamaguiProvider as Provider, Theme } from '@tamagui/core'
import { PortalProvider } from '@tamagui/portal'
import { useFonts } from 'expo-font'
import { useColorScheme } from 'react-native'
import config from '../../../tamagui.config'
import { useAppStore } from '@/shared/lib/stores/app-store'

interface TamaguiProviderProps {
  children: React.ReactNode
}

export const TamaguiProvider: React.FC<TamaguiProviderProps> = ({ children }) => {
  const theme = useAppStore((s) => s.theme)
  const systemScheme = useColorScheme()
  const resolvedTheme = theme === 'system' ? (systemScheme || 'light') : theme
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
    <Provider config={config} defaultTheme={resolvedTheme}>
      <PortalProvider>
        <Theme name={resolvedTheme}>
          {children}
        </Theme>
      </PortalProvider>
    </Provider>
  )
}