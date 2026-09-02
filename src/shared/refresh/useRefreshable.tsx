/**
 * **당겨서 새로고침 한 벌.** 화면이 직접 만들던 `refreshing` 상태·`RefreshControl`·
 * `refetch()` 조합을 여기 하나로 모은다.
 *
 * ─── 왜 훅으로 묶었는가 (실측 3가지) ─────────────────────────────────────────
 *
 * 1. **제스처가 죽어 있었다.** 커뮤니티 피드(`FreePostTab`)와 내 활동
 *    (`app/community-library.tsx`) 은 `RefreshControl` 을 달아 놓고 같은 스크롤
 *    컨테이너에 `bounces={false}` 를 함께 줬다. iOS 의 `UIRefreshControl` 은 스크롤뷰가
 *    맨 위에서 **더 당겨질 수 있을 때만**(overscroll) 발동한다 — `bounces={false}` 는
 *    그 여지를 0 으로 만들므로 컨트롤은 렌더되지만 **영원히 호출되지 않는다.**
 *    앱을 껐다 켜는 것 말고는 새로 받을 방법이 없던 진짜 원인이 이것이다.
 *    (안드로이드는 `SwipeRefreshLayout` 이 부모라 `overScrollMode="never"` 여도
 *    당겨지므로 **iOS 에서만** 죽어 있었다. 한 플랫폼만 죽으면 더 늦게 발견된다.)
 *
 *    → 그래서 이 훅은 `refreshControl` 을 **혼자 주지 않는다.** `scrollProps` 하나로
 *      `bounces: true` 까지 묶어서 준다. 컨트롤과 제스처를 갈라 놓을 수 없게 만드는 것이
 *      "다시는 안 그러기" 보다 확실하다. (같은 조합을 손으로 다시 쓰는 것은
 *      `eslint.config.js` 의 `no-restricted-syntax` 가 막는다.)
 *
 * 2. **새로고침이 화면의 일부만 새로 받았다.** 커뮤니티 한 화면에는 피드·스토리·
 *    차단 목록이 각자 쿼리로 붙어 있는데 당기면 피드만 다시 받았다. 사용자에게
 *    "새로고침" 은 **이 화면**이지 쿼리 하나가 아니다.
 *    → 키 목록(스코프)을 받아 `type: "active"` 로 **지금 화면에 붙어 있는 것 전부**를
 *      다시 받는다. 나중에 이 화면에 쿼리가 하나 더 붙어도 스코프 접두어 아래면
 *      자동으로 따라온다 — 화면마다 `Promise.all([a.refetch(), b.refetch()])` 를
 *      손으로 늘리다 빠뜨리는 일이 사라진다.
 *
 * 3. **실패가 조용했다.** `await refetch()` 는 react-query 안에서 에러를 삼키므로
 *    비행기 모드에서 당겨도 스피너가 한 바퀴 돌고 아무 일도 없었다 — 사용자는
 *    "최신이구나" 로 읽는다. 조용한 폴백이 고장을 정상처럼 보이게 하는 그 패턴이다.
 *    → `throwOnError` 로 올려 받아 `presentError` 토스트로 말한다.
 *
 * 4. **제스처 없이 켠 스피너가 스크롤을 영구히 밀었다.** (2026-08-21) 사용자 신고:
 *    "레시피는 탭을 계속 누르면 위에 여백이 점점 늘어나는데". 실측 0 → 약 200pt →
 *    약 270pt 로 **누적**했고, 손가락으로 한 번 당기면 통째로 사라졌다 — 콘텐츠가
 *    밀려 그려진 것이 아니라 **스크롤 오프셋이 쌓여 있었다**는 뜻이다.
 *
 *    원인은 RN 의 iOS 구현에 그대로 적혀 있다(`RCTRefreshControl.m`):
 *
 *      - `refreshing` 이 **JS 쪽에서** false→true 로 바뀌면
 *        `beginRefreshingProgrammatically` 가 돌고, 스피너를 보여 주려고
 *        `contentOffset.y -= self.frame.size.height` 로 스크롤을 **직접 내린다.**
 *      - 끝날 때의 복원은 **조건부**다:
 *        `if (… && scrollView.contentOffset.y < -scrollView.contentInset.top)`.
 *        그 사이 목록이 다시 레이아웃되어(FlashList v2 는 오프셋을 스스로 관리한다)
 *        조건이 깨지면 `endRefreshing` 만 부르고 **밀어 둔 만큼을 되돌리지 않는다.**
 *      - 그래서 프로그램 호출 **한 번당 한 번씩** 남고, 부를 때마다 쌓인다.
 *
 *    제스처는 이 경로를 타지 않는다. 손가락으로 당기면 UIKit 이 먼저
 *    `refreshControlValueChanged` 를 내보내 `_currentRefreshingState` 를 이미 YES 로
 *    만들어 두므로, 뒤이어 JS 가 `refreshing={true}` 를 줘도 `setRefreshing:` 이
 *    **아무 일도 하지 않는다.** 즉 결함은 정확히 "제스처 없이 켠 스피너" 에만 있다.
 *
 *    → 그래서 이 훅은 **켜는 스위치를 둘로 가른다.** 제스처만 `refreshing` 을 켜고,
 *      코드에서 부른 `refresh()` 는 **같은 refetch 본문**을 돌리되 컨트롤을 건드리지
 *      않는다. 화면마다 조심하는 방식으로는 새 화면이 생길 때마다 다시 열린다 —
 *      한 상태(`runningSource`)에서 두 값을 파생시켜 "제스처 아닌데 스피너가 켜진"
 *      조합 자체를 만들 수 없게 한다.
 *
 * ─── 스피너를 최소 시간 붙잡는 이유 ────────────────────────────────────────
 * `useLoadingVisible` 과 **반대**다. 저기는 늦게 보여주고(delay) 최소 유지한다.
 * 여기는 **즉시** 보여주고(사용자가 손가락으로 당겨 놓았으므로 이미 보고 있다)
 * 최소 유지만 한다. 캐시가 40ms 에 답하면 스피너가 깜빡이고 사용자는 "안 눌렸나" 로
 * 읽는다. `MIN_VISIBLE_MS` 만큼은 잡아 둔다.
 *
 * 그 시간은 **두 경로 모두**에 건다. 프로그램 경로에는 스피너가 없지만 대신
 * `isRunning` 이 있고, 부르는 쪽은 그것으로 자기 자리에 상태를 그린다(아래) — 최소
 * 노출이 필요한 이유는 "스피너" 가 아니라 "사용자가 본 표시" 이므로 똑같이 적용된다.
 * 이름을 `MIN_SPINNER_MS` 에서 바꾼 것도 그래서다.
 *
 * ─── 프로그램 경로의 피드백은 부르는 쪽이 그린다 ────────────────────────────
 * 스피너를 못 쓰게 됐으니 그 자리에 무엇이 서는가. 훅은 사실 하나(`isRunning`)만
 * 내놓고, **화면이 이미 들고 있는 로딩 면**을 쓰게 한다:
 *
 *  - 커뮤니티 피드 · 레시피 목록 — 목록이 비었을 때 그리는 **첫 조회 스켈레톤**.
 *    복구는 "전면 오류가 서 있을 때" 만 도는 경로라(`tabReset.ts` §4번) 그 자리에
 *    오류 대신 스켈레톤이 서는 것이 곧 "다시 받는 중" 이다. 새 컴포넌트도 새 문구도
 *    필요 없고, 사용자가 이 화면에서 이미 본 적 있는 표시다.
 *
 * 훅이 대신 무엇을 그려 주지 않는 이유: 화면마다 로딩이 사는 자리가 다르고(빈 목록
 * 자리 · 오류 블록 · 헤더), 훅이 고르면 그 자리를 훅이 알아야 한다.
 *
 * @example
 * const refreshable = useRefreshable({ queryKeys: COMMUNITY_REFRESH_KEYS, scope: "community" })
 * // 스크롤 컨테이너에 **마지막으로** 펼친다(앞의 bounces 설정을 덮어야 한다).
 * <FlashList bounces={false} {...refreshable.scrollProps} />
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshControl, type ScrollViewProps } from "react-native"
import { useQueryClient } from "@tanstack/react-query"

import { primitives } from "@/src/design-system-v2/tokens/colors"
import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { presentError } from "@/src/lib/errorMessage"

/** 쿼리 키 접두어 목록. 한 화면이 "새로고침" 이라고 부르는 범위. */
export type RefreshScopeKeys = readonly (readonly unknown[])[]

/**
 * 한 번 보여 준 표시를 붙잡는 최소 시간(ms). 제스처의 스피너와 프로그램 경로의
 * `isRunning` 에 **똑같이** 건다 — 최소 노출이 필요한 이유는 표시의 종류가 아니라
 * "깜빡이면 안 눌린 것으로 읽힌다" 이기 때문이다.
 *
 * 420 은 `useLoadingVisible` 의 `minDuration` 과 같은 값이다 — 로딩 표시의 최소 길이는
 * 화면마다 다를 이유가 없다.
 */
const MIN_VISIBLE_MS = 420

/**
 * 누가 이 새로고침을 시작했는가. **한 칸으로 들고 있는 것이 요점이다** — `refreshing`
 * 과 `isRunning` 을 각자 state 로 두면 "제스처가 아닌데 스피너가 켜진" 조합이 다시
 * 표현 가능해지고, 그것이 머리말 4번의 결함이다.
 */
type RefreshSource = "gesture" | "code"

export interface UseRefreshableOptions {
  /**
   * 다시 받을 쿼리 키 접두어들. **모듈 상수로 두라** — 렌더마다 새 배열을 넘겨도
   * 동작은 같지만(ref 로 읽는다) 스코프가 화면 안에 흩어지면 2번 문제가 돌아온다.
   */
  queryKeys: RefreshScopeKeys
  /** 실패 로그에 남는 이름. `"community"` 처럼 화면을 가리킨다. */
  scope: string
  /** 쿼리가 아닌 것도 같이 새로 받아야 할 때(로컬 저장소 등). */
  extra?: () => Promise<unknown> | unknown
  /**
   * refetch 가 **시작되기 직전** 동기로 한 번 불린다. `extra` 와 다르다 — `extra` 는
   * refetch 와 병렬이라 순서를 보장하지 않는다.
   *
   * 쓰임: 무한 쿼리(커서 피드)는 refetch 가 들고 있는 페이지 전부를 다시 받는다.
   * 당김은 "처음부터 다시" 이므로 여기서 캐시를 1페이지로 잘라 전량 재요청을 막는다.
   */
  onBeforeRefresh?: () => void
  /** 당겨도 아무 일이 없어야 하는 상태(예: 검색 결과 표시 중)에서 끈다. */
  enabled?: boolean
  /**
   * 스피너가 나타나는 지점을 아래로 민다(pt).
   *
   * ## 왜 필요한가 (2026-08-19)
   *
   * 스크롤 컨테이너 **위에 고정층**(검색 바 등)이 얹힌 화면에서는, 스피너가 그 층
   * **뒤에서** 나오다가 아래로 빠져나온다 — 도는 동안 절반이 가려서 무엇이 도는지
   * 안 보이고, 당긴 만큼 반응한다는 느낌이 끊긴다.
   *
   * 고정층의 높이를 넘겨 주면 그 아래에서 돌기 시작한다. iOS/안드로이드 모두
   * `RefreshControl` 이 같은 이름으로 받는다.
   *
   * **목록 위에 겹친(absolute) 층에만 준다.** 목록 **밖의 형제 뷰**로 올린 헤더에는
   * 주지 않는다 — 목록의 0pt 가 이미 그 아래라, 값을 주면 스피너가 그만큼 콘텐츠
   * 안으로 밀려 첫 줄 위에 겹쳐 돈다(커뮤니티에서 헤더를 목록 밖으로 꺼낸 뒤 112pt
   * 가 남아 있던 사고, 2026-09-01).
   */
  spinnerOffset?: number
}

export interface Refreshable {
  /**
   * **제스처** 스피너가 도는 중인지. `scrollProps` 안의 컨트롤이 이미 받으므로 화면이
   * 직접 쓸 일은 없다. 프로그램 호출로는 **절대 켜지지 않는다**(머리말 4번).
   */
  refreshing: boolean
  /**
   * 경로와 무관하게 "지금 다시 받는 중" 인가. 프로그램 경로에는 스피너가 없으므로
   * 부르는 쪽이 이 값으로 자기 자리에 표시를 세운다(머리말 §프로그램 경로의 피드백).
   */
  isRunning: boolean
  /**
   * 버튼·복구 등 **제스처 밖에서** 같은 새로고침을 부를 때. 제스처와 같은 본문을
   * 돌리지만 `RefreshControl` 의 `refreshing` 은 건드리지 않는다 — 켜면 iOS 가
   * 스크롤을 밀어 두고 되돌리지 않아 부를 때마다 여백이 쌓인다(머리말 4번).
   */
  refresh: () => void
  /**
   * 스크롤 컨테이너(ScrollView/FlatList/FlashList)에 **통째로** 펼친다.
   * `refreshControl` 만 빼서 쓰지 말 것 — 그러면 1번 문제가 그대로 돌아온다.
   */
  scrollProps: Required<
    Pick<
      ScrollViewProps,
      "refreshControl" | "bounces" | "alwaysBounceVertical" | "overScrollMode"
    >
  >
}

export function useRefreshable({
  queryKeys,
  scope,
  extra,
  enabled = true,
  spinnerOffset,
  onBeforeRefresh,
}: UseRefreshableOptions): Refreshable {
  const queryClient = useQueryClient()
  const surface = useSurface()
  /* 한 칸에서 두 값이 파생된다 — 아래 `refreshing` / `isRunning`. 머리말 4번. */
  const [runningSource, setRunningSource] = useState<RefreshSource | null>(null)

  // 렌더마다 바뀌어도 `refresh` 의 정체성이 흔들리지 않게 ref 로 읽는다.
  // `refresh` 가 매 렌더 새로 생기면 그것을 받은 RefreshControl 도 매번 새로 만들어진다.
  const keysRef = useRef(queryKeys)
  keysRef.current = queryKeys
  const extraRef = useRef(extra)
  extraRef.current = extra
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const onBeforeRefreshRef = useRef(onBeforeRefresh)
  onBeforeRefreshRef.current = onBeforeRefresh

  // 재진입 방지는 state 가 아니라 ref 로 본다 — setState 는 다음 렌더에나 보인다.
  const runningRef = useRef(false)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /**
   * 제스처와 프로그램 호출이 **같은 본문**을 지난다. 다른 것은 `source` 뿐이고,
   * 그 값이 스피너를 켤지 말지를 혼자 정한다(머리말 4번).
   */
  const run = useCallback(
    (source: RefreshSource) => {
      if (runningRef.current || !enabledRef.current) return
      runningRef.current = true
      setRunningSource(source)
      /* 당김이 먹혔다는 것을 스피너보다 먼저 알린다 — 손가락이 아직 화면에 있다.
         프로그램 호출에는 주지 않는다: 이 진동은 **손가락**에 대한 답이고, 코드에서
         부른 쪽은 자기 자리에 이미 답이 있다(탭 바는 밟은 걸음에 햅틱을 준다). */
      if (source === "gesture") hapticSelection()

      const startedAt = Date.now()
      void (async () => {
        try {
          // refetch 디스패치보다 먼저, 동기로. (무한 쿼리 페이지 자르기 등 — 옵션 머리말)
          onBeforeRefreshRef.current?.()
          await Promise.all([
            ...keysRef.current.map((queryKey) =>
              queryClient.refetchQueries(
                // `active` 만 — 이 화면에 붙어 있지 않은 캐시까지 깨우면
                // 당김 한 번이 조용히 네트워크 열댓 개가 된다.
                { queryKey, type: "active" },
                // 이미 날아간 요청은 버리고 새로 보낸다. 사용자가 당긴 시점 이후의
                // 응답이어야 "새로고침" 이 거짓말이 아니다.
                { throwOnError: true, cancelRefetch: true },
              ),
            ),
            extraRef.current?.(),
          ])
        } catch (error) {
          // 취소된 요청은 `presentError` 가 알아서 아무것도 그리지 않는다.
          presentError(error, { scope: `refresh:${scope}`, forceToast: true })
        } finally {
          const remaining = MIN_VISIBLE_MS - (Date.now() - startedAt)
          if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining))
          }
          runningRef.current = false
          if (mountedRef.current) setRunningSource(null)
        }
      })()
    },
    [queryClient, scope],
  )

  /* 제스처 밖에서 부르는 문. **`run("gesture")` 를 여기 붙이지 말 것** — 그 순간
     머리말 4번의 여백 누적이 그대로 돌아온다. */
  const refresh = useCallback(() => run("code"), [run])
  const onGestureRefresh = useCallback(() => run("gesture"), [run])

  /* 컨트롤이 받는 값은 **제스처일 때만** 참이다. 한 칸에서 파생하므로 둘이 어긋날
     수 없다 — `refreshing` 이 참인데 손가락이 없었던 상태는 표현 불가능하다. */
  const refreshing = runningSource === "gesture"

  const scrollProps = useMemo(
    () => ({
      refreshControl: (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onGestureRefresh}
          // iOS 는 tintColor 하나, 안드로이드는 colors 배열을 본다. 둘 다 브랜드색으로
          // 맞춘다 — 새로고침은 시스템 동작이라 의미색(safe 틸)을 쓰지 않는다.
          tintColor={surface.brand}
          colors={[surface.brand]}
          /* 안드로이드 스피너가 도는 원반의 바닥. 라이트에서는 흰 원반이 캔버스 위에
             떠 보여야 하므로 카드색(라이트에서는 캔버스와 같은 값)이 아니라 흰색이다 —
             정본은 v2 원시 팔레트의 `common[0]` 이고, 여기서 리터럴로 다시 적지 않는다. */
          progressBackgroundColor={
            surface.isDark ? surface.card : primitives.common[0]
          }
          // 고정층(검색 바 등) 뒤에서 돌지 않게 그 아래로 민다. 옵션 머리말 참고.
          progressViewOffset={spinnerOffset}
        />
      ),
      // 이 셋이 `refreshControl` 과 한 몸이다. 위 주석 1번.
      bounces: true,
      alwaysBounceVertical: true,
      overScrollMode: "always" as const,
    }),
    [
      onGestureRefresh,
      refreshing,
      spinnerOffset,
      surface.brand,
      surface.card,
      surface.isDark,
    ],
  )

  return { refreshing, isRunning: runningSource !== null, refresh, scrollProps }
}
