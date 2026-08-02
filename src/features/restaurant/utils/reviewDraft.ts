/**
 * 후기 작성 초안의 검증·서식 규칙. **화면이 아니라 여기가 정본이다.**
 *
 * ## 왜 화면에서 떼어 냈나
 *
 * `jest.config.ts` 는 `ts-jest` + `testEnvironment: "node"` 뿐이고
 * `@testing-library/react-native` 도 `react-test-renderer` 도 없다 — 컴포넌트는
 * 렌더 테스트가 **불가능**하다. 그래서 "언제 등록 버튼이 열리는가" 같은 규칙을
 * JSX 안에 두면 영원히 테스트 밖에 남는다. 순수 함수로 내려 두면 테스트가 붙는다.
 *
 * ## 왜 결함을 배열로 돌려주는가
 *
 * 목업 -26 의 `등록` 은 비활성 상태로만 그려져 있다. 그런데 비활성 버튼은
 * `onPress` 가 아예 안 불리므로, 그 상태로 끝내면 사용자는 **무엇이 빠졌는지 알 수 없다**.
 * 화면은 이 배열의 첫 항목을 문구로 띄워 "별점을 먼저 선택해 주세요" 를 말한다.
 * boolean 하나만 돌려주면 그 문구를 만들 수 없다.
 */

import type { ReviewKeyword } from "../types"

/** 목업 -26 의 `0/ 300`. 카운터 표기와 `maxLength` 가 같은 상수를 본다. */
export const REVIEW_CONTENT_MAX = 300

/**
 * 한 후기에 붙일 수 있는 사진 수. 커뮤니티 글(5장)과 같게 맞췄다 —
 * 업로드 경로(`imageUploadService`)가 같으므로 한도가 다르면 사용자가 규칙을 두 개 외워야 한다.
 */
export const REVIEW_MAX_PHOTOS = 5

/**
 * 초안이 아직 만족하지 못한 요건. 순서가 곧 **안내 우선순위**다 —
 * 별점부터 묻는 것이 목업의 화면 순서와 같다.
 */
export type ReviewDraftDefect =
  | "RATING_MISSING"
  | "CONTENT_EMPTY"
  | "CONTENT_TOO_LONG"

export interface ReviewDraftInput {
  /** 1..5. `0` 은 "아직 안 고름". */
  rating: number
  content: string
  keywords: readonly ReviewKeyword[]
  /** 로컬 uri 목록. 업로드는 제출 시점에 한다. */
  photoUris: readonly string[]
}

/**
 * 결함 목록. 화면 순서(별점 → 본문)대로 담는다.
 *
 * 키워드는 **필수가 아니다** — 목업의 `여러 개 선택 가능합니다` 는 선택 안내지 강제가 아니다.
 * 사진도 필수가 아니다(사진 없는 후기가 2039건 중 대다수다).
 */
export function reviewDraftDefects(
  draft: ReviewDraftInput,
): ReviewDraftDefect[] {
  const defects: ReviewDraftDefect[] = []
  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5) {
    defects.push("RATING_MISSING")
  }
  const trimmed = draft.content.trim()
  if (trimmed.length === 0) defects.push("CONTENT_EMPTY")
  // `maxLength` 가 입력을 이미 자르므로 사실상 도달하지 않는다. 그래도 남긴다 —
  // 붙여넣기·IME 조합·플랫폼별 `maxLength` 차이로 새는 경로를 화면이 조용히 통과시키지 않게.
  if (trimmed.length > REVIEW_CONTENT_MAX) defects.push("CONTENT_TOO_LONG")
  return defects
}

/** `등록` 버튼의 활성 조건. 결함이 하나도 없을 때만 열린다. */
export function isReviewDraftReady(draft: ReviewDraftInput): boolean {
  return reviewDraftDefects(draft).length === 0
}

/** `restaurant.review.form.*` 아래의 안내 문구 키. 결함 1:1. */
export function reviewDefectMessageKey(defect: ReviewDraftDefect): string {
  switch (defect) {
    case "RATING_MISSING":
      return "restaurant.review.form.needRating"
    case "CONTENT_EMPTY":
      return "restaurant.review.form.needContent"
    case "CONTENT_TOO_LONG":
      return "restaurant.review.form.tooLong"
  }
}

/**
 * 순번 배지에 쓸 1-based 선택 순서. 미선택이면 `null`.
 *
 * 목업 -27/-28 의 주황 원 안 숫자는 **고른 순서**다. `indexOf` 로 매번 구하면
 * 타일 N개 × 선택 M개 = O(N·M) 이라 100장 그리드에서 스크롤이 눈에 띄게 끊긴다.
 * 화면은 이 함수로 만든 Map 을 한 번만 만들어 쓴다.
 */
export function selectionOrderMap(
  selected: readonly string[],
): Map<string, number> {
  const map = new Map<string, number>()
  selected.forEach((uri, index) => {
    if (!map.has(uri)) map.set(uri, index + 1)
  })
  return map
}

/**
 * 선택 토글. 이미 있으면 빼고(뒤 순번이 자동으로 하나씩 당겨진다), 없으면 뒤에 붙인다.
 * 한도를 넘기면 **원본을 그대로 돌려준다** — 조용히 앞의 것을 밀어내면 사용자가
 * 고른 사진이 이유 없이 사라진다.
 */
export function toggleSelection(
  selected: readonly string[],
  uri: string,
  max: number = REVIEW_MAX_PHOTOS,
): readonly string[] {
  if (selected.includes(uri)) return selected.filter((item) => item !== uri)
  if (selected.length >= max) return selected
  return [...selected, uri]
}
