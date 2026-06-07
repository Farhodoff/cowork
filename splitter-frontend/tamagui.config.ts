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
      primary: '#4F46E5',
      primaryHover: '#6366F1',
      success: '#2ECC71',
      error: '#F44336',
      warning: '#FF9800',
    },
    dark: {
      ...config.themes.dark,
      primary: '#4F46E5',
      primaryHover: '#6366F1',
      success: '#2ECC71',
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