/**
 * 카드에 그릴 값을 정하는 순수 함수들. 계약 §6.3 카드가 이 함수들의 결과만 그린다.
 *
 * 왜 컴포넌트 밖으로 뺐나: 시안 카드의 결함 세 개가 전부 "무엇을 그릴지" 의 판단
 * 문제였다 — (a) `★4.0 (27)` 이 데이터 없이 그려져 있었고, (b) 태그가 `#저염ㅅ` 로
 * 잘렸고, (c) 임상 태그가 카드마다 붙어 있었다. 판단을 JSX 안에 두면 테스트할 수
 * 없어서 다음 리팩터에서 조용히 되살아난다. 여기서 정하고 jest 로 못 박는다.
 *
 * i18n 은 하지 않는다 — 문자열은 화면이 `t()` 로 만든다(계약 §6.4).
 */
import type {
  NutrientHeadline,
  RatingSummary,
  RecipeCard,
} from "../../types/recipeListV2"

/** 1227 → "1,227". Intl 없이 결정론적으로 — 테스트가 로케일에 흔들리지 않게. */
export function groupThousands(value: number): string {
  const rounded = Math.round(Math.abs(value))
  const sign = value < 0 ? "-" : ""
  const digits = String(rounded)
  let out = ""
  for (let index = 0; index < digits.length; index += 1) {
    const fromEnd = digits.length - index
    out += digits[index]
    if (fromEnd > 1 && fromEnd % 3 === 1) out += ","
  }
  return sign + out
}

/**
 * 영양 수치 표기. mg 는 정수, g 는 소수 첫째 자리(정수면 소수점을 안 붙인다).
 * 신장 환자가 읽는 숫자라 반올림 규칙을 화면마다 다르게 두지 않는다.
 */
export function formatNutrientAmount(amount: number, unit: "mg" | "g"): string {
  if (unit === "mg") return `${groupThousands(amount)}mg`
  const rounded = Math.round(amount * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}g`
}

/**
 * 계약 §1.1 의 관문 — **provenance 없이 수치를 그리지 않는다.**
 * `nutrition` 이 null(= provenance 를 신뢰할 수 없음)이면 headline 이 와도 버린다.
 */
export function resolveCardHeadline(card: RecipeCard): NutrientHeadline | null {
  if (!card.nutrition) return null
  if (!card.headline) return null
  return card.headline
}

/**
 * 계약 §6.1: 리뷰 0건이면 별점 영역을 **안 그린다**(0.0 을 만들지 않는다).
 * 평균이 null 인데 개수가 있는 경우도 그리지 않는다 — 별 없이 개수만 있는 줄은
 * 사용자가 무엇의 개수인지 알 수 없다.
 */
export function resolveCardRating(
  rating: RatingSummary,
): { average: string; count: number } | null {
  if (rating.count <= 0 || rating.average == null) return null
  return { average: rating.average.toFixed(1), count: rating.count }
}

/**
 * 계약 §1.2 의 차단 토큰. 서버 `mealrec/tables.generated.ts::BLOCKED_TAG_TOKENS` 와
 * 같은 목록에 계약이 든 `고열량`/`high calorie` 를 더했다(서버 목록에 그 둘이 없다).
 *
 * 왜 앱에도 두는가: 계약 §3.1 은 `tags` 가 "§1.2 로 걸러진 것만" 온다고 적었고 그건
 * 서버의 책임이다. 그런데 서버가 한 번 빠뜨리면 **검수 전 카탈로그 카드에 `#저염` 이
 * 찍힌다** — 그 자체가 §1.2 가 금지한 임상 주장이고, 앱은 그걸 그대로 그린다.
 * provenance 는 §1.1 을 앱에서 한 번 더 막는데(normalizeNutrition) 태그는 막는 곳이
 * 없었다. 여기서 막는다. 서버가 제대로 걸러 주면 이 필터는 아무것도 하지 않는다.
 */
export const CLINICAL_TAG_TOKENS: readonly string[] = [
  "저염",
  "저단백",
  "저칼륨",
  "저인",
  "고열량",
  "ckd",
  "투석",
  "당뇨",
  "고혈압",
  "신장",
  "콩팥",
  "low sodium",
  "low protein",
  "low potassium",
  "low phosphorus",
  "high calorie",
  "dialysis",
  "diabetes",
  "hypertension",
  "kidney",
  "renal",
]

/** 토큰이 하나라도 들어간 태그는 통째로 버린다(서버 `nonclinicalTags` 와 같은 규칙). */
export function isClinicalTag(tag: string): boolean {
  const lowered = tag.toLowerCase()
  return CLINICAL_TAG_TOKENS.some((token) => lowered.includes(token))
}

/**
 * 카드에 그릴 태그. 계약 §6.1: **최대 2개 + 넘치면 `+N`. 잘리지 않는다.**
 * 글자 예산으로 자르는 이유: 개수만 제한하면 긴 태그 두 개가 카드 폭을 넘겨
 * 시안과 똑같이 `#저염ㅅ` 가 된다. 렌더 폭을 재지 않고도 깨지지 않는 유일한 방법이
 * "몇 글자까지" 를 미리 정하는 것이다.
 *
 * 임상 태그는 **`overflow` 에도 세지 않는다.** `+1` 은 "자리가 없어 못 보여준 게 있다" 는
 * 뜻이라 사용자가 카드를 눌러 찾게 만드는데, 임상 태그는 어디서도 보여주지 않는다.
 */
export const CARD_TAG_MAX_COUNT = 2
export const CARD_TAG_CHAR_BUDGET = 14

export function resolveCardTags(
  tags: readonly string[],
  options?: { maxCount?: number; charBudget?: number },
): { shown: string[]; overflow: number } {
  const maxCount = options?.maxCount ?? CARD_TAG_MAX_COUNT
  const charBudget = options?.charBudget ?? CARD_TAG_CHAR_BUDGET

  const cleaned = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    // 계약 §1.2 — 임상 토큰이 든 태그는 화면에 없다.
    .filter((tag) => !isClinicalTag(tag))
    // 같은 태그가 두 번 오면 한 번만 — 시안 카드에 `#저염식 #저염ㅅ` 이 실제로 있었다.
    .filter((tag, index, all) => all.indexOf(tag) === index)

  const shown: string[] = []
  let used = 0
  for (const tag of cleaned) {
    if (shown.length >= maxCount) break
    if (used + tag.length > charBudget) break
    shown.push(tag)
    used += tag.length
  }
  return { shown, overflow: cleaned.length - shown.length }
}

/** 카드 맨 아래 줄(35분 · 1인분). 값이 없는 항목은 아예 빼서 "0분" 을 만들지 않는다. */
export function resolveCardMeta(card: RecipeCard): {
  timeMin: number | null
  servings: number | null
} {
  const timeMin =
    card.timeMin != null && card.timeMin > 0 ? Math.round(card.timeMin) : null
  const servings =
    card.servings != null && card.servings > 0
      ? Math.round(card.servings)
      : null
  return { timeMin, servings }
}

// ---------------------------------------------------------------------------
// 메타 한 줄
// ---------------------------------------------------------------------------

/**
 * 줄 하나에 가운뎃점으로 이어 붙일 **조각들**. 문자열이 아니라 조각인 이유는 i18n 이
 * 화면의 몫이기 때문이다(계약 §6.4) — 여기서 `t()` 를 부르면 순수 모듈이 아니게 된다.
 *
 * 순서가 이 타입의 내용이다. 벤치마크 §A-1 이 `한식 · ★4.63 · 리뷰 1,848` 로
 * **장르를 맨 앞**에 두는 것을 그대로 따른다: 무엇인지(장르)를 먼저 말하고 그 다음이
 * 수치다. 우리 목록에서 장르가 특히 중요한 이유가 하나 더 있다 — 이 화면에는 **사진이
 * 없다**(DB 175행 전부 이미지 NULL). 사진이 말해 줄 "무슨 요리인가" 를 대신 말하는 것이
 * 카테고리 낱말이라, 여기서 빼면 그 정보는 픅토그램 하나에만 남는다.
 */
export interface CardMetaTokens {
  /** 서버가 로케일에 맞춰 보낸 표기 그대로(`한식` / `Korean`). 비었으면 null. */
  category: string | null
  timeMin: number | null
  servings: number | null
  rating: { average: string; count: number } | null
  /** 0 이면 null — "저장 0" 은 정보가 아니라 소음이다. */
  saveCount: number | null
}

/**
 * 카드가 메타 **한 줄**에 쓸 조각들.
 *
 * 예전에는 이 정보가 두 줄로 갈라져 있었다: `★ 4.0 (1) · 저장 1` 한 줄과
 * `40분 · 1인분` 한 줄. 그런데 `저장 N` 은 서버 `saveCount` 가 0 이면 사라지고 별점도
 * 리뷰 0건이면 사라져서, **첫 줄이 통째로 있다 없다 하며 줄 높이가 카드마다 달라졌다**
 * (실측: 곤드레밥만 네 줄, 나머지는 세 줄). 한 줄로 합치면 조각이 몇 개든 높이가 같다.
 */
export function resolveCardMetaTokens(card: RecipeCard): CardMetaTokens {
  const meta = resolveCardMeta(card)
  const category = card.category?.trim()
  return {
    category: category != null && category !== "" ? category : null,
    timeMin: meta.timeMin,
    servings: meta.servings,
    rating: resolveCardRating(card.rating),
    saveCount: card.saveCount > 0 ? card.saveCount : null,
  }
}

/** 가운뎃점으로 잇는다. 빈 조각은 버려서 ` ·  · ` 가 생기지 않게 한다. */
export function joinMetaParts(parts: readonly (string | null)[]): string {
  return parts
    .filter((part): part is string => part != null && part.trim() !== "")
    .join(" · ")
}

// ---------------------------------------------------------------------------
// 영양 한 줄의 무게
// ---------------------------------------------------------------------------

/**
 * 영양 줄을 **얼마나 크게 말할 것인가**.
 *
 * ■ 고친 결함
 *
 * 이 줄은 모든 카드에서 브랜드 주황 + 굵은 글씨였다. 그래서 목록을 훑으면 **레시피
 * 이름보다 영양 줄이 먼저 보였다** — 사용자가 고르는 것은 요리인데 화면은 매 카드마다
 * 수치를 외쳤다. "모든 카드가 소리친다" 는 것은 곧 **아무 카드도 소리치지 않는다**는
 * 뜻이다: 강조가 모든 곳에 있으면 강조가 아니다.
 *
 * ■ 어디까지가 사실인가 (임상 규칙)
 *
 * 강조를 "언제" 켜는지가 이 함수의 전부이고, 여기서 **없는 판정을 만들면 안 된다.**
 * 서버는 `percentOfRemaining`(내 남은 참고량 대비 %)만 준다. 그건 계산된 숫자이지
 * "이 레시피가 당신에게 맞다/안 맞다" 는 판정이 아니다. 그래서:
 *
 *   - `>= 100` 일 때만 강조한다. 이건 판정이 아니라 **산수**다 — 1인분이 오늘 남은 양을
 *     넘는다는 사실은 서버가 준 숫자 안에 이미 들어 있다.
 *   - `70%` 같은 중간 구간에 "주의" 를 만들지 **않는다.** 그 문턱은 우리가 지어내는
 *     임상 판단이고, 서버는 그런 것을 계산하지 않는다.
 *   - 강조에 `danger`/`caution`(빨강·앰버)을 쓰지 않는다. 그 색들은 "위험" 이라는
 *     **판정을 말하는 색**이다. 넘는다는 산수는 브랜드색 강조로 충분하다.
 *
 * 수치가 추정값이라는 사실은 목록이 따로 한 번 말한다(`hasEstimatedNutrition`).
 */
export type HeadlineEmphasis = "supporting" | "overBudget"

/** 오늘 남은 양을 1인분이 다 쓰거나 넘기는 지점. 판정이 아니라 산수의 경계다. */
export const HEADLINE_OVER_BUDGET_PERCENT = 100

export function resolveHeadlineEmphasis(
  headline: NutrientHeadline | null,
): HeadlineEmphasis {
  const percent = headline?.percentOfRemaining
  if (percent == null) return "supporting"
  return percent >= HEADLINE_OVER_BUDGET_PERCENT ? "overBudget" : "supporting"
}

// ---------------------------------------------------------------------------
// 사진 자리
// ---------------------------------------------------------------------------

/**
 * 사진 자리에 무엇이 들어가는가. **한 컴포넌트가 두 경우를 다 그린다**(`PhotoWell`).
 *
 * 큐레이션 175건은 `thumbnail_url` 이 전부 NULL 이고 원본 JSON 에 이미지 필드가 애초에
 * 없다. 그래도 사진 자리를 지금 만들어 두는 이유는 `thumbnailUrl` 이 들어오는 날 **UI 를
 * 다시 만들지 않기 위해서**다 — 그 약속이 지켜지는지 확인할 수 있어야 하므로 판정을
 * JSX 밖에 둔다.
 */
export type CardPhotoSlot =
  | { kind: "photo"; uri: string; cacheKey: string }
  | { kind: "art"; category: string | null }

/**
 * 서버 `thumbnailUrl` 은 GCS **서명 URL** 이라 쿼리(서명·만료)가 응답마다 다르다.
 * expo-image 는 기본으로 URL 전체를 캐시 키로 쓰므로, 같은 사진이 재조회마다 캐시
 * 미스가 나서 목록 전체가 다시 내려온다(스크롤 중 사진이 하나씩 갈아끼워지는 증상).
 * 경로 부분만 캐시 키로 쓰면 서명이 돌아도 같은 객체는 같은 키다.
 */
export function stablePhotoCacheKey(uri: string): string {
  const queryStart = uri.indexOf("?")
  return queryStart === -1 ? uri : uri.slice(0, queryStart)
}

/**
 * 빈 문자열·공백만 있는 `thumbnailUrl` 을 **없는 것으로 취급한다.**
 *
 * `!= null` 만 보면 `thumbnailUrl: ""` 인 행에서 빈 uri 로 `Image` 를 그리게 되고, 화면에는
 * 사진도 일러스트도 없는 회색 사각형이 남는다(깨진 사진처럼 보인다). 서버가 빈 문자열을
 * 보낼 수 있는지는 앱이 정할 수 없으니 여기서 막는다.
 */
export function resolveCardPhotoSlot(card: RecipeCard): CardPhotoSlot {
  const uri = card.thumbnailUrl?.trim()
  if (uri != null && uri !== "")
    return { kind: "photo", uri, cacheKey: stablePhotoCacheKey(uri) }
  return { kind: "art", category: card.category }
}

export interface PhotoWellGeometry {
  /** 사진 자리의 가로:세로. 두 변형 모두 정사각이다. */
  aspectRatio: number
  radius: number
  /** 사진이 없을 때 안에 놓는 그림의 한 변. 자리 크기가 아니다. */
  artSize: number
}

/**
 * 사진 자리의 모양. **인자가 `variant` 뿐인 것이 이 함수의 요점이다** — 사진이 있는지
 * 여부가 모양에 들어올 수 없으므로 `thumbnailUrl` 이 채워지는 날 레이아웃이 흔들리지
 * 않는다(카드마다 높이가 달라지면 사용자가 읽던 줄을 잃는다).
 *
 * ■ 크기를 줄인 이유 (실측)
 *
 * 이 자리에는 **사진이 없다.** 개발 DB 실측(2026-07-31): `recipe` 175행 중
 * `image_url`·`thumbnail_url`·`detail_image_url` 이 채워진 행은 **0건**이고, API 응답의
 * `thumbnailUrl` 도 전부 `null` 이다. 즉 지금 화면에 보이는 것은 100% 픅토그램이다.
 *
 * 그런데 자리는 사진 크기(캐러셀 152 정사각 / 목록 96 정사각)였고 그 안의 그림은
 * 60·44 였다. 큰 회색 사각형 가운데 작은 그림 → 사용자에게는 **"사진을 못 불러온 자리"**
 * 로 읽힌다. 실제로 그렇게 지적됐다("전부 같은 노란 그릇 자리표시자").
 *
 * 그래서 자리를 그림에 맞춘다:
 *   - 캐러셀: 정사각 → **4:3**. 세로 152 → 114. 사진이 들어오는 날에도 4:3 은 요리
 *     사진의 자연스러운 비율이라 다시 고칠 일이 없다. 그림은 60 → 52.
 *   - 목록 줄: 96 → **72**(`RECIPE_ROW_THUMB`), 그림 44 → 36(`RECIPE_ROW_ART`).
 *     줄 쪽 값의 정본은 `recipeRowLayout.ts` 이고 여기서는 **그림 크기만** 말한다.
 *
 * 그림을 자리에 꽉 채우지는 않는다 — 픅토그램을 자리 폭까지 키우면 선이 굵어져
 * "일부러 놓은 타일" 이 아니라 "깨진 사진" 으로 되돌아간다.
 */
export function resolvePhotoWellGeometry(
  variant: "carousel" | "row",
): PhotoWellGeometry {
  return variant === "carousel"
    ? { aspectRatio: 4 / 3, radius: 14, artSize: 52 }
    : { aspectRatio: 1, radius: 12, artSize: 36 }
}

/**
 * 사진 우상단 저장 표시. **핸들러가 없고 저장돼 있지도 않으면 아무것도 그리지 않는다** —
 * 누를 곳이 없는 빈 북마크는 "눌러서 저장하는 곳" 으로 보이면서 아무 일도 하지 않는
 * 죽은 컨트롤이 된다(없는 것보다 나쁘다).
 *
 * 저장된 카드의 채워진 표시는 핸들러가 없어도 맞다 — 그것은 컨트롤이 아니라 **정보**
 * ("이미 보관함에 있다")다. 그래서 `mode` 로 갈라 화면이 역할(button/정보)까지 다르게
 * 준다(정보에 `accessibilityRole="button"` 을 붙이면 스크린리더가 없는 버튼을 찾게 만든다).
 */
export type CardBookmarkDisplay =
  | null
  | { mode: "button"; saved: boolean }
  | { mode: "indicator"; saved: true }

export function resolveCardBookmark(input: {
  saved: boolean
  canToggle: boolean
}): CardBookmarkDisplay {
  if (input.canToggle) return { mode: "button", saved: input.saved }
  if (input.saved) return { mode: "indicator", saved: true }
  return null
}

/**
 * 목록 어디에든 추정치가 섞여 있는가. 카드마다 배지를 붙이면 §6.4(한 화면에 강조 하나)
 * 가 깨지므로, 목록 상단에 한 줄로 한 번만 알린다.
 */
export function hasEstimatedNutrition(cards: readonly RecipeCard[]): boolean {
  return cards.some(
    (card) =>
      card.nutrition != null &&
      card.nutrition.provenance !== "nutritionist_reviewed",
  )
}
