import { createTamagui } from '@tamagui/core'
import { config } from '@tamagui/config/v3'

const appConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      primary: '#007AFF',
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      danger: '#FF3B30',
      background: '#F2F2F7',
      cardBackground: 'rgba(255, 255, 255, 0.7)',
    },
    dark: {
      ...config.themes.dark,
      primary: '#0A84FF',
      secondary: '#5E5CE6',
      success: '#30D158',
      warning: '#FF9F0A',
      danger: '#FF453A',
      background: '#000000',
      cardBackground: 'rgba(30, 30, 30, 0.7)',
    },
  },
})

export type AppConfig = typeof appConfig
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig
