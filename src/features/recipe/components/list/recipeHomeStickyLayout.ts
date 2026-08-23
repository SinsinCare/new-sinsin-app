/**
 * 레시피 홈 **고정층(①)의 세로 격자** — 제목줄 · 검색 · 카테고리 레일이 차지하는 높이.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 이 값들이 컴포넌트 밖에 있나
 *
 * 고정층은 **스크롤하지 않는다.** 즉 여기 붙는 1pt 는 목록에서 영구히 빠지는 1pt 다.
 * 그래서 이 블록의 총 높이는 "예쁜가" 가 아니라 **예산**이고, 예산은 검사할 수 있어야
 * 한다. 값이 `RecipeHomeScreen.tsx` 안의 인라인 스타일로 흩어져 있으면 — 실제로 그랬다 —
 * 아무도 총합을 모르고, 다음 사람이 여백 하나를 늘려도 화면이 조용히 무거워질 뿐이다.
 *
 * 화면은 `react-native`·`expo-router`·tamagui 를 끌고 와 jest(node)에서 렌더할 수 없다.
 * 그래서 **산술만** 여기로 내리고 화면은 결과를 쓴다(`recipeRowLayout.ts` ·
 * `community/communityLayout.ts` 와 같은 관용구다). `@/src/design-system-v2` **배럴이
 * 아니라** `tokens/*` 를 직접 들여오는 것도 같은 이유다 — 배럴은 `components/`
 * (react-native)를 함께 끌고 와 이 모듈을 테스트 불가로 만든다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 고정층에 무엇이 있고 왜 못 빼는가 (2026-08-21)
 *
 * 사용자 지시: "카테고리 탭바도 스크롤에 영향 안 받게 통일하고 … 서치바 밑에 넣어야
 * 할 듯" — 커뮤니티 탭과 **같은 문법**(검색 위 · 카테고리 아래 · 둘 다 고정)이다.
 * 그래서 카테고리 레일이 `ListHeaderComponent` 에서 이 층으로 올라왔다.
 *
 * 제목줄은 **흘려보낼 수 없다.** 그 줄에 `보관함`·`쓰기` 진입점이 있고, `보관함` 이
 * 없으면 `app/recipe/saved.tsx`·`recent.tsx`·`RecipeArchiveScreen` 이 어떤 화면에서도
 * 도달 불가가 된다(딥링크 전용 화면으로 되돌아간다).
 *
 * ■ 예산 — 화면 세로의 1/4
 *
 *   12(위) + 32(제목줄) + 12 + 44(검색) + 8(공용 상수) + 76(레일) + 12(아래) = **196**
 *
 * 812pt 기준 1/4 은 203 이므로 7pt 남는다. 옮기기 **전**의 값(제목-검색 14 · 레일 슬롯
 * 위아래 4 · 레일과의 간격이 고정층 아래 패딩 12)으로 그대로 합치면 202 로 예산 경계에
 * 붙어 버려서, 두 자리를 조였다:
 *   - 제목→검색 `14 → 12` — 14 는 애초에 `spacing` 토큰에 없는 값이었다. 12 로 내리면
 *     고정층의 세로 리듬이 위·아래 패딩(12)과 **같은 한 값**이 된다.
 *   - 레일 슬롯의 위아래 여백 `4 → 2` — 레일은 자기 몫만 든다(아래 §광학 거리).
 * 둘 다 여백이다. 진입점을 지우거나 레일을 칩으로 바꾸는 쪽은 손대지 않았다.
 *
 * ■ 광학 거리는 `SEARCH_TO_RAIL_GAP` + 레일 자기 여백이다
 *
 * 공용 상수(8)는 **검색 필드 밑변 ↔ 레일 컨테이너 윗변**이다. 눈에 보이는 첫 면
 * (아트 상자)까지는 거기에 슬롯의 위 여백 2 가 더해져 10 이다. 커뮤니티는 같은 상수에
 * 자기 레일의 10 이 더해져 18 이 된다 — 상수는 같고 레일의 밀도는 각자다.
 */
import { SEARCH_TO_RAIL_GAP } from "@/src/design-system-v2/tokens/layout"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { LAYOUT } from "@/src/theme/surface"

/**
 * 카테고리 레일 한 칸의 실측 부품. **`RecipeCategoryCarousel.tsx` 가 이 값을 읽는다** —
 * 컴포넌트에 숫자를 다시 적으면 아래 높이 공식이 조용히 거짓이 된다.
 */
export const RECIPE_CATEGORY_RAIL = {
  /** 한 칸의 폭. 라벨(`샐러드`)이 아트 상자보다 넓어서 상자보다 크게 잡는다. */
  slotWidth: 60,
  /** 그림 상자 한 변. 화면에서 **눈에 보이는 면**이고 시작선을 맞춰야 하는 대상이다. */
  artBox: 48,
  /** 그림 상자와 라벨 사이. */
  artLabelGap: spacing[6],
  /** 라벨의 줄 높이(fontSize 13). 글자 크기가 아니라 줄 높이가 자리를 차지한다. */
  labelLineHeight: 18,
  /**
   * 슬롯의 위·아래 여백. **레일이 드는 자기 몫**이고, 검색 필드와의 거리는
   * `SEARCH_TO_RAIL_GAP` 이 따로 든다(머리말 §광학 거리).
   * 예전 4 에서 내렸다 — 고정층 예산을 맞추느라 조인 두 자리 중 하나다.
   */
  slotPadV: spacing[2],
} as const

/** 레일 컨테이너의 총 높이. 상자·라벨·자기 여백만 센다(검색과의 간격은 밖이다). */
export function recipeCategoryRailHeight(): number {
  return (
    RECIPE_CATEGORY_RAIL.slotPadV * 2 +
    RECIPE_CATEGORY_RAIL.artBox +
    RECIPE_CATEGORY_RAIL.artLabelGap +
    RECIPE_CATEGORY_RAIL.labelLineHeight
  )
}

/**
 * 고정층의 세로 여백들.
 *
 * `padBottom` 은 장식이 아니라 **기능**이다 — 이 블록 밑변에서 목록이 잘리기 때문이다.
 * 여백이 없으면 스크롤한 순간 카드 사진이 밑변에 딱 붙어 잘려서, 층이 겹친 것이 아니라
 * **사진이 깨진 것처럼** 보인다(2026-08-18 실측). 그 밑변이 이제 검색창이 아니라
 * **레일**이므로 처방도 함께 옮겼다(`LAYOUT.stickyHeaderGap` 머리말).
 */
export const RECIPE_STICKY = {
  padTop: spacing[12],
  /** 제목줄 ↔ 검색 필드. 위·아래 패딩과 같은 12 라 고정층이 한 리듬으로 읽힌다. */
  titleToSearchGap: spacing[12],
  /** 검색 ↔ 레일. **두 탭이 공유하는 값**이라 이 파일에서 정하지 않는다. */
  searchToRailGap: SEARCH_TO_RAIL_GAP,
  padBottom: LAYOUT.stickyHeaderGap,
} as const

/**
 * 제목줄의 높이. 제목 글자(lineHeight 30)와 헤더 액션 칩(32) 중 **큰 쪽**이다 —
 * `V2HStack align="center"` 라 줄 높이를 정하는 것은 칩이다.
 */
export const RECIPE_STICKY_TITLE_ROW = 32

/** 검색 필드의 높이(`RecipeSearchField` 의 입력 상자·필터 버튼 둘 다 44). */
export const RECIPE_SEARCH_FIELD_HEIGHT = 44

/**
 * 고정층 총 높이. `hasRail` 은 **검색 중이 아니고 자동완성도 안 떠 있을 때**만 참이다
 * (`resolveRecipeBrowseLayout` + 자동완성 상태 — 화면이 조립한다).
 *
 * 레일이 빠지면 이 값이 `searchToRailGap + 레일` 만큼 줄고 목록의 뷰포트가 그만큼
 * 커진다. 스크롤 오프셋은 그대로라 **내용이 위로 튄다** — 그래서 검색 확정·해제에서
 * 화면이 목록을 맨 위로 되돌린다(`RecipeHomeScreen` 의 `resetListToTop`).
 */
export function recipeHomeStickyHeight({
  hasRail,
}: {
  hasRail: boolean
}): number {
  const base =
    RECIPE_STICKY.padTop +
    RECIPE_STICKY_TITLE_ROW +
    RECIPE_STICKY.titleToSearchGap +
    RECIPE_SEARCH_FIELD_HEIGHT +
    RECIPE_STICKY.padBottom

  if (!hasRail) return base
  return base + RECIPE_STICKY.searchToRailGap + recipeCategoryRailHeight()
}

/**
 * 고정층 예산의 기준 화면 세로. **iPhone 13 mini / X 계열(812)** 을 쓴다 —
 * 더 큰 기기(844·852)를 기준으로 잡으면 작은 기기에서 예산을 넘긴 채로 통과한다.
 *
 * 이보다 더 작은 SE(667)는 이 규칙을 어떤 조합으로도 만족시킬 수 없다(검색 44 +
 * 레일 76 + 제목줄 32 만으로 이미 152 인데 예산은 167 이다). 그 기기에서 무엇을
 * 접을지는 별도 판단이고, 여기서 조용히 기준을 낮춰 규칙을 무의미하게 만들지 않는다.
 */
export const RECIPE_STICKY_BUDGET_SCREEN_HEIGHT = 812

/** 고정층이 화면에서 가져가도 되는 최대 높이 — 세로의 1/4. */
export const RECIPE_STICKY_BUDGET = RECIPE_STICKY_BUDGET_SCREEN_HEIGHT / 4
