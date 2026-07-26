// animations-react-native 는 RN 의 Animated 드라이버라 스프링 계산이 JS 스레드에서 돕니다.
// 목록 렌더·API 파싱으로 JS 스레드가 막히면 그대로 애니메이션이 끊깁니다.
// reanimated 드라이버는 같은 스프링 설정(damping/mass/stiffness)을 그대로 받고
// 계산을 UI 스레드로 넘깁니다. reanimated 는 이미 의존성에 있습니다.
import { createAnimations } from "@tamagui/animations-reanimated"
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
