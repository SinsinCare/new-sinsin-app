/**
 * 조회 실패를 **원인별로** 분류한다. 목록·지도 훅이 `EmptyReason` 을 고를 때 쓴다.
 *
 * ## 왜 필요했나 — 400 을 와이파이 문제로 알리고 있었다
 *
 * 훅이 하던 일은 이 한 줄이었다.
 *
 * ```ts
 * if (query.isError) return "NETWORK_FAILURE"
 * ```
 *
 * 그래서 실패는 모두 `식당 목록을 불러오지 못했어요 / 인터넷 연결을 확인한 뒤 다시 불러와
 * 주세요` 가 됐다. 문제는 이 기능이 실제로 내던 오류가 대부분 **400** 이었다는 점이다 —
 * 뒤집힌 bbox, 카탈로그에 없는 필터 키, 깨진 커서. 전부 우리가 만든 잘못된 요청이다.
 *
 * 그 오분류가 두 방향으로 비쌌다.
 * 1. 사용자는 고칠 수 없는 것(자기 인터넷)을 고치려 한다. 앱이 거짓말을 한 것이다.
 * 2. 우리는 그 리포트를 "네트워크 이슈" 로 분류해 닫는다. 이 기능이 "만들어졌는데 동작하지
 *    않는" 상태로 오래 남은 이유 중 하나가 이것이다 — 화면이 원인을 가려 주고 있었다.
 *
 * ## 분류의 근거는 `ApiError` 다
 *
 * `apiClient` 의 인터셉터가 axios 오류·비즈니스 오류를 모두 `ApiError` 로 바꿔 주므로
 * (`isNetworkError`, `statusCode`, `code`) 여기서 axios 를 다시 들여다볼 필요가 없다.
 * 그 정규화를 우회해 `isAxiosError` 를 여기서 부르지 말 것 — 판정 규칙이 두 곳에 생긴다.
 *
 * ## 401 은 여기 오지 않는다
 *
 * 토큰 만료는 `api` 인스턴스의 응답 인터셉터가 refresh 후 재시도하고, 실패하면 세션을
 * 정리해 로그인으로 보낸다. 그 흐름을 빈 상태로 그리면 사용자는 로그아웃된 이유를 모른 채
 * "다시 불러오기" 를 누른다. 만약 새어 나오면 아래에서 `REQUEST_REJECTED` 로 떨어지는데,
 * 그건 정확히 맞는 분류다(우리가 인증 없이 보낸 요청이므로).
 */

// 배럴(`@/src/services/core`)이 아니라 모듈을 직접 집는다. 배럴은 `apiClient` →
// `tokenService` → `expo-secure-store` 까지 끌고 오고, 그러면 이 순수 함수를 테스트하려면
// 네이티브 모듈을 목킹해야 한다. 분류 규칙에 필요한 것은 오류 클래스 하나뿐이다.
import { ApiError } from "@/src/services/core/apiError"
import { isRestaurantShapeError } from "@/src/services/data/restaurantShape"
import { logger } from "@/src/lib/logger"

import type { EmptyReason, ExcludedForMissingDataDto } from "../types"
import {
  backendMismatchMessage,
  isMisroutedCollectionRequest,
} from "./backendMismatch"
import { isRestaurantRequestError } from "./requestGuards"

/** 실패 이유만 골라낸 부분집합. 0건(데이터 없음)은 실패가 아니라 여기 없다. */
export type FetchFailureReason = Extract<
  EmptyReason,
  "NETWORK_FAILURE" | "SERVER_ERROR" | "REQUEST_REJECTED" | "RESPONSE_MALFORMED"
>

/**
 * 실패 이유 → 문구 키. **분류와 문구를 같은 파일에 둔다.**
 *
 * 표가 컴포넌트 안에 있으면 (1) 갈래를 더할 때 분류와 문구가 따로 움직이고
 * (2) 화면을 두 곳(`MapEmptyState`, `RestaurantListScreen.ListEmpty`)에서 그리는 이 기능에서
 * 표가 복사돼 한쪽만 고쳐진다 — 그러면 그 화면에서만 400 이 다시 "인터넷 확인" 이 된다.
 * 그게 정확히 이 파일이 고친 결함이다. 표는 여기 하나뿐이고, RN 을 import 하지 않으므로
 * 테스트가 네이티브 목킹 없이 검증할 수 있다.
 *
 * `NETWORK_FAILURE` 의 본문(`listBody`)만 인터넷을 언급한다. 나머지 셋은 언급하지 않고,
 * 우리 결함인 두 갈래는 "인터넷 문제는 아니에요" 로 **부정형**으로만 짚는다.
 */
const FAILURE_COPY = {
  NETWORK_FAILURE: {
    titleKey: "restaurant.error.listTitle",
    bodyKey: "restaurant.error.listBody",
    retryKey: "restaurant.error.listRetry",
  },
  SERVER_ERROR: {
    titleKey: "restaurant.error.serverTitle",
    bodyKey: "restaurant.error.serverBody",
    retryKey: "restaurant.error.serverRetry",
  },
  REQUEST_REJECTED: {
    titleKey: "restaurant.error.appBugTitle",
    bodyKey: "restaurant.error.appBugBody",
    retryKey: "restaurant.error.appBugRetry",
  },
  RESPONSE_MALFORMED: {
    titleKey: "restaurant.error.malformedTitle",
    bodyKey: "restaurant.error.malformedBody",
    retryKey: "restaurant.error.malformedRetry",
  },
} as const

export interface FailureCopy {
  titleKey: string
  bodyKey: string
  retryKey: string
}

/**
 * 실패 갈래인가 — 맞으면 그 문구 키들, 아니면 `null`.
 *
 * `null` 은 "0건이지만 오류는 아니다"(`NO_DATA_HERE`·`FILTERED_TO_ZERO`)를 뜻하고,
 * 그 둘은 붉은 오류 시각언어를 쓰지 않는다 — 준비 중인 지역을 경고로 알리지 않기 위해서다.
 */
export function failureSpec(reason: EmptyReason): FailureCopy | null {
  return reason in FAILURE_COPY
    ? FAILURE_COPY[reason as FetchFailureReason]
    : null
}

/**
 * 실패 이유를 고르고 **로그를 남긴다.**
 *
 * 로그가 이 함수의 절반이다. 우리 쪽 결함(4xx·모양 불일치)은 화면에 한 문장만 남기고
 * 사라지므로, 어느 엔드포인트가 어떤 코드로 거절됐는지 남기지 않으면 다음 사람이 재현할
 * 방법이 없다. `logger.error` 는 프로덕션에서도 남는다.
 *
 * @param scope `map` / `list` / `bookmarks` — 어느 화면의 질의였는지.
 */
export function classifyFetchFailure(
  error: unknown,
  scope: string,
): FetchFailureReason {
  // 1) 응답 모양이 계약과 다르다. 우리 버그이고, 통신은 성공했다.
  //    `RestaurantShapeError` 가 이미 어느 키가 없었는지 로그에 남겼으므로 여기서는
  //    화면 맥락만 덧붙인다.
  if (isRestaurantShapeError(error)) {
    logger.error(
      "[restaurant] 응답 모양 불일치로 빈 상태",
      scope,
      error.endpoint,
      error.missing.join(","),
    )
    return "RESPONSE_MALFORMED"
  }

  // 1-b) 우리 관문이 **보내기 전에** 막았다(`utils/requestGuards`). 통신은 일어나지 않았다.
  //      정상 경로에서는 도달할 수 없다 — 지도 화면은 면적 초과를 pill 문구로 미리 말하고,
  //      훅은 좌표 없는 거리순을 `effectiveSort` 로 되돌린다. 그러므로 여기 왔다는 것은
  //      그 관문을 우회한 호출부가 있다는 뜻이고, 그건 정확히 "우리 요청 결함" 이다.
  //      이유를 남기지 않으면 "왜 목록이 비었는가" 를 다음 사람이 되짚을 수 없다.
  if (isRestaurantRequestError(error)) {
    logger.error(
      "[restaurant] 관문이 요청을 막아 빈 상태",
      scope,
      error.endpoint,
      error.reason,
      error.message,
    )
    return "REQUEST_REJECTED"
  }

  if (error instanceof ApiError) {
    // 2) 응답이 아예 오지 않았다. **여기서만** 인터넷을 언급한다.
    //    상태 코드가 없는 오류도 같은 취급이다(요청이 나가지 못했다는 뜻이다).
    if (error.isNetworkError || error.statusCode === undefined) {
      logger.warn("[restaurant] 통신 실패", scope, error.code)
      return "NETWORK_FAILURE"
    }

    // 3) 서버가 터졌다. 사용자 잘못도 우리 요청 잘못도 아니다.
    if (error.statusCode >= 500) {
      logger.error(
        "[restaurant] 서버 오류",
        scope,
        String(error.statusCode),
        error.code,
      )
      return "SERVER_ERROR"
    }

    /*
      4-a) 4xx 중 **환경 문제**를 먼저 가려낸다.

      경로 파라미터의 정수 파싱 실패(`path.* / int_parsing`)는 우리가 보낸 값이 틀린 게
      아니다 — 그 파라미터를 보낸 적이 없기 때문이다. 정적 경로(`/restaurants/search`)가
      `/{restaurant_id}` 로 흡수됐다는 뜻이고, 원인은 **그 라우트가 이 서버에 없다** 하나다.

      실제로 이 신호를 못 읽어서 식당 탭 전체가 "만들었는데 안 되는 기능" 으로 남아
      있었다(앱이 v2 식당 API 가 없는 백엔드를 보고 있었다). 사용자 문구는 그대로 두고
      (그들이 할 수 있는 일이 없다) **개발자에게 이름을 붙여** 말한다.
    */
    if (
      isMisroutedCollectionRequest({
        statusCode: error.statusCode,
        fieldErrors: error.fieldErrors,
      })
    ) {
      logger.error(backendMismatchMessage(scope), error.code)
      return "REQUEST_REJECTED"
    }

    // 4-b) 그 밖의 4xx — 우리가 잘못된 요청을 보냈다. 사용자에게 인터넷을 묻지 않는다.
    //    `code`(서버의 도메인 코드)와 `fieldErrors`(어느 파라미터가 문제였는지)를
    //    함께 남긴다. 이 두 값이 없으면 400 은 재현 불가능한 제보가 된다.
    logger.error(
      "[restaurant] 잘못된 요청",
      scope,
      String(error.statusCode),
      error.code,
      error.fieldErrors ?? "(fieldErrors 없음)",
    )
    return "REQUEST_REJECTED"
  }

  // 5) `ApiError` 도 아니면 인터셉터를 거치지 않은 것 — 우리 코드가 던진 예외다
  //    (훅의 `throw new Error("viewport not committed")` 같은 것). 통신 문제로
  //    분류하면 원인을 영원히 못 찾는다.
  logger.error(
    "[restaurant] 알 수 없는 조회 실패",
    scope,
    error instanceof Error ? error.message : String(error),
  )
  return "REQUEST_REJECTED"
}

/**
 * 축별 제외 수의 합.
 *
 * 서버는 `excludedForMissingData` 를 `{ nutritionTags: 3 }` 객체로 준다. 앱이 이걸
 * `number` 로 선언해 두는 바람에 화면의 `> 0` 비교가 **항상 false** 였고, "영양 정보가
 * 아직 없는 N곳은 빠졌어요" 안내가 한 번도 뜨지 않았다. 합으로 읽으면 서버가 제외 축을
 * 더해도(예: 영업시간 없음) 안내가 저절로 따라온다.
 */
export function totalExcluded(
  excluded: ExcludedForMissingDataDto | undefined,
): number {
  if (!excluded) return 0
  let sum = 0
  // 선언된 키만 더하지 않고 실제 키를 훑는다 — 서버가 축을 더했을 때 DTO 를 고치기 전에도
  // 안내가 따라오게(그리고 합이 0 이라 안내가 사라지는 일이 없게) 하기 위한 것이다.
  for (const value of Object.values(excluded)) {
    if (typeof value === "number") sum += value
  }
  return sum
}
