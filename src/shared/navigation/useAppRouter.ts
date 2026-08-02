/**
 * 화면이 쓰는 라우터. `useRouter()` 자리에 그대로 들어간다.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 무엇이 다른가: `back()` 하나뿐이다
 *
 * expo-router 의 `router.back()` 은 **직전 화면이 없으면 아무 일도 하지 않는다.**
 * 푸시 알림·딥링크·dev 리로드로 들어오면 스택 깊이가 1 이라 항상 그 상태고,
 * dev 에서는 `The action 'GO_BACK' was not handled by any navigator` 경고가,
 * prod 에서는 **아무 반응 없는 버튼**이 남는다.
 *
 * 이 라우터의 `back()` 은 그럴 때 라우트 그래프가 정한 곳으로 나간다
 * (`src/shared/navigation/routeGraph.ts`). 나머지 메서드는 expo-router 그대로다.
 *
 * ■ 왜 호출부를 고치는 대신 라우터를 바꿨나
 *
 * `router.back()` 은 45개 파일 80곳에 있다. 각 호출부를 `canGoBack()` 삼항으로
 * 고치면 (1) 80번 같은 판단을 반복해야 하고, (2) **다음에 추가되는 화면은 다시
 * 안전하지 않은 채로 시작한다.** 안전한 쪽을 기본값으로 만드는 편이 낫다 —
 * 이 앱에서 라우터를 얻는 방법은 이것 하나이고, `tests/navigationBackGuard.test.ts`
 * 가 expo-router 의 `useRouter` / `router` 를 직접 쓰는 곳을 막는다.
 *
 * ■ 쓸 수 없는 곳: 루트 레이아웃
 *
 * 뒤로가기 연타를 접기 위해 `useNavigation()` 을 쓰는데, 그것은 네비게이터 **안**
 * 에서만 동작한다. `app/_layout.tsx` 는 네비게이터를 만드는 쪽이라 바깥이다.
 * 거기서는 expo-router 의 `useRouter()` 를 그대로 쓴다(뒤로가기를 부르지 않는다).
 */
import { useMemo } from "react"
import { useRouter, type Href, type Router } from "expo-router"

import { useGoBack } from "./useGoBack"

export function useAppRouter(fallback?: Href): Router {
  const router = useRouter()
  const back = useGoBack(fallback)

  /* `useRouter()` 는 모듈 싱글턴을 돌려주고 `back` 은 `useCallback` 으로 고정돼
     있으므로, 이 객체도 렌더 사이에 바뀌지 않는다. */
  return useMemo(() => ({ ...router, back }), [router, back])
}
