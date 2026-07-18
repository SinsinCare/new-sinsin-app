// Design System v2 — Elevation / shadow tokens
// Docs: project/design-system-v2/design-system-base/radius-shadow.md
// 이 DS는 거의 평면: 실제 drop-shadow는 Segment Control 2개뿐.
// 모달(Dialog·Bottom Sheet)의 깊이는 그림자가 아니라 background.dim 오버레이로 표현.
// 값은 RN <View> style 형태 (iOS shadow* + Android elevation).

export const elevation = {
  /** 살짝 떠 있는 컨트롤 (Segment 선택 pill) */
  1: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 1,
    elevation: 1,
  },
  /** 떠 있는 작은 버튼 (Segment 스크롤 화살표). 색 = color/greyopacity/greyopacity200 */
  2: {
    shadowColor: "rgb(0, 27, 55)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
} as const

/** 글래스 backdrop-blur 강도 (expo-blur / @react-native-community/blur 필요) */
export const blur = { glass: 16, glassLarge: 20 } as const

export type Elevation = keyof typeof elevation
