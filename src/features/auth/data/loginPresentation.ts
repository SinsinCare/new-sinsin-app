export const LOGIN_HERO_SOURCE = {
  width: 375,
  height: 530,
} as const

// The action stack keeps its existing controls and spacing. Reserve its rendered
// height before sizing the decorative hero so short devices never push actions
// outside of the screen.
export const LOGIN_ACTIONS_RESERVED_HEIGHT = {
  default: 256,
  withApple: 320,
} as const

export type LoginHeroLayoutInput = {
  viewportWidth: number
  viewportHeight: number
  topInset: number
  bottomInset: number
  showsAppleLogin: boolean
}

export type LoginHeroLayout = {
  width: number
  height: number
  naturalHeight: number
  preserveAspectRatio: "xMidYMid meet" | "xMidYMin slice"
}

export function getLoginHeroLayout({
  viewportWidth,
  viewportHeight,
  topInset,
  bottomInset,
  showsAppleLogin,
}: LoginHeroLayoutInput): LoginHeroLayout {
  const width = Math.max(0, viewportWidth)
  const naturalHeight =
    (width * LOGIN_HERO_SOURCE.height) / LOGIN_HERO_SOURCE.width
  const reservedActionHeight = showsAppleLogin
    ? LOGIN_ACTIONS_RESERVED_HEIGHT.withApple
    : LOGIN_ACTIONS_RESERVED_HEIGHT.default
  const availableHeight = Math.max(
    0,
    viewportHeight - topInset - bottomInset - 24 - reservedActionHeight,
  )
  const height = Math.min(naturalHeight, availableHeight)

  return {
    width,
    height,
    naturalHeight,
    preserveAspectRatio:
      height < naturalHeight ? "xMidYMin slice" : "xMidYMid meet",
  }
}
