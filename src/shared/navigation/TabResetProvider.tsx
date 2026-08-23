/**
 * 탭 리셋 등록소의 **React 껍데기**. 규칙과 자료구조는 `tabReset.ts` 에 있다
 * (그쪽은 순수 TS 라 렌더러 없는 이 저장소의 jest 가 전부 검사한다).
 *
 * ─── 왜 context 하나인가 ────────────────────────────────────────────────────
 * 모듈 전역 싱글턴으로 두면 테스트끼리·화면끼리 등록이 새고, dev 리로드에서
 * 죽은 화면의 등록이 남는다. 탭 레이아웃이 provider 를 들고 있으면 등록의 수명이
 * **탭 네비게이터의 수명**과 정확히 같다.
 *
 * ─── 등록은 렌더마다 갈리지 않는다 ──────────────────────────────────────────
 * 화면이 넘기는 target 은 콜백을 담고 있어 렌더마다 새 객체다. 그것을 그대로
 * 등록/해제하면 스크롤 한 번에 등록소가 매 프레임 갈린다. 그래서 등록되는 것은
 * **한 번 만든 대리 객체**이고, 그 대리가 항상 최신 target 을 읽는다(getter).
 * getter 로 읽는 이유는 `undefined` 를 그대로 흘리기 위해서다 — 함수로 감싸면
 * 등록하지 않은 능력까지 "있다" 가 되어 사다리가 다음 칸으로 못 떨어진다.
 *
 * 그 성질을 4번(`recover`)이 그대로 쓴다. 화면은 **고장났을 때만** 그 칸을 채우므로
 * 같은 화면이 렌더마다 켜고 끈다 — 대리가 매번 다시 읽기 때문에 등록을 다시 하지
 * 않고도 사다리가 **누르는 그 순간의** 상태를 본다(`tabReset.ts` 머리말 §4번).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"

import {
  createTabResetRegistry,
  type TabResetRegistry,
  type TabResetTarget,
} from "./tabReset"

const TabResetContext = createContext<TabResetRegistry | null>(null)

export function TabResetProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => createTabResetRegistry(), [])
  return (
    <TabResetContext.Provider value={registry}>
      {children}
    </TabResetContext.Provider>
  )
}

/** 탭 레이아웃이 사다리를 돌릴 때 쓴다. provider 밖이면 `null`. */
export function useTabResetRegistry(): TabResetRegistry | null {
  return useContext(TabResetContext)
}

/**
 * 화면이 "내가 되돌릴 수 있는 것" 을 등록한다.
 *
 * ```tsx
 * useRegisterTabReset("recipe", {
 *   content: { isAtRoot: () => isAtScrollTop(offsetRef.current), reset: scrollToTop },
 *   // 멀쩡하면 `undefined` — 재탭으로는 다시 받지 않는다.
 *   recover: listFailed ? refreshable.refresh : undefined,
 * })
 * ```
 *
 * `route` 는 **탭 라우트 이름**이다(`(tabs)/` 아래 파일명). 한 탭에 여러 화면이
 * 있으면(커뮤니티 ↔ 인기글) 각자 자기 이름으로 등록한다 — 레이아웃은 지금 focus 된
 * 라우트로만 조회하므로, 마운트된 채 뒤에 남아 있는 화면의 리셋이 새어 나오지 않는다.
 *
 * provider 밖(탭이 아닌 곳)에서 부르면 아무 일도 하지 않는다 — 같은 화면이 탭 안팎
 * 양쪽에서 쓰일 수 있어서 호출부가 조건을 들 이유를 만들지 않는다.
 */
export function useRegisterTabReset(
  route: string,
  target: TabResetTarget,
): void {
  const registry = useContext(TabResetContext)
  const latest = useRef(target)
  latest.current = target

  const proxy = useMemo<TabResetTarget>(
    () => ({
      get overlay() {
        return latest.current.overlay
      },
      get content() {
        return latest.current.content
      },
      get recover() {
        return latest.current.recover
      },
    }),
    [],
  )

  useEffect(() => {
    if (registry === null) return
    return registry.register(route, proxy)
  }, [registry, route, proxy])
}
