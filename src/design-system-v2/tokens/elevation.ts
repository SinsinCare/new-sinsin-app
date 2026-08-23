// Design System v2 — Elevation / shadow tokens
// Docs: project/design-system-v2/design-system-base/radius-shadow.md
// 이 DS는 거의 평면: 실제 drop-shadow는 Segment Control 2개(1·2)뿐이었다.
// 3은 예외다 — 앵커드 팝오버는 딤 없이 뜨므로 배경과의 분리를 그림자만 한다.
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
  /*
    앵커드 팝오버(정렬 드롭다운·더보기 메뉴·앨범 선택). 커뮤니티 재디자인 시안 4개 구역
    (post-detail · comment-write · meal-story · meal-169)이 같은 값을 냈다:
    `dy 16 / blur 60 / rgba(0, 27, 55, 0.10)`. Figma 의 blur 60 은 σ(stdDeviation) 30 이고
    RN 의 `shadowRadius` 가 σ 이므로 **30** 이다(60 을 그대로 넣으면 두 배로 번진다).
    색은 `elevation[2]` 와 같다 — 같은 그림자 계열의 크기만 다른 단계다.
    안드로이드는 shadow* 를 무시하므로 `elevation: 8` 이 그 몫이다.
    출처: 00-MASTER §4-G6 · §2.6.
  */
  3: {
    shadowColor: "rgb(0, 27, 55)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
} as const

/** 글래스 backdrop-blur 강도 (expo-blur / @react-native-community/blur 필요) */
export const blur = { glass: 16, glassLarge: 20 } as const

export type Elevation = keyof typeof elevation
