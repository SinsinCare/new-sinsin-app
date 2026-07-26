import { createTokens } from "@tamagui/core"

export const tokens = createTokens({
  color: {
    // Base
    black: "#0D0D0D",
    white: "#F4F4F4",
    offWhite: "#FCFCFC",
    pureWhite: "#FFFFFF",

    // 브랜드 프라이머리. 2026-07 확정값 — 초록 계열에서 이 코랄로 바뀌었다.
    // 화면에서 "브랜드 색"이 필요하면 이걸 쓴다. primary1~9 는 그 주변 스케일이고,
    // primaryAccent(#FF7246)는 이 값과 사실상 같으니 새로 쓰지 말 것.
    primary: "#FE7139",

    // Primary (coral/red)
    primary1: "#FFF5ED",
    primary2: "#FFE2CB",
    primary3: "#F9CFAD",
    primary4: "#F1A89B",
    primary5: "#E78D7C",
    primary6: "#E77661",
    primary7: "#EE6145",
    primary8: "#F24D2D",
    primary9: "#F82F08",
    primaryAccent: "#FF7246",

    // Sub (teal/green)
    sub1: "#E0FFF7",
    sub2: "#C7FFF1",
    sub3: "#A3F0DE",
    sub4: "#7FE6CC",
    sub5: "#5BC5AB",
    sub6: "#44AF94",
    sub7: "#1D9A7A",
    sub8: "#0D896A",
    sub9: "#028A67",

    // App screen background
    appBg: "#FAFAFA",
    appBgDark: "#1F1F21",
    cardBgDark: "#313138",
    inputBgDark: "#2E2E34",
    borderDark: "#3A3A42",
    textDark: "#E7E7EE",
    textDarkSub: "#ABABB4",

    // Light mode semantic
    textLight: "#2A2A37",
    textLightSub: "#A5A5AF",
    textLightMuted: "#595960",
    borderLight: "#EAEAF0",

    // Restriction level badge
    restrictionBg: "#FCE1E1",
    restrictionText: "#E74E4E",

    // Error / validation
    error: "#FF3B30",

    // Hydration
    waterPercentBg: "#D2DFE3",
    waterPercentBgDark: "#46616A",
    waterFillTop: "#6BDAFE",
    waterFillBottom: "#30C1F0",

    // Greyscale
    grey1: "#171717",
    grey2: "#252525",
    grey3: "#333333",
    grey4: "#525252",
    grey5: "#757575",
    grey6: "#999999",
    grey7: "#B3B3B3",
    grey8: "#EDEDED",

    // UI element backgrounds
    deleteBg: "#D9D9DF",
  },

  space: {
    0: 0,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    4.5: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
    "-1": -4,
    "-2": -8,
    "-3": -12,
    "-4": -16,
  },

  size: {
    0: 0,
    1: 8,
    2: 16,
    3: 24,
    4: 32,
    5: 40,
    6: 48,
    7: 56,
    8: 64,
    9: 72,
    10: 80,
    11: 96,
    12: 120,
    true: 44,
  },

  radius: {
    0: 0,
    1: 2,
    2: 4,
    3: 6,
    4: 8,
    5: 10,
    6: 12,
    7: 14,
    8: 16,
    9: 20,
    10: 24,
    12: 999,
    // 시스템 기본 라디우스 = 16. 디자인 확정값이라 bare `radius` 도 16 이 되게 한다.
    true: 16,
  },

  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
})
