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
 *    **이탈이 취소됐을 때도 푼다**(초안 가드가 잡은 경우). 그때는 blur 도 focus 도
 *    오지 않아서, focus 만 보고 있으면 그 화면의 뒤로가기가 영영 죽는다 — 아래
 *    `beforeRemove` 구독의 머리말에 실측된 모양을 적어 두었다.
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

import {
  getAnalyticsScreenName,
  trackAnalyticsEvent,
} from "@/src/features/analytics"
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
    const offFocus = navigation.addListener?.("focus", () => {
      leaving.current = false
    })

    /*
      ── 이탈이 **취소**됐을 때도 푼다 (실측된 가둠) ─────────────────────────
      화면이 `usePreventRemove` 로 이탈을 잡으면 이 화면은 **blur 되지 않는다.**
      blur 가 없으니 focus 도 다시 오지 않고, 위의 빗장은 걸린 채로 남는다 —
      그 뒤로는 이 화면의 뒤로가기가 **영영 죽는다.** 확인창을 "계속 쓰기" 로 닫고
      다시 ✕ 를 눌러도 아무 일도 일어나지 않고, 확인창이 그려지지 않는 갈래에
      서 있으면 앱을 강제 종료하는 것 말고 나갈 방법이 없다.
      취소를 되돌릴 수 없는 상태로 기록하는 빗장은 빗장이 아니라 자물쇠다.

      `beforeRemove` 는 이탈이 취소되든 아니든 **같은 이벤트 객체**로 온다
      (`@react-navigation/core` 의 `shouldPreventRemove` → `emitter.emit`).
      리스너는 등록 순서로 불리고 이 훅은 화면보다 먼저 등록되므로 **우리 차례에는
      아직 아무도 `preventDefault()` 를 안 했을 수 있다.** 그래서 그 자리에서 읽지
      않고 emit 이 끝난 뒤(마이크로태스크) 최종값을 읽는다 — `defaultPrevented` 는
      클로저를 읽는 getter 라 이벤트 객체만 들고 있으면 나중에도 참을 말한다.

      **취소된 경우에만** 푼다. 성공한 이탈에서 풀면 전환 애니메이션 중의 두 번째
      탭이 다시 나가서 두 칸을 빠져나온다 — 이 빗장이 원래 막던 것이 그것이다.
    */
    const offBeforeRemove = navigation.addListener?.(
      "beforeRemove",
      (event) => {
        queueMicrotask(() => {
          if (event.defaultPrevented) leaving.current = false
        })
      },
    )

    return () => {
      offFocus?.()
      offBeforeRemove?.()
    }
  }, [navigation])

  return useCallback(() => {
    if (leaving.current) return
    leaving.current = true

    const {
      segments: currentSegments,
      params: currentParams,
      fallback: currentFallback,
    } = latest.current

    /* 앱이 그린 뒤로가기(헤더 ‹ · 취소 CTA)의 유일한 경로다 — 여정마다 `*_abandoned` 를
       지어 흩는 대신 한 이름으로 모은다. **하드웨어 백과 엣지 스와이프는 빠진다**:
       네이티브 스택이 앱 코드를 거치지 않고 팝하므로 여기 도달할 방법이 없다
       (`nav_back` 을 "뒤로 간 전체" 로 읽지 말 것 — events.ts 의 해당 주석). */
    const from_screen = getAnalyticsScreenName(currentSegments)

    if (router.canGoBack()) {
      trackAnalyticsEvent("nav_back", { from_screen, used_fallback: false })
      router.back()
      return
    }

    const target =
      currentFallback ??
      resolveBackRoute(currentSegments, currentParams as RouteParams)

    /* 루트 화면(홈·로그인·온보딩·탈퇴 완료)은 목적지가 없다. 빗장을 도로 풀어
       두지 않으면 이 화면의 뒤로가기가 영영 죽는다. */
    if (target === null) {
      leaving.current = false
      return
    }

    /* 히스토리가 없어 그래프로 떨어졌다 = 딥링크·푸시·dev 리로드로 진입했다는 뜻이다.
       이 비율은 여기 말고는 볼 데가 없다. */
    trackAnalyticsEvent("nav_back", { from_screen, used_fallback: true })

    /* `canGoBack()` 이 거짓이라 스택에 아래가 없다 — `replace` 와 `dismissTo` 가
       같은 결과를 낸다. 둘 중 어느 네비게이터에서든 뜻이 흔들리지 않는 쪽을 쓴다. */
    router.replace(target)
  }, [router])
}
