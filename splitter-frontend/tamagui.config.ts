// tamagui.config.ts
import { createTamagui } from '@tamagui/core'
import { config } from '@tamagui/config/v3'

// Простая и рабочая конфигурация
const appConfig = createTamagui({
  ...config,
  // Переопределяем только цвета
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      primary: '#312E81',
      primaryHover: '#4338CA',
      success: '#10B981',
      error: '#F44336',
      warning: '#FF9800',
    },
    dark: {
      ...config.themes.dark,
      primary: '#312E81',
      primaryHover: '#1E1B4B',
      success: '#10B981',
      error: '#F44336',
      warning: '#FF9800',
    }
  }
})

export default appConfig

export type Conf = typeof appConfig

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}