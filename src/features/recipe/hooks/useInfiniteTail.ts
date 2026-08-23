/**
 * **무한 목록 꼬리의 세 가지 사실을 훅이 직접 기억한다.** (2026-08-20)
 *
 * ─── 1. 다음 페이지 실패는 옵저버 플래그로 못 산다 ─────────────────────────────
 * `isFetchNextPageError` 는 쿼리의 **현재 status** 에서 파생된다. 그런데 이 계보는
 * 좋아요·북마크·조회수 기록이 전부 `setQueryData` 로 캐시를 만진다 —
 * `setQueryData` 는 `success` 를 디스패치하므로 status 가 `error` 에서 `success` 로
 * 돌아가고, **꼬리의 실패 행이 조용히 사라진다.** 글 하나 열었다 돌아오는 것만으로도
 * (`recordPostView`) 목록이 "그냥 거기서 끝난 것" 으로 보이게 되는 자리다.
 * 그래서 실패 사실은 훅이 자기 상태로 들고 있는다 — 캐시 쓰기에 지워지지 않는다.
 *
 * **오류 객체도 같이 들고 있는다.** 사실만 옮기고 문구를 옵저버의 `error` 에서 읽으면
 * 같은 캐시 쓰기가 그 `error` 를 null 로 만들어, "저희 쪽에 문제가 생겼어요"(500)
 * 라고 말하던 줄이 하트 한 번에 일반 문구로 주저앉는다. 못 믿는다고 선언한 출처에서
 * 메시지만 계속 읽고 있던 자리다.
 *
 * ─── 2. 자동 backfill 은 예산이 있어야 한다 ────────────────────────────────
 * 보이는 목록이 비었는데 다음 커서가 살아 있으면(차단 필터가 첫 페이지를 통째로 접은
 * 경우) 화면이 스스로 다음 장을 당긴다. 상한이 없으면 사람이 끼어들 자리 없이
 * 커서가 끝날 때까지 자동으로 페이지를 넘긴다 — 데이터 요금도, 서버 부하도 사용자가
 * 고르지 않은 것이다. 조합당 `MAX_AUTO_BACKFILL_PAGES` 장까지만 자동이고 그 뒤는
 * 화면이 "더 보기" 를 세운다.
 *
 * ─── 3. **아무 일도 없이 끝난** 다음 페이지도 사실이다 ──────────────────────
 * 좋아요·북마크·삭제는 낙관 갱신 전에 계보 전체를 취소한다(`cancelFeedCacheQueries`).
 * 그 취소가 진행 중이던 다음-페이지 요청을 함께 접으면 결과는 **실패가 아니다** —
 * `isError:false`, 장수 그대로, `hasNextPage` 는 여전히 true. 실패 행도 로더도 세울
 * 수 없고 `onEndReached` 는 새 스크롤 델타 없이는 다시 안 쏘므로, 사용자는 **조용히
 * 잘린 목록** 앞에 남는다. 그래서 그것도 기록해서 꼬리에 "더 보기" 를 세운다.
 *
 * ─── 4. 늦게 도착한 결과는 **자기 세대의 것일 때만** 사실이다 ──────────────
 * 다음 페이지 한 장은 느린 회선에서 몇 초씩 떠 있다. 그 사이에 사용자가 칩을 눌러
 * 조합을 바꾸거나 당겨서 새로고침하면 그 요청은 **이미 무효**다. 그런데 기록 콜백은
 * 만들어질 때의 키를 닫고 있어서, 옛 조합에서 잡힌 콜백이 뒤늦게 돌면 지금 조합의
 * 상태를 **옛 조합의 초기값 위에** 덮어썼다 — 그러면 렌더의 키 리셋이 그것을 다시
 * 초기화해서 지금 조합의 실패 행이 사라지고(`handleEndReached` 가 다시 열려 3번이
 * 막으려던 "조용히 잘린 목록" 으로 돌아간다), 다 쓴 backfill 예산이 되살아나
 * `MAX_AUTO_BACKFILL_PAGES` 상한이 무너진다.
 * 그래서 두 겹으로 막는다: 상태 갱신은 **지금 키**(ref)일 때만 하고, 요청은
 * **세대 번호**(epoch)를 들고 나가 돌아왔을 때 세대가 그대로일 때만 기록한다.
 * 두 번째 장치는 당김 새로고침에도 필요하다 — `useRefreshable` 은 `cancelRefetch:true`
 * 로 날아가 있던 다음-페이지 요청을 접는데, 그 결과는 실패가 아니라 "아무 일도 없음"
 * 이라 3번의 정체 판정에 그대로 걸린다(`resetTail` 이 방금 지운 자리에 "더 보기" 가
 * 다시 서던 자리다). 좋아요·북마크의 취소는 세대를 올리지 않으므로 그대로 정체다.
 *
 * ─── 세 사실 모두 **필터 조합에 매인다** ───────────────────────────────────
 * 키가 바뀌면(정렬·카테고리·태그·검색어) 옛 조합의 실패와 예산은 뜻이 없다. 그래서
 * 상태에 키 해시를 같이 넣고, 키가 달라진 렌더에서 **읽기도 초기값이고 저장도 한다** —
 * 읽기만 갈아치우면(`state.key === key ? state : fresh(key)`) 저장된 것은 옛 조합
 * 그대로라, 조합 B 를 들렀다 A 로 **돌아오는 순간 A 의 옛 실패와 다 쓴 예산이
 * 되살아난다**(그러면 `handleEndReached` 가 막혀 스크롤로도 재시도할 수 없다).
 * 렌더 중 `setState` 는 React 가 권하는 "props 변화에 맞춘 상태 조정" 이라
 * 커밋 없이 즉시 다시 렌더한다 — 리셋 `useEffect` 처럼 한 프레임 옛 값이 보이지 않는다.
 */

import { useCallback, useRef, useState } from "react"
import { hashKey } from "@tanstack/react-query"

/** 빈 목록을 메우려고 **자동으로** 더 받는 페이지 수의 상한(필터 조합당). */
export const MAX_AUTO_BACKFILL_PAGES = 3

interface TailState {
  /** 이 상태가 속한 필터 조합(쿼리 키 해시). */
  key: string
  /** 마지막 다음-페이지 요청이 실패했는가. */
  failed: boolean
  /** 그 실패의 원인. 꼬리 문구는 이것으로 고른다(머리말 1). */
  error: unknown
  /** 마지막 다음-페이지 요청이 **한 장도 못 받고** 끝났는가(취소 · 머리말 3). */
  stalled: boolean
  /** 이 조합에서 자동으로 당긴 페이지 수. */
  backfills: number
}

export interface InfiniteTail {
  /** 꼬리에 실패 행을 세울 것인가. 낙관 패치가 지우지 못하는 훅 소유의 사실이다. */
  isTailError: boolean
  /** 그 실패의 원인(문구를 고르는 데 쓴다). 실패가 아니면 `undefined`. */
  tailError: unknown
  /** 마지막 요청이 취소로 조용히 끝났는가. 화면은 꼬리에 "더 보기" 를 세운다. */
  isTailStalled: boolean
  /** 자동 backfill 예산이 남았는가. 다 쓰면 화면이 "더 보기" 를 그린다. */
  canAutoBackfill: boolean
  /** 다음-페이지 요청의 결과를 기록한다(성공하면 실패·정체 표시가 지워진다). */
  markTailResult: (failed: boolean, error?: unknown) => void
  /** 그 요청이 한 장도 못 받고 끝났음을 기록한다(취소). */
  markTailStalled: () => void
  /** 자동 backfill 한 장을 예산에서 뺀다. */
  noteAutoBackfill: () => void
  /** 실패 표시와 예산을 함께 처음으로 — 재조회·당김이 부른다. */
  resetTail: () => void
  /**
   * 지금 **세대 번호**. 다음-페이지 요청이 나갈 때 들고 나가고, 돌아왔을 때 이 값이
   * 그대로일 때만 결과를 기록한다(머리말 4). 조합 전환과 `resetTail` 이 올린다.
   */
  tailEpoch: () => number
}

const fresh = (key: string): TailState => ({
  key,
  failed: false,
  error: undefined,
  stalled: false,
  backfills: 0,
})

export function useInfiniteTail(queryKey: readonly unknown[]): InfiniteTail {
  const key = hashKey(queryKey)
  const [state, setState] = useState<TailState>(() => fresh(key))
  /*
    갱신 콜백이 닫아 둔 키가 아니라 **지금** 키를 봐야 늦게 도착한 옛 조합의 결과를
    거를 수 있다(머리말 4). 렌더마다 최신값을 넣는 ref — `useRefreshable` 과 같은 모양.
  */
  const keyRef = useRef(key)
  keyRef.current = key
  /*
    요청이 나갈 때의 세대. 조합 전환과 `resetTail`(당김·재조회)이 올린다.
    상태가 아니라 ref 인 이유: 키가 바뀌면 상태는 통째로 초기화되는데, 세대는 그
    초기화를 **건너서** 이어져야 날아가 있던 옛 요청을 걸러낼 수 있다.
  */
  const epochRef = useRef(0)
  /*
    키가 바뀌었으면 옛 조합의 값은 읽지도 **남기지도** 않는다. 읽기만 갈아치우면
    조합을 다녀온 뒤 옛 실패·예산이 되살아난다(머리말 마지막 절). 렌더 중 호출이라
    조건이 반드시 있어야 한다 — 없으면 무한 렌더다.
  */
  if (state.key !== key) {
    // 조합이 바뀌면 날아가 있던 옛 조합의 다음-페이지 요청도 무효다(머리말 4).
    epochRef.current += 1
    setState(fresh(key))
  }
  const current = state.key === key ? state : fresh(key)

  const update = useCallback(
    (patch: (prev: TailState) => TailState) =>
      setState((prev) =>
        /*
          이 콜백을 만든 조합이 아직 화면의 조합인가. 아니면 **아무 것도 하지 않는다** —
          옛 키의 초기값 위에 rebase 하면(`fresh(옛 키)`) 다음 렌더의 키 리셋이 지금
          조합의 실패·예산을 통째로 지운다(머리말 4).
        */
        keyRef.current === key && prev.key === key ? patch(prev) : prev,
      ),
    [key],
  )

  const markTailResult = useCallback(
    (failed: boolean, error?: unknown) =>
      update((prev) => ({
        ...prev,
        failed,
        error: failed ? error : undefined,
        // 결과가 왔다 = 취소로 끝난 직전 요청의 이야기는 끝났다.
        stalled: false,
      })),
    [update],
  )
  const markTailStalled = useCallback(
    () => update((prev) => ({ ...prev, stalled: true })),
    [update],
  )
  const noteAutoBackfill = useCallback(
    () => update((prev) => ({ ...prev, backfills: prev.backfills + 1 })),
    [update],
  )
  const resetTail = useCallback(() => {
    // 처음부터 다시 = 날아가 있던 옛 요청의 결과도 기록하지 않는다(머리말 4).
    epochRef.current += 1
    update(() => fresh(key))
  }, [update, key])
  const tailEpoch = useCallback(() => epochRef.current, [])

  return {
    isTailError: current.failed,
    tailError: current.failed ? current.error : undefined,
    isTailStalled: current.stalled,
    canAutoBackfill: current.backfills < MAX_AUTO_BACKFILL_PAGES,
    markTailResult,
    markTailStalled,
    noteAutoBackfill,
    resetTail,
    tailEpoch,
  }
}

/** `fetchNextTailPage` 가 판정에 쓰는 것만 추린 다음-페이지 결과. */
export interface TailFetchOutcome {
  isError: boolean
  error: unknown
  hasNextPage: boolean
}

interface TailFetchOptions {
  /** 옵저버의 `fetchNextPage`. 결과를 던지지 않고 돌려준다(`throwOnError` 미사용). */
  fetchNextPage: () => Promise<TailFetchOutcome>
  /** 지금 캐시에 든 페이지 수. 요청 전후로 두 번 부른다. */
  pageCount: () => number
  /** 훅의 세대 번호. 요청 전후로 두 번 부른다 — 달라졌으면 이 결과는 뜻이 없다. */
  tailEpoch: () => number
  markTailResult: (failed: boolean, error?: unknown) => void
  markTailStalled: () => void
}

/**
 * **다음 페이지 한 장을 받고 꼬리에 무슨 일이 있었는지 기록한다.** 피드와 검색이
 * 같은 함수를 쓴다 — 두 벌로 두면 한쪽만 고치는 사고가 난다.
 *
 * 결과는 셋 중 하나다:
 *  - 실패 → 실패 행(원인까지 같이 기록한다 · 머리말 1).
 *  - 새 장이 붙음 → 실패·정체 표시를 지운다.
 *  - **한 장도 안 붙었는데 다음 커서는 살아 있음** → 취소로 접힌 요청이다(머리말 3).
 *    실패가 아니므로 실패 행은 거짓말이고, 아무 것도 안 그리면 목록이 그냥 끝난
 *    것으로 보인다 — "더 보기" 를 세워 사용자가 다시 고를 수 있게 한다.
 */
export async function fetchNextTailPage({
  fetchNextPage,
  pageCount,
  tailEpoch,
  markTailResult,
  markTailStalled,
}: TailFetchOptions): Promise<void> {
  const before = pageCount()
  const epoch = tailEpoch()
  /*
    돌아왔을 때 세대가 바뀌었으면 **아무 것도 기록하지 않는다**(머리말 4). 당김
    새로고침은 `cancelRefetch:true` 로 이 요청을 접고 지나가는데, 접힌 결과는
    "실패도 아니고 장수도 그대로" 라 아래 정체 판정에 그대로 걸린다 — `resetTail` 이
    방금 지운 자리에 "더 보기" 가 다시 서던 자리다. 좋아요·북마크의 취소는 세대를
    올리지 않으므로 여전히 정체로 남는다(그때는 "더 보기" 가 맞는 말이다).
  */
  const superseded = () => tailEpoch() !== epoch
  try {
    const result = await fetchNextPage()
    if (superseded()) return
    markTailResult(result.isError, result.error)
    if (!result.isError && result.hasNextPage && pageCount() <= before) {
      markTailStalled()
    }
  } catch (error) {
    // `throwOnError` 를 안 쓰므로 여기는 거의 오지 않는다. 와도 뜻은 하나 —
    // 꼬리가 실패했다. 삼키면 화면이 "그냥 끝난 목록" 으로 돌아간다.
    if (superseded()) return
    markTailResult(true, error)
  }
}
