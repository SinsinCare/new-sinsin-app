import { createTamagui } from '@tamagui/core'
import { tokens } from './src/theme/tokens'
import { bodyFont, headingFont } from './src/theme/fonts'
import { lightTheme, darkTheme } from './src/theme/themes'

const appConfig = createTamagui({
  tokens,
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  media: {
    sm: { maxWidth: 860 },
    gtSm: { minWidth: 861 },
    short: { maxHeight: 820 },
    tall: { minHeight: 821 },
  },
  settings: {
    styleCompat: 'react-native',
  },
})

export type AppConfig = typeof appConfig
declare module '@tamagui/core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig
