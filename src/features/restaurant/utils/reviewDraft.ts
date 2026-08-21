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
 *
 * ## 왜 순수 모듈이 토스트를 부르는가
 *
 * 아래 `showReviewPhotoNotice` 하나만 예외다. 사진 결과의 **판정 → 문구 → 표면**을
 * 화면에서 조립하던 동안, 화면에는 `if (notice.tone === "success") …` 세 갈래가 남아
 * 있었고 그 분기 **앞에** 이른 return 한 줄을 넣는 것만으로 출시됐던 결함(전량 실패인데
 * 성공 토스트)이 그대로 되살아났다 — 소스에 문자열이 다 남아 있으니 `toContain` 단언은
 * 전부 통과했다. 그래서 표면 선택까지 여기서 끝내고 화면에는 **호출 한 줄**만 남긴다.
 * 화면이 못 하는 일은 화면에서 틀릴 수도 없다.
 */

import {
  showCautionToast,
  showErrorToast,
  showSuccessToast,
} from "@/src/lib/toast"

import type { ReviewKeyword, ReviewSubmitPayload } from "../types"

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

/* ────────────────────────── 제출 본문 ────────────────────────── */

/**
 * `POST /restaurants/:id/reviews` 로 나가는 **JSON 본문 그 자체**.
 *
 * 이 함수가 있는 이유는 하나다: **필드 이름이 틀려도 아무도 안 터진다.** 서버의
 * `createReviewBody`(TypeBox)는 non-strict 라 모르는 키를 그냥 통과시키고, 스키마에
 * 없는 키는 `normalizeReviewInput` 이 읽지도 않는다. 앱이 `imageUrls` 로 보내던 동안
 * 요청은 200 이었고, 후기는 저장됐고, 사진만 조용히 사라졌다 — 서버·앱 어느 쪽에도
 * 오류가 남지 않았다. 그래서 와이어 본문을 화면·서비스 밖 **순수 함수 한 곳**으로 내려
 * `tests/restaurantReviewSubmitContract.test.ts` 가 서버 스키마와 키를 대조한다.
 *
 * 되돌리지 말 것: 사진 경로의 키는 `imageObjectPaths` 다(서버 스키마가 정본,
 * `sinsin-be-bun/src/domains/restaurant/schemas.ts` 의 `createReviewBody`).
 * 값은 서명 URL 이 아니라 오브젝트 경로다 — 서명은 15분마다 회전하므로 URL 을 저장하면
 * 만료된 링크가 DB 에 굳는다.
 */
export function reviewSubmitBody(
  payload: ReviewSubmitPayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    rating: payload.rating,
    content: payload.content,
    keywords: payload.keywords,
  }
  // 안 고른 값은 **키째로 뺀다.** `undefined` 를 담아 두면 본문 키 집합이 호출부마다
  // 달라져서 계약 테스트가 무엇을 고정하는지 흐려진다.
  if (payload.menuName !== undefined) body.menuName = payload.menuName
  if (payload.imageObjectPaths !== undefined) {
    body.imageObjectPaths = payload.imageObjectPaths
  }
  return body
}

/* ────────────────────────── 사진 색인 결과 ────────────────────────── */

/**
 * 응답의 `photosIndexed` 를 **우리가 보낸 장수와 함께** 읽은 결과.
 *
 * 서버 의미(`engagementService.ts::createReview`): `-1` = 사진이 있었는데 색인 실패,
 * `0` = 사진이 **없었다**, `N` = N장 색인됨. 즉 `photosIndexed` 하나만 봐서는
 * 성공·실패를 가릴 수 없다 — `0` 은 우리가 0장 보냈으면 정상이고 3장 보냈으면 전멸이다.
 *
 * `INDEX_PENDING` 과 `FAILED` 를 나누는 이유가 이 표의 핵심이다. 서버에서 `-1` 은
 * **사진이 `restaurant_review.image_urls` 에 이미 저장된 뒤** `restaurant_photo` 색인만
 * 실패한 상태다. 후기 본문에 붙은 사진은 멀쩡히 있다. 이걸 "사진은 저장되지 않았어요" 로
 * 말하면 **거짓말**이고, 사용자는 멀쩡한 사진을 다시 올리려고 방금 쓴 후기를 지운다.
 * `0` 만이 "어디에도 없다" 이다.
 *
 * ## `INDEX_PENDING` 은 "아직" 이 아니다 — 서버 실측
 *
 * 이름과 달리 `-1` 은 **일시적인 상태가 아니다.** 서버(`sinsin-be-bun`)에 재시도 기전이
 * 하나도 없다는 것을 세어서 확인했다:
 *
 * - `insert into restaurant_photo` 는 `restaurant/engagementRepository.ts` 의
 *   `insertReviewPhotos` **한 곳**뿐이고, 그 호출부도 `engagementService.ts::createReview`
 *   **한 곳**뿐이다. 그 `try/catch` 는 `photosIndexed = -1` 을 대입할 뿐 어디에도 쌓지 않는다.
 * - restaurant 도메인 전체에 `reindex|backfill|retryPhoto|photoQueue|outbox` 가 **0건**이다.
 * - 사진 목록 쿼리는 `restaurant_photo` 만 읽고 `restaurant_review.image_urls` 는 안 본다.
 *
 * 즉 색인에 실패한 사진은 사진 탭에 **영원히** 안 뜬다(마이그레이션 072 의 백필은 그
 * 시점의 기존 행에만 적용됐다). 그래서 문구는 "잠시 뒤 보여요" 같은 **시간 약속을 하지
 * 않는다** — 아는 사실은 "후기에는 붙었다"와 "사진 탭에는 없다" 둘뿐이다. 안내 문구가
 * 다시 시간을 약속하면 `tests/restaurantReviewSubmitContract.test.ts` 가 잡는다.
 */
export type ReviewPhotoOutcome =
  | "NONE"
  | "ALL"
  | "PARTIAL"
  | "INDEX_PENDING"
  | "FAILED"

/**
 * 판정 입력. **객체로 받는다** — 두 값 다 `number` 라 위치 인자였을 때는 뒤바뀌어도
 * tsc 가 조용했다. `(sent=3, indexed=0)` 이 `(0, 3)` 으로 뒤집히면 `NONE` 이 나오고
 * 성공 토스트가 떠서 **원래 결함이 그대로 재발한다**. 이름을 달아 두면 그 실수가
 * 컴파일에서 죽는다.
 */
export interface ReviewPhotoCounts {
  /** 우리가 본문(`imageObjectPaths`)에 실어 보낸 오브젝트 경로 수. */
  readonly sent: number
  /** 응답의 `photosIndexed` 를 **그대로**. 보정하지 않는다. */
  readonly indexed: number
}

/**
 * 보낸 장수 `sent` 와 서버가 돌려준 `indexed` 로 판정한다.
 *
 * 되돌리지 말 것: **`indexed === -1` 만 실패로 보면 안 된다.** 앱이 필드 이름을 틀리게
 * 보내던 동안 서버는 "사진이 없었다"는 뜻의 `0` 을 돌려줬고, `-1` 만 보던 방어 코드는
 * 한 번도 켜지지 않았다. 사용자는 사진을 고르고, 성공 토스트를 보고, 사진은 어디에도
 * 없었다. 기준은 **보낸 만큼 들어왔는가**다.
 *
 * 되돌리지 말 것 2: `-1` 검사가 `indexed <= 0` 보다 **먼저**여야 한다. 순서를 바꾸면
 * `-1` 이 다시 `FAILED` 로 접혀 위의 거짓말이 돌아온다.
 */
export function reviewPhotoOutcome({
  sent,
  indexed,
}: ReviewPhotoCounts): ReviewPhotoOutcome {
  if (sent <= 0) return "NONE"
  // 유한한 수가 아니면(응답 드리프트) **성공이라고 말하지 않는다.** 모르는 것을
  // 성공으로 접는 폴백이 이 결함을 만들었다.
  if (!Number.isFinite(indexed)) return "FAILED"
  // 사진은 후기에 저장됐고 사진 탭 색인만 실패했다. `0`(= 전멸)과 다른 사실이다.
  if (indexed === -1) return "INDEX_PENDING"
  if (indexed <= 0) return "FAILED"
  // `PARTIAL`(0 < indexed < sent)은 **도달 가능하다.** 진짜 관문은 색인이 아니라 그
  // 앞단이다 — `engagementService.ts::createReview` 는 `storedPaths` 를 만들 때
  // `storedImageValue` 가 `null` 을 준 경로를 `.filter` 로 **조용히 걸러 낸다**. 3장 중
  // 1장이 걸러지면 색인은 2장만 하고 우리는 3장을 보냈으므로 그대로 `PARTIAL` 이다.
  // (`insertReviewPhotos` 자체가 문장 하나로 원자적인 것은 맞지만, 그건 걸러진 **뒤**의 이야기다.)
  //
  // 오늘 안 터지는 것은 앱 업로드 경로가 `uploads/general/…` 이고 `uploads/` 가
  // `community/storage.ts::OUR_OBJECT_PREFIXES` 에 들어 있는 **우연** 덕이다. 새 업로드
  // 폴더를 만들면서 그 목록에 한 줄 더하지 않는 날 바로 이 값이 나온다.
  return indexed >= sent ? "ALL" : "PARTIAL"
}

/**
 * 결과별 안내. 화면은 이 표만 읽는다.
 *
 * `PARTIAL` 에 `donePhotosFailed`("사진은 저장되지 않았어요")를 쓰지 않는다 — 3장 중
 * 1장이 올라간 상태에서 그렇게 말하면 사용자가 후기를 지우고 처음부터 다시 쓴다.
 * 성공한 장수를 그대로 말해 준다.
 *
 * 톤이 셋인 이유: 빨강(error)은 **사진이 어디에도 없다** 하나뿐이다. 부분 저장과
 * 색인 실패는 사용자가 할 일이 없는데 빨간 오류로 띄우면 "후기가 잘못됐나" 로 읽혀
 * 멀쩡한 글을 지우게 만든다 — `caution` 이 정확히 그 자리(`toast.ts::showCautionToast`
 * 머리말: "실패는 아닌데 그냥 넘기면 안 되는 것 — 부분 저장 …")다.
 */
export const REVIEW_PHOTO_NOTICE: Record<
  ReviewPhotoOutcome,
  { readonly key: string; readonly tone: "success" | "caution" | "error" }
> = {
  NONE: { key: "restaurant.review.form.done", tone: "success" },
  ALL: { key: "restaurant.review.form.done", tone: "success" },
  PARTIAL: { key: "restaurant.review.form.donePhotosPartial", tone: "caution" },
  INDEX_PENDING: {
    key: "restaurant.review.form.donePhotosIndexPending",
    tone: "caution",
  },
  FAILED: { key: "restaurant.review.form.donePhotosFailed", tone: "error" },
}

/** 화면이 부르는 **하나뿐인** 결정. 문구 키·톤·보간값이 한 번에 나온다. */
export interface ReviewPhotoNotice {
  readonly key: string
  readonly tone: "success" | "caution" | "error"
  /** i18n 보간값. 화면에서 다시 계산하지 않는다. */
  readonly params: { readonly indexed: number; readonly total: number }
}

/**
 * 판정 + 문구 + 톤을 한 함수로 묶는다.
 *
 * 이걸 나눠 두면 화면이 `reviewPhotoOutcome` 은 부르고 표는 안 보거나, 표는 보고
 * `Math.max` 보정을 자기 손으로 하다가 어긋난다. 실제로 판정 블록을 통째로 지우고
 * 무조건 성공 토스트로 되돌려도 스위트가 초록이었다 — 그래서 화면이 부르는 지점을
 * **한 곳으로 줄이고** 그 호출을 `tests/restaurantReviewSubmitContract.test.ts` 가
 * 소스로 고정한다.
 *
 * `indexed` 는 `-1`(색인 실패 신호)이 문구에 그대로 새지 않게 0 으로 눌러서 넘긴다.
 */
export function reviewPhotoNotice(
  counts: ReviewPhotoCounts,
): ReviewPhotoNotice {
  const notice = REVIEW_PHOTO_NOTICE[reviewPhotoOutcome(counts)]
  return {
    key: notice.key,
    tone: notice.tone,
    params: {
      indexed: Math.max(counts.indexed, 0),
      total: Math.max(counts.sent, 0),
    },
  }
}

/**
 * 톤 → 토스트 표면. **이 표가 배선의 유일한 지점이다.**
 *
 * 화면에 `if (tone === "success") showSuccessToast(...) else if …` 로 풀어 두면 짝이
 * 어긋나도(성공을 빨강으로, 사진 전멸을 초록으로) 소스에는 다섯 문자열이 그대로 남아
 * 아무 단언도 안 움직인다. 표 하나로 접어 두면 스왑이 **실행 결과**로 드러나고,
 * `tests/restaurantReviewSubmitContract.test.ts` 가 토스트 모듈을 목으로 바꿔
 * 다섯 줄 진리표마다 어느 표면이 떴는지 직접 확인한다.
 */
const REVIEW_PHOTO_SURFACE: Record<
  ReviewPhotoNotice["tone"],
  (message: string) => void
> = {
  success: showSuccessToast,
  caution: showCautionToast,
  error: showErrorToast,
}

/**
 * 화면이 제출 뒤에 부르는 **한 줄**. 판정·문구·톤·표면이 전부 여기서 끝난다.
 *
 * 화면에 남는 일은 `t()` 를 넘겨주는 것뿐이다 — i18n 의 `t` 는 화면의 훅에서 오고
 * 이 모듈은 그 훅을 부를 수 없으므로 **번역만** 인자로 받는다. 판정을 다시 계산하거나
 * 표면을 고르는 코드가 화면에 생기면 규칙이 두 곳으로 갈라지므로, 그것도 테스트가 막는다.
 */
export function showReviewPhotoNotice(
  counts: ReviewPhotoCounts,
  translate: (key: string, params: ReviewPhotoNotice["params"]) => string,
): void {
  const notice = reviewPhotoNotice(counts)
  REVIEW_PHOTO_SURFACE[notice.tone](translate(notice.key, notice.params))
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
