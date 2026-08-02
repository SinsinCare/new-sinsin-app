/**
 * 레시피 조회 실패 → **화면 문구**. 분류 규칙은 `@/src/shared/utils/fetchFailure` 에 있고
 * 여기에는 그 갈래를 무엇이라고 말할지만 둔다.
 *
 * ## 왜 표를 컴포넌트가 아니라 여기에 두나
 *
 * 식당 기능이 같은 표를 컴포넌트 안에 뒀다가 화면 두 곳(`MapEmptyState`,
 * `RestaurantListScreen`)으로 복사돼 한쪽만 고쳐지는 일을 겪었다
 * (`src/features/restaurant/utils/fetchError.ts` 머리말). 레시피도 실패를 그리는 자리가
 * 이미 둘 이상이다(상세·목록·보관함). 표는 여기 하나뿐이고, RN 을 import 하지 않으므로
 * 테스트가 네이티브 목킹 없이 검증한다.
 *
 * ## 지키는 규칙 두 가지
 *
 * 1. **인터넷은 `NETWORK_FAILURE` 에서만 언급한다.** 나머지는 인터넷을 말하지 않고,
 *    우리 결함인 갈래는 "인터넷 문제는 아니에요" 로 **부정형으로만** 짚는다.
 * 2. **`NOT_FOUND` 에는 재시도를 주지 않는다.** 없는 레시피는 다시 눌러도 영원히 없다.
 *    되는 일이 없는 버튼을 주는 것은 세 번째 거짓말이다 — 대신 목록으로 돌아갈 길을 준다.
 */
import type { ParseKeys } from "i18next"

import type { FetchFailureKind } from "@/src/shared/utils/fetchFailure"

/**
 * `recipe` 네임스페이스의 **유효한 키**만 받는다. `string` 으로 두면 오타가 화면에
 * 키 문자열로 그대로 렌더될 때까지 아무것도 실패하지 않는다 —
 * `tests/i18nKeyExistence.test.ts` 머리말이 실측으로 적어 둔 사고가 그것이다.
 * 여기서 좁혀 두면 오타는 컴파일에서 죽는다.
 */
export type RecipeKey = ParseKeys<"recipe">

export interface RecipeFailureCopy {
  titleKey: RecipeKey
  bodyKey: RecipeKey
  /**
   * 이 화면에서 **다시 해 볼 수 있는 행동**의 라벨 키.
   * `retry: false` 면 재시도가 원인을 고치지 못한다는 뜻이고, 화면은 그 자리에
   * "목록으로" 를 그린다.
   */
  actionKey: RecipeKey
  retry: boolean
}

/** 레시피 네임스페이스(`recipe`) 기준 키다. `t(key, { ns: "recipe" })` 로 읽는다. */
const RECIPE_FAILURE_COPY: Record<FetchFailureKind, RecipeFailureCopy> = {
  NETWORK_FAILURE: {
    titleKey: "detail.error.networkTitle",
    bodyKey: "detail.error.networkBody",
    actionKey: "detail.error.networkRetry",
    retry: true,
  },
  SERVER_ERROR: {
    titleKey: "detail.error.serverTitle",
    bodyKey: "detail.error.serverBody",
    actionKey: "detail.error.serverRetry",
    retry: true,
  },
  NOT_FOUND: {
    titleKey: "detail.error.notFoundTitle",
    bodyKey: "detail.error.notFoundBody",
    actionKey: "detail.error.notFoundBack",
    retry: false,
  },
  REQUEST_REJECTED: {
    titleKey: "detail.error.appBugTitle",
    bodyKey: "detail.error.appBugBody",
    actionKey: "detail.error.appBugRetry",
    retry: true,
  },
}

export function recipeFailureCopy(kind: FetchFailureKind): RecipeFailureCopy {
  return RECIPE_FAILURE_COPY[kind]
}

/**
 * 라우트 파라미터가 레시피 id 로 읽히지 않을 때(`/recipe/abc`, `/recipe/-1`).
 *
 * 서버에 물어보지도 못한 경우라 분류 대상이 아니지만, 사용자가 보는 것은 "그 레시피가
 * 없다" 로 같다. 그래서 **같은 문구**를 쓴다 — 여기서만 다른 화면을 그리면 같은 상황에
 * 두 얼굴이 생긴다.
 */
export function recipeUnreadableIdCopy(): RecipeFailureCopy {
  return RECIPE_FAILURE_COPY.NOT_FOUND
}
