/**
 * **스토리 뷰어가 "몇 번째" 를 말할 때 무엇을 세는가.** (2026-08-21)
 *
 * ─── 왜 순수 함수로 떼어 놨나 ───────────────────────────────────────────────
 * 뷰어(`app/stories.tsx`)는 자리 번호(`activeIndex`)를 상태로 들고 진행 점을
 * `index === Math.min(shownIndex, 11)` 로 칠했다. 그런데 이 목록은 **손가락 아래에서
 * 줄어든다**: 분 눈금이 지나면 만료된 것이 빠지고(`isStoryExpired`), 차단하면 그 사람
 * 것이 통째로 빠진다. 앞쪽에서 둘이 빠지면 4번을 보던 사람의 번호는 그대로 4인데
 * 목록은 2개라 **아무 점도 안 켜진다**. `VirtualizedList` 는 한 프레임 안에 스스로
 * offset 을 되잡지만, 그 자리는 "잘린 위치" 일 뿐 손가락 아래 있던 그 스토리가 아니다.
 *
 * `stableStoryOrder` 가 이걸 막아 주지 않는다 — 그것이 보장하는 것은 **재배열**(새
 * 셔플이 와도 보던 순서 유지)이지, 보고 있는 자리 **앞쪽의 제거**가 아니다.
 *
 * 그래서 판정을 여기로 옮긴다. 화면 파일은 이 저장소의 jest 가 로드하지 못하므로
 * (RN·expo 모듈이 미변환 ESM 이다) 순수 함수로 두어야 실제로 돌려 볼 수 있다.
 */

/** 자리를 재는 데 필요한 최소한의 모양. */
interface Identified {
  readonly id: string
}

/**
 * 진행 표시가 가리킬 자리.
 *
 *  1. **보던 스토리가 아직 있으면 그 자리다.** 재배열이든 앞쪽 제거든 무관하다 —
 *     번호가 아니라 신원으로 찾기 때문이다.
 *  2. 사라졌으면(만료·차단·삭제) 마지막으로 알던 번호를 **목록 안으로 접는다.**
 *     이것이 `VirtualizedList` 가 실제로 앉는 자리라, 점과 화면이 같은 것을 가리킨다.
 *  3. 목록이 비면 0 — 이때 화면에는 빈 상태가 서 있고 점 줄은 그려지지 않는다.
 */
export function resolveShownIndex(
  stories: readonly Identified[],
  activeId: string | null,
  fallbackIndex: number,
): number {
  if (stories.length === 0) return 0
  if (activeId !== null) {
    const found = stories.findIndex((story) => story.id === activeId)
    if (found >= 0) return found
  }
  // 번호는 바깥에서 온다(첫 보임 콜백 · 열 때 넘어온 자리) — 음수·소수도 접는다.
  if (!Number.isFinite(fallbackIndex) || fallbackIndex < 0) return 0
  return Math.min(Math.floor(fallbackIndex), stories.length - 1)
}
