/**
 * **같은 글 토글의 순서 중재.** (2026-08-20)
 *
 * 좋아요·북마크는 낙관 델타(자기 역함수)로 즉시 반영하고 서버가 준 **절대값**
 * (`{liked, likes}` · `{bookmarked}`)으로 마무리한다. 그런데 같은 글에 토글 두 개가
 * 겹치면 그 절대값이 서로를 덮는다 — 실측: `{liked:false, likes:10}` 인 글을
 * 좋아요 → 취소로 연타하면 서버의 최종 진실은 `{liked:false, likes:10}` 인데,
 * 응답이 뒤바뀌어 도착하면(resp2 → resp1) **나중에 도착한 옛 응답**이 캐시를
 * `{liked:true, likes:11}` 로 되돌린다. 정산의 무효화는 `refetchType:"none"` 이라
 * 화면에서 저절로 낫지도 않는다 — 하트는 눌린 채 남고 서버는 안 눌렸다고 안다.
 * 반대 방향도 같은 뿌리다: 첫 탭이 성공해 절대값을 쓰고 나면 두 번째 탭의 델타는
 * 캐시에서 이미 지워졌는데, 실패 되돌리기가 그것을 한 번 더 빼서 서버가 모르는
 * 값을 만든다.
 *
 * 그래서 **글 × 종류** 레인마다 번호를 매기고 셋만 판정한다:
 *  - `beginToggle` — 번호를 받고 **그 자리에서** 낙관 델타를 건다(델타는 인자로
 *    넘긴다). 그래서 번호 순서 = 캐시에 델타가 찍힌 순서 = 요청이 나간 순서다.
 *    둘 사이에 `await` 를 끼우면 이 등식이 깨지므로(취소를 먼저 기다린 뒤 번호를 받는
 *    이유) 아예 사이에 아무것도 못 오게 한 벌로 묶었다. 델타가 넘어지면 그 자리에서
 *    레인을 닫는다 — `onMutate` 가 거절하면 query-core 는 `onSettled` 에 컨텍스트를
 *    주지 않아서(`this.state.context` 가 undefined) 아무도 `endToggle` 을 못 부른다.
 *  - `ownsConfirmation` — 서버 절대값은 **가장 나중에 시작한 토글**만 쓴다. 옛 번호의
 *    응답은 버린다(더 새 토글이 진실을 소유하고, 그 응답이 곧 온다).
 *  - `ownsRevert` — 실패 되돌리기는 **내 델타가 아직 캐시에 있을 때만**. 내 번호
 *    뒤에 절대값이 한 번이라도 떨어졌으면 그 델타는 이미 지워졌다.
 *
 * 좋아요와 북마크는 서로 **다른 칸**을 만지므로 레인을 나눈다(하나가 다른 하나의
 * 확정값을 버리게 하지 않는다). 다른 글끼리도 당연히 나뉜다 —
 * **이 파일에는 직렬화가 없다.** 요청은 전부 즉시 나가고, 순서 판정만 한다.
 * (정적 `scope` 로 줄 세우던 옛 방식은 서로 다른 글 A·B 까지 한 줄로 세웠다.)
 *
 * 목록 훅과 상세 훅이 **같은 이 레인**을 쓴다 — 두 화면에서 같은 글을 만지는 일이
 * 실제로 겹치기 때문에(피드 위에서 하트, 그 위에 상세가 떠 있는 동안) 등록부가
 * 두 벌이면 서로의 확정값을 못 본다.
 */

/** 토글의 종류. 서로 다른 칸을 만지므로 레인이 다르다. */
export type ToggleKind = "like" | "bookmark"

/** 한 레인의 진행 상황. 모듈 밖으로 나가지 않는다. */
interface ToggleLane {
  /** 이 레인에서 지금까지 시작한 토글 수 = 가장 최근 번호. */
  started: number
  /** 캐시에 실제로 쓴 서버 절대값의 번호(0 = 아직 없음). */
  confirmed: number
  /** 아직 정산되지 않은 토글 수. 0 이 되면 레인을 버린다(무한 증식 방지). */
  pending: number
}

/** `onMutate` 가 받아 `onSuccess`/`onError`/`onSettled` 로 넘기는 순번표. */
export interface ToggleTurn {
  readonly lane: string
  readonly version: number
}

const lanes = new Map<string, ToggleLane>()

/**
 * 이 토글의 순번을 받고 **그 자리에서** 낙관 델타(`applyDelta`)를 건다(머리말).
 * 반환값은 변이 컨텍스트로 흘려서 정산 콜백들이 같은 순번을 보게 한다.
 *
 * 델타를 인자로 받는 이유는 순서(번호 = 델타 = 요청)만이 아니다. 델타가 던지면
 * `onMutate` 가 거절하고, 그러면 query-core 는 `onSettled` 에 컨텍스트를 넘기지 않아
 * (`this.state.context` 가 undefined) `endToggle` 이 그냥 돌아간다 — 레인의 `pending`
 * 이 영영 0 이 못 되어 지도에 남는다. 그래서 여기서 닫는다(오늘의 호출부 사이에는
 * 캐시 패치뿐이라 실제로 던지지 않지만, 못 새게 만드는 값이 싸다).
 */
export function beginToggle(
  kind: ToggleKind,
  postId: string,
  applyDelta: () => void,
): ToggleTurn {
  const lane = `${kind}:${postId}`
  const state = lanes.get(lane) ?? { started: 0, confirmed: 0, pending: 0 }
  state.started += 1
  state.pending += 1
  lanes.set(lane, state)
  const turn = { lane, version: state.started }
  try {
    applyDelta()
  } catch (error) {
    // 델타를 못 걸었으면 이 토글은 없던 일이다 — 되돌릴 것도, 정산할 것도 없다.
    endToggle(turn)
    throw error
  }
  return turn
}

/**
 * **서버 절대값을 캐시에 쓸 차례인가.** 가장 나중에 시작한 토글만 참이다.
 *
 * 참을 돌려줄 때 "이 번호의 확정값이 캐시에 들어갔다" 를 함께 기록하므로,
 * **실제로 쓸 때만** 부를 것 — 서버 모양이 어긋나 쓸 값이 없으면(`null`) 부르지
 * 않아야 겹쳐 있던 토글이 자기 델타를 정상적으로 되돌린다.
 */
export function ownsConfirmation(turn: ToggleTurn | undefined): boolean {
  if (!turn) return false
  const state = lanes.get(turn.lane)
  if (!state || turn.version !== state.started) return false
  state.confirmed = turn.version
  return true
}

/** **내가 건 델타를 되돌려도 되는가.** 내 뒤에 확정값이 떨어졌으면 그 델타는 없다. */
export function ownsRevert(turn: ToggleTurn | undefined): boolean {
  // 순번이 없다 = `onMutate` 가 델타를 걸기 전에 넘어졌다. 되돌릴 것이 없다.
  if (!turn) return false
  const state = lanes.get(turn.lane)
  // 레인이 이미 정리됐다면 확정값이 지나간 흔적도 없다 — 그 델타는 아직 내 것이다.
  return !state || state.confirmed < turn.version
}

/** 정산 끝(`onSettled`). 마지막 하나가 끝나면 레인을 버린다. */
export function endToggle(turn: ToggleTurn | undefined): void {
  if (!turn) return
  const state = lanes.get(turn.lane)
  if (!state) return
  state.pending -= 1
  if (state.pending <= 0) lanes.delete(turn.lane)
}
