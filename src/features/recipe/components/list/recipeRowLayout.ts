/**
 * 레시피 목록 줄의 **격자**. 숫자를 화면·카드에서 각자 고르지 않게 여기 한 곳에 둔다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 만들었나 — 실측된 세 가지 결함
 *
 * 재설계 전 목록 줄을 시뮬레이터(390×844)에서 재 보면 이랬다:
 *
 *   - 줄 간격(pitch) **136pt**. 썸네일 96 + 카드 안쪽 여백 14×2 = 124 에 카드 사이 12.
 *     그런데 글자는 세 줄(이름 21 + 영양 19 + 메타 18 + 간격 8 = 66)뿐이라 **58pt 가
 *     빈칸**이었다. "썸네일 옆에 큰 공백" 이라는 지적의 정체가 이 차이다.
 *   - 왼쪽 시작선이 **셋**이었다: 화면 20 · 썸네일 34(= 20 + 카드 패딩 14) · 글자 142.
 *     식당 격자 머리말이 적어 둔 "따로 노는 느낌" 의 원인 그대로다.
 *   - `저장 N` 이 **있는 카드에만 한 줄 더** 생겨(서버 `saveCount`, 실제 데이터다)
 *     줄 높이가 카드마다 달랐다. 목록을 훑는 눈은 높이가 흔들리면 리듬을 잃는다.
 *
 * ■ 고친 방법
 *
 *   1. 카드 면을 없앴다. `surface.card` 는 라이트에서 `#FFFFFF` 이고 화면 바닥도
 *      `#FFFFFF` 라 **그 카드는 화면에 보인 적이 없다.** 보이지도 않는 면 때문에
 *      안쪽 여백 14×2 = 28pt 를 매 줄 내고 있었다. 면을 지우고 줄 사이는 헤어라인으로
 *      끊는다(벤치마크 §D-21 "결과 사이는 얇은 divider, 결과 안은 촘촘하다").
 *   2. 썸네일 96 → 72. 사진이 아니라 **카테고리 픅토그램**이 들어가는 자리라 96 은
 *      "빈 사진" 으로 읽혔다(§`RECIPE_ROW_ART` 주석).
 *   3. `저장 N` 을 메타 한 줄에 합쳤다 — 줄 수가 데이터에 따라 변하지 않는다.
 *
 * 결과: 줄 높이 **96pt 고정**(72 + 12×2), 시작선 **둘**(16 / 100).
 *
 * ■ 왜 순수 모듈인가
 *
 * 이 저장소의 jest 는 `testEnvironment: "node"` 라 `react-native` 를 들여오는 파일을
 * 파싱하지 못한다. 값을 컴포넌트 안에 두면 "줄 높이가 고정인가", "바닥 여백이 AI 필을
 * 다 비우는가" 를 **검증할 방법이 없어** 다음 리팩터에서 조용히 되살아난다.
 *
 * 그래서 `@/src/design-system-v2` 배럴이 아니라 `tokens/layout` 을 **직접** 들여온다.
 * 배럴은 `components/`(react-native)를 함께 끌고 와 이 모듈을 테스트 불가로 만든다.
 */
import { GUTTER, ITEM_GAP } from "@/src/design-system-v2/tokens/layout"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { FLOATING_AI_BUTTON_COVERAGE } from "@/src/shared/components/floatingAiButtonLayout"

/**
 * 목록 줄의 썸네일 한 변.
 *
 * 96 에서 내렸다. 근거는 **이 자리에 사진이 없다는 사실**이다 — 개발 DB 실측(2026-07-31,
 * `select count(*), count(image_url), count(thumbnail_url), count(detail_image_url)
 * from recipe`)에서 175행 중 이미지가 있는 행은 **0건**이다. 큰 사각형에 작은 픅토그램을
 * 넣으면 "사진을 못 불러온 자리" 로 읽히고, 실제로 그렇게 읽혔다. 72 는 픅토그램이
 * 자리를 채우는 크기라 **일부러 놓은 타일**로 읽힌다.
 *
 * 사진이 들어오는 날에도 이 값은 그대로 쓸 수 있다 — 72 정사각은 목록 썸네일의 흔한 크기다.
 */
export const RECIPE_ROW_THUMB = 72

/** 타일 안 픅토그램의 한 변. 타일의 절반이라 여백이 테두리처럼 균일하게 남는다. */
export const RECIPE_ROW_ART = 36

/** 썸네일과 글자 사이. */
export const RECIPE_ROW_THUMB_GAP = spacing[12]

/** 줄의 위아래 여백. 위아래가 같아야 헤어라인 사이에서 글이 가운데로 읽힌다. */
export const RECIPE_ROW_PAD_V = spacing[12]

/** 목록 줄의 모서리 — 썸네일 타일에 쓴다. */
export const RECIPE_ROW_THUMB_RADIUS = radius.lg

/**
 * 줄 안에서 **글자가 시작하는 x**(화면 왼쪽 기준). 100.
 *
 * 식당 격자의 `TEXT_INDENT` 와 같은 발상이다 — 아이콘(여기서는 썸네일) 뒤에 오는 글은
 * 줄마다 같은 x 에서 시작해야 문단이 흔들리지 않는다. 화면에 허용된 시작선은 둘뿐이고
 * (`GUTTER` = 제목·섹션, 이 값 = 줄 본문) **셋째가 생기는 순간이 무너지는 순간**이다.
 */
export const RECIPE_ROW_TEXT_INDENT =
  GUTTER + RECIPE_ROW_THUMB + RECIPE_ROW_THUMB_GAP

/**
 * 줄 하나의 **고정 높이**. 96.
 *
 * 고정인 것이 요점이다. 글자 줄 수(이름 + 영양 + 메타 = 3줄, 약 61pt)가 썸네일보다
 * 낮으므로 높이는 항상 썸네일이 정한다 — `저장 N` 이 있든 없든, 이름이 한 줄이든
 * (`numberOfLines={1}`) 줄 높이가 변하지 않는다. 데이터가 레이아웃을 바꾸지 못한다.
 */
export const RECIPE_ROW_HEIGHT = RECIPE_ROW_THUMB + RECIPE_ROW_PAD_V * 2

/**
 * 목록 맨 아래에 비워 둘 높이.
 *
 * 전역 `AI 상담` 필이 화면 오른쪽 아래 `16 ~ 64` 를 영구히 덮는다. 그만큼을 비우지
 * 않으면 **마지막 줄은 존재하지 않는 것과 같다** — 스크롤을 끝까지 내려도 필에 가린다.
 *
 * `FLOATING_AI_BUTTON_COVERAGE` 를 **참조해서** 계산한다. 숫자를 박으면 필을 옮기는 날
 * 목록이 따라오지 않는다. 탭바 높이·안전영역은 **더하지 않는다** — 탭바는 레이아웃
 * 공간을 차지하므로 탭 화면의 바닥이 이미 탭바 위에서 끝난다(그 항을 한 번 더 더한
 * 것이 예전에 실제로 났던 사고다).
 */
export const RECIPE_LIST_BOTTOM_INSET = FLOATING_AI_BUTTON_COVERAGE + ITEM_GAP
