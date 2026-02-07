import { tokens } from './tokens'

export const lightTheme = {
  background: tokens.color.pureWhite,
  backgroundHover: tokens.color.grey8,
  backgroundPress: tokens.color.grey7,
  backgroundFocus: tokens.color.grey8,
  backgroundStrong: tokens.color.white,
  backgroundTransparent: 'rgba(255, 255, 255, 0)',

  color: tokens.color.black,
  colorHover: tokens.color.grey1,
  colorPress: tokens.color.grey2,
  colorFocus: tokens.color.grey1,
  colorTransparent: 'rgba(0, 0, 0, 0)',
  colorSubtle: tokens.color.grey5,

  borderColor: tokens.color.grey8,
  borderColorHover: tokens.color.grey7,
  borderColorFocus: tokens.color.grey6,
  borderColorPress: tokens.color.grey7,

  placeholderColor: tokens.color.grey6,
  outlineColor: 'rgba(238, 97, 69, 0.3)',

  // Semantic - Primary (coral/red)
  primary: tokens.color.primary7,
  primaryLight: tokens.color.primary1,
  primarySoft: tokens.color.primary3,
  primaryHover: tokens.color.primary8,
  primaryPress: tokens.color.primary9,

  // Semantic - Sub (teal/green)
  secondary: tokens.color.sub7,
  secondaryLight: tokens.color.sub1,
  secondarySoft: tokens.color.sub3,

  // Semantic - Status
  success: tokens.color.sub7,
  warning: tokens.color.primary6,
  danger: tokens.color.primary9,
  dangerBackground: tokens.color.primary1,

  // Card
  cardBackground: tokens.color.pureWhite,
  cardBackgroundHover: tokens.color.grey8,
}

export const darkTheme: typeof lightTheme = {
  background: tokens.color.black,
  backgroundHover: tokens.color.grey1,
  backgroundPress: tokens.color.grey2,
  backgroundFocus: tokens.color.grey1,
  backgroundStrong: tokens.color.grey1,
  backgroundTransparent: 'rgba(0, 0, 0, 0)',

  color: tokens.color.white,
  colorHover: tokens.color.grey8,
  colorPress: tokens.color.grey7,
  colorFocus: tokens.color.grey8,
  colorTransparent: 'rgba(255, 255, 255, 0)',
  colorSubtle: tokens.color.grey6,

  borderColor: tokens.color.grey3,
  borderColorHover: tokens.color.grey4,
  borderColorFocus: tokens.color.grey5,
  borderColorPress: tokens.color.grey4,

  placeholderColor: tokens.color.grey5,
  outlineColor: 'rgba(238, 97, 69, 0.3)',

  // Semantic - Primary
  primary: tokens.color.primary6,
  primaryLight: tokens.color.grey2,
  primarySoft: tokens.color.primary4,
  primaryHover: tokens.color.primary5,
  primaryPress: tokens.color.primary4,

  // Semantic - Sub
  secondary: tokens.color.sub5,
  secondaryLight: tokens.color.grey2,
  secondarySoft: tokens.color.sub4,

  // Semantic - Status
  success: tokens.color.sub5,
  warning: tokens.color.primary5,
  danger: tokens.color.primary8,
  dangerBackground: tokens.color.grey2,

  // Card
  cardBackground: tokens.color.grey2,
  cardBackgroundHover: tokens.color.grey3,
}
