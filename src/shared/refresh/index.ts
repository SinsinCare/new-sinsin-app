/**
 * 새로고침 한 벌 — 화면은 여기서만 가져온다.
 *
 *   const refreshable = useRefreshable({ queryKeys: SCOPE, scope: "community" })
 *   useRevalidateOnReturn({ queryKeys: SCOPE })
 *   <FlashList {...refreshable.scrollProps} />
 *
 * 스코프(무엇을 다시 받는가)는 **기능 쪽**에 산다 — 예: `features/recipe/refresh/scopes.ts`.
 * shared 가 기능의 쿼리 키를 알면 의존이 거꾸로 서고, 키가 바뀔 때 두 곳이 갈라진다.
 */
export { useRefreshable } from "./useRefreshable"
export type {
  Refreshable,
  RefreshScopeKeys,
  UseRefreshableOptions,
} from "./useRefreshable"
export { useRevalidateOnReturn } from "./useRevalidateOnReturn"
export type { UseRevalidateOnReturnOptions } from "./useRevalidateOnReturn"
