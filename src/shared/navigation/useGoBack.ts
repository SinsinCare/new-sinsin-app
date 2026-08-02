/**
 * 뒤로가기 — 앱에서 뒤로 가는 **유일한** 방법.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 두 가지를 한다
 *
 * 1. **히스토리가 없으면 라우트 그래프로 떨어진다.** `router.back()` 은 직전 화면이
 *    없으면 `GO_BACK` 을 던지고 아무 일도 하지 않는다(dev 에서는 LogBox 경고, prod
 *    에서는 침묵). 푸시·딥링크·dev 리로드로 들어오면 항상 그 상태다 —
 *    `src/shared/navigation/routeGraph.ts` 머리말에 표로 적어 두었다.
 *
 * 2. **연타를 한 번으로 접는다.** 전환 애니메이션 중에 뒤로가기를 두 번 누르면
 *    `router.back()` 이 두 번 나가서 두 칸을 빠져나온다. 사용자가 보기에는
 *    "뒤로 눌렀더니 엉뚱한 데로 갔다" 이고, 이것이 스택이 꼬였다고 느껴지는 실제
 *    경로 중 하나다. 타이머로 막지 않는다 — 화면이 다시 focus 될 때 빗장을 푼다.
 *
 * ■ 쓰는 법
 *
 * ```tsx
 * const goBack = useGoBack()
 * <V2ScreenHeader title={...} onBack={goBack} />
 * ```
 *
 * 폴백 목적지는 라우트 그래프가 정한다. 화면이 그래프와 다르게 나가야 할 때만
 * (예: 저장 후 목록이 아니라 상세로) 인자로 넘긴다.
 *
 * ```tsx
 * const goBack = useGoBack("/(settings)/profile-edit")
 * ```
 *
 * ■ `router.back()` 을 직접 부르지 않는다
 *
 * `tests/navigationBackGuard.test.ts` 가 `app/` · `src/` 에서 맨 `router.back()` 을
 * 금지한다. 예외가 필요하면 그 테스트의 허용 목록에 이유와 함께 적는다.
 */
import { useCallback, useEffect, useRef } from "react"
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  useSegments,
  type Href,
} from "expo-router"

import { resolveBackRoute, type RouteParams } from "./routeGraph"

export function useGoBack(fallback?: Href): () => void {
  const router = useRouter()
  const navigation = useNavigation()
  const segments = useSegments()
  const params = useLocalSearchParams()

  /* 세그먼트·파라미터는 렌더마다 새 객체다. 콜백 deps 에 넣으면 반환되는 함수가
     매번 새로 만들어져서, 이것을 prop 으로 받는 memo 된 헤더가 계속 다시 그려진다.
     ref 에 담아 두면 콜백은 고정되고 값은 항상 최신이다. */
  const latest = useRef({ segments, params, fallback })
  latest.current = { segments, params, fallback }

  /* 나가는 중 빗장. focus 가 돌아오면 푼다 — 뒤로가기가 취소됐거나(제스처를 놓았거나)
     이 화면으로 다시 돌아온 경우다. */
  const leaving = useRef(false)
  useEffect(() => {
    const unsubscribe = navigation.addListener?.("focus", () => {
      leaving.current = false
    })
    return unsubscribe
  }, [navigation])

  return useCallback(() => {
    if (leaving.current) return
    leaving.current = true

    if (router.canGoBack()) {
      router.back()
      return
    }

    const {
      segments: currentSegments,
      params: currentParams,
      fallback: currentFallback,
    } = latest.current

    const target =
      currentFallback ??
      resolveBackRoute(currentSegments, currentParams as RouteParams)

    /* 루트 화면(홈·로그인·온보딩·탈퇴 완료)은 목적지가 없다. 빗장을 도로 풀어
       두지 않으면 이 화면의 뒤로가기가 영영 죽는다. */
    if (target === null) {
      leaving.current = false
      return
    }

    /* `canGoBack()` 이 거짓이라 스택에 아래가 없다 — `replace` 와 `dismissTo` 가
       같은 결과를 낸다. 둘 중 어느 네비게이터에서든 뜻이 흔들리지 않는 쪽을 쓴다. */
    router.replace(target)
  }, [router])
}
