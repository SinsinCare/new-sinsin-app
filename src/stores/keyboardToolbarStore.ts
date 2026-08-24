import { useEffect } from "react"
import { create } from "zustand"

/**
 * 전역 키보드 툴바(`AppKeyboardSurface`)를 **화면 단위로 끄는** 스위치.
 *
 * ## 왜 필요한가
 *
 * 전역 툴바는 "키보드에서 빠져나올 유일한 보장된 길" 이라 앱의 모든 입력을 덮는다
 * (`AppKeyboardToolbar` 머리말). 그 전제가 성립하지 않는 화면이 하나 있다 —
 * **자기 도크를 키보드 위에 직접 세우는 화면**이다. 커뮤니티 글쓰기가 그렇다:
 * 사진·투표 버튼과 키보드 내리기, 등록 CTA 를 한 덩어리로 올린다.
 *
 * 그때 전역 툴바까지 뜨면 키보드 위에 **바가 두 겹**으로 쌓인다. 둘은 계보가 달라
 * (라이브러리 기본 높이·`#F2F2F5` vs 앱 면·해어라인) 색도 여백도 안 맞고,
 * 키보드를 내리는 버튼이 "완료" 와 자판 아이콘으로 **두 개**가 된다.
 *
 * ## 끄는 조건
 *
 * **자기 탈출구를 가진 화면만 끈다.** 이 스위치를 쓰는 화면은 키보드를 내릴 방법을
 * 스스로 제공해야 한다 — 그러지 않으면 숫자 키패드에서 탈출구가 0개가 되던
 * 2026-08-02 QA 로 돌아간다.
 *
 * 세는 방식이 카운터인 이유: 화면 전환 중에는 나가는 화면의 정리(cleanup)와 들어오는
 * 화면의 등록이 겹친다. 불리언이면 그 겹침에서 마지막 정리가 남의 억제를 꺼 버린다.
 */
interface KeyboardToolbarSuppressionState {
  count: number
  acquire: () => void
  release: () => void
}

export const useKeyboardToolbarSuppressionStore =
  create<KeyboardToolbarSuppressionState>((set) => ({
    count: 0,
    acquire: () => set((state) => ({ count: state.count + 1 })),
    release: () => set((state) => ({ count: Math.max(0, state.count - 1) })),
  }))

/** 이 컴포넌트가 떠 있는 동안 전역 키보드 툴바를 감춘다. */
export function useSuppressGlobalKeyboardToolbar(): void {
  useEffect(() => {
    const { acquire, release } = useKeyboardToolbarSuppressionStore.getState()
    acquire()
    return release
  }, [])
}

/** 전역 툴바가 그려져야 하는가. */
export function useGlobalKeyboardToolbarVisible(): boolean {
  return useKeyboardToolbarSuppressionStore((state) => state.count === 0)
}
