/**
 * 조회 실패를 **원인별로** 분류한다. 기능에 매이지 않는(feature-neutral) 판정 규칙 한 벌.
 *
 * ## 정본은 식당 기능이 먼저 썼다
 *
 * 이 규칙의 원본은 `src/features/restaurant/utils/fetchError.ts` 다. 그 파일 머리말이
 * 이 분류가 왜 필요했는지를 실측으로 적어 뒀다 — 훅이 `if (query.isError) return
 * "NETWORK_FAILURE"` 한 줄이라 **400 을 와이파이 문제로** 알리고 있었다는 것이다.
 *
 * 레시피에서 **같은 결함이 그대로 재현됐다.** 없는 레시피(`/recipes/1` → 404
 * `COMMON_ERROR_004`)를 열면 화면이 `레시피를 불러오지 못했어요 / 인터넷 연결을 확인한
 * 뒤 다시 시도해 주세요.` 를 그린다. 시뮬레이터에서 `sinsin:///recipe/1` 로 재현했다.
 * 사용자는 고칠 수 없는 것(자기 인터넷)을 고치려 하고, 우리는 그 제보를 "네트워크 이슈"
 * 로 닫는다. 화면이 원인을 가려 주는 것이 이 결함의 진짜 비용이다.
 *
 * ## 왜 식당 파일을 import 하지 않고 여기에 옮겨 적었나
 *
 * 두 가지 이유이고, 둘 다 "고르는 문제" 가 아니라 제약이다.
 *
 * 1. **식당 모듈을 레시피가 import 하면 안 된다**(기능 간 결합 금지). 그리고 지금
 *    `src/features/restaurant/` 는 다른 작업자가 동시에 고치고 있어 그 파일을 옮기는
 *    변경은 충돌한다.
 * 2. 식당 쪽 `classifyFetchFailure` 는 **식당 타입에 묶여 있다** — 반환형이
 *    `EmptyReason`(식당 목록의 빈 상태 유니온)이고, `isRestaurantShapeError` ·
 *    `isRestaurantRequestError` 라는 식당 전용 오류 클래스를 본다. 그대로는 옮길 수 없다.
 *
 * 그래서 **판정 규칙만** 여기로 끌어냈다. 식당 쪽은 지금 손대지 않고, 그 기능이 열리면
 * 자기 파일을 이 함수 위에 얹으면 된다(식당 전용 두 갈래를 앞에 두고 나머지를 위임).
 * 그때까지 규칙은 두 곳에 있고, 그 사실을 여기에 적어 두는 것이 이 주석의 목적이다.
 *
 * ## 식당판과 의도적으로 다른 점: `NOT_FOUND` 를 갈라 놓았다
 *
 * 식당은 404 를 `REQUEST_REJECTED`(우리 요청 결함)로 함께 묶는다. 목록·지도에서는 맞는
 * 판단이다 — 404 가 나올 자리가 없으니 나오면 우리 버그다. 하지만 **상세 화면에서는
 * 404 가 정상 경로**다: 지워진 레시피, 오래된 링크, 남이 보낸 딥링크. 그걸 "앱에 문제가
 * 생겼어요" 로 말하면 두 번째 거짓말이 된다. 그래서 갈래를 하나 더 둔다.
 *
 * ## 401 은 여기 오지 않는다
 *
 * 토큰 만료는 `api` 인스턴스의 응답 인터셉터가 refresh 후 재시도하고, 실패하면 세션을
 * 정리해 로그인으로 보낸다. 만약 새어 나오면 `REQUEST_REJECTED` 로 떨어지는데 그건
 * 정확히 맞는 분류다(인증 없이 보낸 요청이므로).
 */

// 배럴(`@/src/services/core`)이 아니라 모듈을 직접 집는다. 배럴은 `apiClient` →
// `tokenService` → `expo-secure-store` 까지 끌고 오고, 그러면 이 순수 함수를 테스트하려면
// 네이티브 모듈을 목킹해야 한다. 분류에 필요한 것은 오류의 모양 하나뿐이다.
import { isApiErrorLike } from "@/src/services/core/apiError"
import { logger } from "@/src/lib/logger"

/**
 * 실패의 갈래. **0건(데이터 없음)은 여기 없다** — 그건 실패가 아니라 결과다.
 * 빈 목록을 붉은 오류 시각언어로 그리면 "준비 중" 을 "고장" 으로 말하게 된다.
 */
export type FetchFailureKind =
  /** 응답이 오지 않았다. **여기서만** 인터넷을 언급해도 된다. */
  | "NETWORK_FAILURE"
  /** 5xx. 사용자 잘못도 우리 요청 잘못도 아니다. 기다리면 대개 낫는다. */
  | "SERVER_ERROR"
  /** 404. 그 자원이 없다. 재시도해도 영원히 없다 — 재시도 버튼을 주면 안 된다. */
  | "NOT_FOUND"
  /** 그 밖의 4xx. **우리가 잘못된 요청을 보냈다.** 사용자에게 인터넷을 묻지 않는다. */
  | "REQUEST_REJECTED"

/**
 * 실패 갈래를 고르고 **로그를 남긴다.**
 *
 * 로그가 이 함수의 절반이다. 우리 쪽 결함(4xx)은 화면에 한 문장만 남기고 사라지므로,
 * 어느 엔드포인트가 어떤 코드로 거절됐는지 남기지 않으면 다음 사람이 재현할 방법이 없다.
 * 실제로 이 결함이 오래 남은 이유가 그것이다.
 *
 * @param scope `recipe-detail` / `recipe-reviews` 처럼 **어느 질의였는지**. 로그에서
 *   화면을 되짚는 유일한 단서라 호출부마다 다르게 준다.
 */
export function classifyFetchFailure(
  error: unknown,
  scope: string,
): FetchFailureKind {
  if (isApiErrorLike(error)) {
    // 1) 응답이 아예 오지 않았다. 상태 코드가 없는 오류도 같은 취급이다
    //    (요청이 나가지 못했다는 뜻이다).
    if (error.isNetworkError === true || error.statusCode === undefined) {
      logger.warn("[fetch] 통신 실패", scope, error.code)
      return "NETWORK_FAILURE"
    }

    // 2) 서버가 터졌다.
    if (error.statusCode >= 500) {
      logger.error(
        "[fetch] 서버 오류",
        scope,
        String(error.statusCode),
        error.code,
      )
      return "SERVER_ERROR"
    }

    // 3) 그 자원이 없다. 사용자가 재시도로 고칠 수 있는 것이 아니다.
    //    `code`(서버 도메인 코드)를 남긴다 — 404 가 "id 가 틀렸다" 인지 "지워졌다" 인지는
    //    서버 코드로만 갈린다.
    if (error.statusCode === 404) {
      logger.warn("[fetch] 없는 자원", scope, error.code)
      return "NOT_FOUND"
    }

    // 4) 나머지 4xx — 우리가 잘못된 요청을 보냈다. `fieldErrors` 까지 남기지 않으면
    //    400 은 재현 불가능한 제보가 된다.
    logger.error(
      "[fetch] 잘못된 요청",
      scope,
      String(error.statusCode),
      error.code,
      error.fieldErrors ?? "(fieldErrors 없음)",
    )
    return "REQUEST_REJECTED"
  }

  // 5) `ApiError` 모양도 아니면 인터셉터를 거치지 않은 것 — 우리 코드가 던진 예외다.
  //    통신 문제로 분류하면 원인을 영원히 못 찾는다.
  logger.error(
    "[fetch] 알 수 없는 조회 실패",
    scope,
    error instanceof Error ? error.message : String(error),
  )
  return "REQUEST_REJECTED"
}
