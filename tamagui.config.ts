import { createAnimations } from "@tamagui/animations-react-native"
import { createTamagui } from "@tamagui/core"
import { tokens } from "./src/theme/tokens"
import { bodyFont, headingFont } from "./src/theme/fonts"
import { lightTheme, darkTheme } from "./src/theme/themes"

const animations = createAnimations({
  fast: {
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  slow: {
    damping: 20,
    stiffness: 60,
  },
  bouncy: {
    damping: 9,
    mass: 0.9,
    stiffness: 150,
  },
})

const appConfig = createTamagui({
  animations,
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
    styleCompat: "react-native",
  },
})

export type AppConfig = typeof appConfig
declare module "@tamagui/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}

export default appConfig
