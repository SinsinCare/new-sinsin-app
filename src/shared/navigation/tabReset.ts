/**
 * **이미 보고 있는 탭을 다시 눌렀을 때 — 한 번 누르면 한 걸음.**
 *
 * 토스·당근·네이버·카카오가 전부 같은 사다리를 쓴다. 먼저 걸리는 것 **하나만** 한다:
 *
 *   1. 시트·모달이 열려 있다      → 닫는다
 *   2. 탭 안에서 루트가 아닌 화면  → 루트로 되돌린다
 *   3. 콘텐츠가 루트 상태가 아니다 → 루트 상태로(목록은 맨 위, 지도는 내 위치+기본 스냅)
 *   4. 화면이 **고장나 있다**      → 그 화면이 다시 설 수 있는 길 하나를 준다
 *
 * ─── 왜 "하나만" 이 규칙의 전부인가 ─────────────────────────────────────────
 * 한 번의 탭이 시트를 닫으면서 **동시에** 팝하고 스크롤까지 하면, 사용자는 자기가
 * 무엇을 눌렀는지 알 수 없다. 되돌릴 방법도 없다(닫힌 시트는 탭 한 번으로 안 돌아온다).
 * 그래서 이 모듈의 유일한 계약은 **정확히 한 가지 부수효과**다 — `runTabReset` 은
 * 고른 걸음 하나만 실행하고 그 이름을 돌려준다. 그 불변식은
 * `tests/tabReset.test.ts` 가 조합을 전부 세어 확인한다.
 *
 * ─── 왜 화면마다 핸들러를 흩지 않고 등록소를 두는가 ─────────────────────────
 * 리셋의 재료(스크롤 ref · 열린 시트 · 지도 카메라)는 전부 **화면 안쪽**에 있다.
 * 탭 레이아웃이 그것을 알려면 두 가지 중 하나를 해야 한다:
 *
 *  - 레이아웃이 화면 내부를 안다(전역 store 에 ref 를 심거나, 화면별 if 를 늘어놓거나).
 *    그러면 탭이 하나 늘 때마다 레이아웃이 커지고, 남의 화면 구현에 묶인다.
 *  - **화면이 자기가 되돌릴 수 있는 것만 등록한다.** 레이아웃은 "지금 눌린 탭의
 *    라우트" 로 조회해서 사다리를 실행할 뿐, 무엇이 등록돼 있는지 알 필요가 없다.
 *
 * 후자를 골랐다. 등록되지 않은 걸음은 **없는 것으로 치고 다음 칸으로 떨어진다** —
 * 스크롤을 등록하지 않은 탭(홈의 캘린더처럼 스크롤이 없는 화면)이 3번에서 조용히
 * 아무 일도 안 하고 멈추는 것이 이 사다리의 가장 흔한 고장이다.
 *
 * ─── 4번은 "새로고침" 이 아니라 **"복구"** 다 (2026-08-21) ──────────────────
 * 처음에는 4번이 `refresh` 였다 — 이미 맨 위면 다시 받는다. 실기기에서 바로 걸렸다:
 *
 *   > "커뮤니티, 레시피 다시누르면 스크롤 맨위가 아니라 새로고침 스피너까지 가는데"
 *
 * **탭 탭은 이동 제스처다.** 그것이 데이터를 갈아치우면 읽으려던 글이 발밑에서 움직인다.
 * 그리고 두 번째 탭이 거기에 떨어지는 것은 사고가 아니라 **정상 경로**였다: 3번의
 * `scrollToTop` 은 기억한 오프셋을 **동기적으로** 0 으로 쓴다(그 쓰기는 늦게 오는
 * `onScroll` 이 옛 위치를 되살리는 다른 결함을 막는다 — `FreePostTab.scrollToTop`
 * 머리말). 그래서 애니메이션이 도착하기도 전에 3번이 "끝난 것" 이 되고, 자연스러운
 * 빠른 두 번째 탭이 곧바로 새로고침에 떨어졌다.
 *
 * 새로고침에는 이미 보편적이고 발견 가능한 제스처가 있다 — **당겨서 새로고침**
 * (`shared/refresh` 의 `useRefreshable`). 국내 주요 앱(네이버·카카오·토스·당근)도
 * 재탭을 맨 위에서 멈춘다. 그래서 **멀쩡한 화면의 사다리는 3번에서 끝난다.** 4번은
 * 화면이 고장났을 때만 산다 — 전면 오류가 선 목록, 죽은 지도. 그때는 재탭 말고
 * 사용자가 고를 수 있는 것이 없다(당길 목록조차 없다).
 *
 * 이름을 `refresh` 에서 `recover` 로 바꾼 것은 그래서다. `refresh` 로 두면 다음 사람이
 * 멀쩡한 화면에서 그 칸을 다시 채운다 — **이름이 그렇게 하라고 말하기 때문이다.**
 *
 * ─── 한 라우트에 등록소가 **여럿**일 수 있다 ────────────────────────────────
 * 한 탭의 리셋 재료가 한 컴포넌트에 다 있지 않다. 홈이 그 예다 — 달력 시트는
 * 라우트 파일(`app/(tabs)/home.tsx`)이 열고 닫고, 스크롤은 그 아래
 * `RecordView` 가 들고 있다. 그래서 등록은 **덮어쓰기가 아니라 합치기**다:
 * 같은 라우트에 여러 벌이 등록되면 능력별로 **나중에 등록된 것이 이긴다**.
 * (덮어쓰기로 두면 마운트 순서에 따라 달력이 리셋에서 사라진다.)
 */

/** 사다리에서 실제로 밟은 칸. `"none"` = 되돌릴 것이 아무것도 없었다. */
export type TabResetStep =
  | "closeOverlay"
  | "popToRoot"
  | "resetContent"
  | "recover"
  | "none"

/** 열려 있는 시트·모달. **판정과 실행을 쌍으로** 받는다 — 한쪽만 등록할 수 없게. */
export interface TabResetOverlay {
  isOpen: () => boolean
  close: () => void
}

/**
 * 콘텐츠의 "루트 상태". 목록형 탭은 **맨 위**, 지도 탭은 **내 위치 + 기본 스냅**이다.
 *
 * 판정(`isAtRoot`)과 실행(`reset`)을 한 객체로 묶는 이유: 판정 없이 실행만 등록하면
 * **이미 맨 위인데도 3번이 계속 이긴다** — 아무것도 움직이지 않는 스크롤에 햅틱만 붙고,
 * 사다리는 `"none"` 이라고 정직하게 말할 기회를 잃는다. 반대로 판정만 등록하면 3번이
 * 아무 일도 안 하고 멈춘다. 타입으로 둘을 함께 강제한다.
 */
export interface TabResetContent {
  isAtRoot: () => boolean
  reset: () => void
}

/** 화면이 "내가 되돌릴 수 있는 것" 으로 등록하는 것. 없는 능력은 생략한다. */
export interface TabResetTarget {
  overlay?: TabResetOverlay
  content?: TabResetContent
  /**
   * **화면이 고장났을 때만** 등록한다 — 전면 오류가 선 목록, 죽은 지도. 멀쩡한 화면은
   * `undefined` 로 두고 사다리를 3번에서 끝낸다(머리말 §4번은 "복구" 다).
   *
   * 등록되는 것은 getter 대리 객체라(`TabResetProvider`) 이 값은 **렌더마다 다시**
   * 평가된다. 화면은 조건식 하나로 켜고 끄면 되고, 사다리는 누르는 그 순간의 상태를
   * 읽는다(`readTabResetFacts` 의 `canRecover`).
   */
  recover?: () => void
}

/** 사다리가 보는 사실. 부수효과 없이 읽은 것만 담는다. */
export interface TabResetFacts {
  overlayOpen: boolean
  /** 이 탭이 루트 라우트가 아닌 화면을 보여 주는 중인가(커뮤니티 → 인기글). */
  awayFromTabRoot: boolean
  contentAwayFromRoot: boolean
  /** 화면이 고장나 있고, 그것을 되세울 방법을 등록했는가. */
  canRecover: boolean
}

export interface TabResetRequest {
  /** 지금 focus 된 라우트가 등록한 것. 아무도 등록하지 않았으면 비어 있다. */
  target?: TabResetTarget | null
  /**
   * 탭이 루트 라우트가 아닌 화면을 보여 주는 중이면 **루트로 되돌리는 함수**,
   * 이미 루트면 `null`. 이 축은 화면이 아니라 네비게이터가 안다(탭 레이아웃이 준다).
   */
  popToRoot?: (() => void) | null
}

/**
 * 사실 → 밟을 칸. **순수 함수다** — 렌더러 없이 조합을 전부 셀 수 있어야 한다.
 * 순서가 곧 규칙이므로 호출부에서 이 순서를 다시 적지 않는다.
 */
export function resolveTabResetStep(facts: TabResetFacts): TabResetStep {
  if (facts.overlayOpen) return "closeOverlay"
  if (facts.awayFromTabRoot) return "popToRoot"
  if (facts.contentAwayFromRoot) return "resetContent"
  if (facts.canRecover) return "recover"
  return "none"
}

/**
 * 등록된 것과 네비게이터가 아는 것을 **읽기만** 해서 사실로 만든다.
 *
 * 등록되지 않은 능력은 전부 `false` 다 — 그래야 그 칸이 다음 칸으로 떨어진다.
 * 판정 함수가 던지면 그 능력은 없는 것으로 친다: 한 화면의 ref 가 아직 안 붙었다고
 * 탭 바 전체가 죽으면 안 된다(사다리가 통째로 못 도는 것이 더 큰 고장이다).
 */
export function readTabResetFacts(request: TabResetRequest): TabResetFacts {
  const target = request.target ?? null
  return {
    overlayOpen: probe(target?.overlay?.isOpen),
    awayFromTabRoot: (request.popToRoot ?? null) !== null,
    contentAwayFromRoot:
      target?.content !== undefined && !probe(target.content.isAtRoot, true),
    canRecover: target?.recover !== undefined,
  }
}

/**
 * 사다리를 **정확히 한 칸** 밟고 그 이름을 돌려준다.
 *
 * 돌려주는 이름은 호출부가 햅틱을 줄지 정하는 데 쓴다 — 아무 일도 안 일어났는데
 * 진동만 오면 "눌렸는데 안 먹었다" 로 읽힌다.
 */
export function runTabReset(request: TabResetRequest): TabResetStep {
  const facts = readTabResetFacts(request)
  const step = resolveTabResetStep(facts)
  switch (step) {
    case "closeOverlay":
      request.target?.overlay?.close()
      return step
    case "popToRoot":
      request.popToRoot?.()
      return step
    case "resetContent":
      request.target?.content?.reset()
      return step
    case "recover":
      request.target?.recover?.()
      return step
    default:
      return step
  }
}

/** 판정 함수가 던지면 그 능력은 없는 것으로 친다(`fallback`). */
function probe(read: (() => boolean) | undefined, fallback = false): boolean {
  if (read === undefined) return fallback
  try {
    return read()
  } catch {
    return fallback
  }
}

/* ── 등록소 ─────────────────────────────────────────────────────────────── */

export interface TabResetRegistry {
  /** 등록하고 **해제 함수**를 돌려준다. 언마운트에서 반드시 부른다. */
  register: (route: string, target: TabResetTarget) => () => void
  /** 이 라우트에 등록된 것들을 합친 한 벌. 아무도 없으면 `null`. */
  resolve: (route: string) => TabResetTarget | null
}

export function createTabResetRegistry(): TabResetRegistry {
  const entries = new Map<string, TabResetTarget[]>()

  return {
    register(route, target) {
      const list = entries.get(route) ?? []
      list.push(target)
      entries.set(route, list)
      let released = false
      return () => {
        /* 두 번 해제해도 남의 등록을 지우지 않는다 — `indexOf` 는 같은 객체를 두 번
           등록한 경우 첫 번째를 지우므로, 빗장 없이 두 번 부르면 살아 있는 등록이
           하나 사라진다. */
        if (released) return
        released = true
        const current = entries.get(route)
        if (!current) return
        const index = current.indexOf(target)
        if (index >= 0) current.splice(index, 1)
        if (current.length === 0) entries.delete(route)
      }
    },
    resolve(route) {
      const list = entries.get(route)
      if (!list || list.length === 0) return null
      /* 능력별로 **나중에 등록된 것이 이긴다.** 뒤에서부터 훑어 처음 만난 것을 쓴다. */
      const merged: TabResetTarget = {}
      for (let index = list.length - 1; index >= 0; index -= 1) {
        const entry = list[index] as TabResetTarget
        if (merged.overlay === undefined && entry.overlay !== undefined) {
          merged.overlay = entry.overlay
        }
        if (merged.content === undefined && entry.content !== undefined) {
          merged.content = entry.content
        }
        if (merged.recover === undefined && entry.recover !== undefined) {
          merged.recover = entry.recover
        }
      }
      return merged
    },
  }
}

/* ── 스크롤이 "맨 위" 인가 ──────────────────────────────────────────────── */

/**
 * 맨 위로 치는 여유(pt). iOS 는 바운스 감속 끝에 0 이 아니라 0.5 같은 값에서 멈추고,
 * 안드로이드는 오버스크롤 글로우가 음수를 남긴다. 0 으로만 비교하면 맨 위에 있는 화면이
 * "아직 아니다" 라고 보고해, 재탭이 **아무것도 움직이지 않는 스크롤**을 시키고 햅틱까지
 * 준다 — 사다리가 `"none"` 으로 조용히 끝나야 할 자리다.
 */
export const SCROLL_TOP_EPSILON_PT = 1

/** 화면이 등록하는 `content.isAtRoot` 의 목록형 구현. 값은 한 곳에만 둔다. */
export function isAtScrollTop(offsetY: number): boolean {
  if (!Number.isFinite(offsetY)) return true
  return offsetY <= SCROLL_TOP_EPSILON_PT
}
