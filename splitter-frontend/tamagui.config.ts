// tamagui.config.ts
import { createTamagui, createTheme, createTokens } from '@tamagui/core'
import { createAnimations } from '@tamagui/animations-react-native'

const animations = createAnimations({
  '75ms': { type: 'timing', duration: 75 },
  '100ms': { type: 'timing', duration: 100 },
  '200ms': { type: 'timing', duration: 200 },
  bouncy: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  superBouncy: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  lazy: { type: 'timing', duration: 1000 },
  medium: { type: 'timing', duration: 300 },
  slow: { type: 'timing', duration: 500 },
  quick: { type: 'timing', duration: 400 },
  quicker: { type: 'timing', duration: 300 },
  quickest: { type: 'timing', duration: 200 },
})

const tokens = createTokens({
  size: {
    sm: 4, md: 8, lg: 16, xl: 24, true: 8,
    '0': 0, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10,
    '3': 12, '3.5': 14, '4': 16, '5': 20, '6': 24, '7': 28,
    '8': 32, '9': 36, '10': 40,
  },
  space: {
    sm: 4, md: 8, lg: 16, xl: 24, true: 8,
    '0': 0, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10,
    '3': 12, '3.5': 14, '4': 16, '5': 20, '6': 24, '7': 28,
    '8': 32, '9': 36, '10': 40,
  },
  font: {
    sm: 12, md: 14, lg: 18, xl: 24, true: 14,
    '1': 11, '2': 12, '3': 13, '4': 14, '5': 16, '6': 18,
    '7': 20, '8': 23, '9': 32, '10': 40,
  },
  color: {
    white: '#ffffff',
    black: '#000000',
    bgBase:        '#0a0a0f',
    surface1:      'rgba(255,255,255,0.04)',
    surface2:      'rgba(255,255,255,0.07)',
    border:        'rgba(255,255,255,0.09)',
    borderActive:  'rgba(255,255,255,0.18)',
    accent1:       '#7c4dff',
    accent2:       '#448aff',
    success:       '#00bc8c',
    warning:       '#ef9f27',
    danger:        '#ef5350',
    textPrimary:   'rgba(255,255,255,0.88)',
    textSecondary: 'rgba(255,255,255,0.45)',
    textTertiary:  'rgba(255,255,255,0.25)',
    // gray scale
    gray1: '#111113', gray2: '#1a1a1e', gray3: '#222226', gray4: '#2e2e33',
    gray5: '#3a3a40', gray6: '#48484f', gray7: '#5a5a63', gray8: '#6e6e78',
    gray9: '#85858f', gray10: '#9e9ea8', gray11: '#b8b8c1', gray12: '#d4d4db',
    red10: '#ef5350',
    green9: '#00bc8c', green10: '#00a67e',
    yellow10: '#ef9f27',
  },
  radius: {
    sm: 4, md: 8, lg: 16, xl: 24, true: 8,
    '1': 3, '2': 5, '3': 8, '4': 12, '5': 16, '6': 20,
    cardLg: 28, cardMd: 18, input: 14, btn: 14, icon: 12, tab: 14,
  },
  zIndex: {
    sm: 1, md: 10, lg: 100, xl: 1000, true: 1,
  },
})

const darkTheme = createTheme({
  background:       '#0a0a0f',
  backgroundHover:  'rgba(255,255,255,0.04)',
  backgroundPress:  'rgba(255,255,255,0.07)',
  backgroundFocus:  'rgba(255,255,255,0.07)',
  color:            'rgba(255,255,255,0.88)',
  colorHover:       '#ffffff',
  colorPress:       'rgba(255,255,255,0.7)',
  colorFocus:       'rgba(255,255,255,0.88)',
  borderColor:      'rgba(255,255,255,0.09)',
  borderColorHover: 'rgba(255,255,255,0.18)',
  borderColorPress: 'rgba(255,255,255,0.09)',
  borderColorFocus: 'rgba(255,255,255,0.18)',
  placeholderColor: 'rgba(255,255,255,0.25)',
  // Tamagui color steps
  color1: 'rgba(255,255,255,0.04)',
  color2: 'rgba(255,255,255,0.06)',
  color3: 'rgba(255,255,255,0.08)',
  color4: 'rgba(255,255,255,0.10)',
  color5: 'rgba(255,255,255,0.12)',
  color6: 'rgba(255,255,255,0.14)',
  color7: 'rgba(255,255,255,0.16)',
  color8: 'rgba(255,255,255,0.18)',
  color9: 'rgba(255,255,255,0.20)',
  color10: 'rgba(255,255,255,0.22)',
  color11: 'rgba(255,255,255,0.24)',
  color12: 'rgba(255,255,255,0.26)',
})

// Light theme mirrors dark — Tamagui requires both.
const lightTheme = createTheme({ ...darkTheme })

const shorthands = {
  f: 'flex', ai: 'alignItems', jc: 'justifyContent',
  w: 'width', h: 'height', m: 'margin', p: 'padding',
  mx: 'marginHorizontal', my: 'marginVertical',
  px: 'paddingHorizontal', py: 'paddingVertical',
  br: 'borderRadius', bg: 'backgroundColor',
  bw: 'borderWidth', bc: 'borderColor',
  o: 'opacity', zi: 'zIndex',
  maw: 'maxWidth', mah: 'maxHeight',
  miw: 'minWidth', mih: 'minHeight',
  mt: 'marginTop', mb: 'marginBottom', ml: 'marginLeft', mr: 'marginRight',
  pt: 'paddingTop', pb: 'paddingBottom', pl: 'paddingLeft', pr: 'paddingRight',
  col: 'color', fos: 'fontSize', fow: 'fontWeight', ta: 'textAlign',
  lh: 'lineHeight', ls: 'letterSpacing',
} as const

const fonts = {
  body: {
    family: 'Inter',
    size: tokens.font,
    lineHeight: tokens.font,
    weight: { '400': '400' as any, '700': '700' as any },
    letterSpacing: { '0': 0 },
  },
  heading: {
    family: 'InterBold',
    size: tokens.font,
    lineHeight: tokens.font,
    weight: { '400': '400' as any, '700': '700' as any },
    letterSpacing: { '0': 0 },
  },
}

const media = {
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  gtSm: { minWidth: 801 },
  gtMd: { minWidth: 1021 },
  gtLg: { minWidth: 1281 },
}

const appConfig = createTamagui({
  animations,
  tokens,
  themes: { dark: darkTheme, light: lightTheme },
  defaultTheme: 'dark',
  shorthands,
  fonts,
  media,
  settings: {
    defaultFont: 'body',
    fastSchemeChange: true,
    shouldAddPrefersColorThemes: false,
    themeClassNameOnRoot: true,
  },
})

export default appConfig

export type Conf = typeof appConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

