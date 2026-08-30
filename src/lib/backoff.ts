/**
 * 재시도 간격. **고정 간격을 쓰지 않는다.**
 *
 * ## 왜 앱에서 특히 중요한가
 *
 * 서버가 5분 죽었다가 살아난다고 하자. 그동안 실패한 재시도가 전부 같은 백오프 표를
 * 쓰고 있었다면, **설치 기반 전체가 같은 순간에 동시에** 다시 온다. 서버는 살아나자마자
 * 평소의 N배를 맞고 다시 죽고, 그러면 다음 재시도도 정렬돼 있어서 같은 일이 반복된다 —
 * 백오프가 회복을 돕는 게 아니라 **막는다.**
 *
 * 재시도하는 주체가 많을수록 나빠지는데, 이 코드는 우리가 가진 것 중 **주체가 가장 많다.**
 * 서버 인스턴스는 몇 대지만 앱은 설치 수만큼이다.
 *
 * ## 어느 지터인가 — equal jitter
 *
 *   full         `rand(0, d)`          가장 잘 퍼지지만 **0에 가까운 값이 나온다.**
 *                                      서버가 아직 아플 때 즉시 다시 때린다.
 *   equal        `d/2 + rand(0, d/2)`  아래로 절반까지만 — 간격의 **바닥이 있다.**
 *
 * `equal` 을 쓴다. 상한이 그대로 지켜져서 "최대 얼마나 기다리는가" 가 예측 가능하게 남고,
 * 서버가 아직 회복 중일 때 즉시 돌아오지 않는다.
 *
 * 서버 쪽에도 같은 계약의 도우미가 있다(`sinsin-be-bun/src/infra/backoff.ts`).
 * 두 벌인 이유는 저장소가 다르기 때문이고, **규칙은 같게 유지한다.**
 */

export type RandomSource = () => number

/**
 * 이미 정해진 지연에 equal jitter 를 씌운다. 결과는 항상 `[d/2, d]` 다.
 *
 * 상한을 넘기지 않는 것이 계약이다 — 넘기면 그 위에 걸린 타임아웃·마감 계산이
 * 조용히 어긋난다.
 */
export function jitter(delayMs: number, random: RandomSource = Math.random): number {
  if (!Number.isFinite(delayMs) || delayMs <= 0) return 0
  const half = delayMs / 2
  return Math.round(half + random() * half)
}

/**
 * `attempt` 번째 재시도까지 기다릴 밀리초. `attempt` 는 0부터.
 *
 * 지수 증가에 equal jitter 를 씌운다: 결과는 항상 `[d/2, d]` 안이고
 * `d = min(baseMs * 2^attempt, maxMs)` 다.
 */
export function backoffMs(
  attempt: number,
  options: { baseMs: number; maxMs: number; random?: RandomSource },
): number {
  const exponent = Math.max(0, Math.trunc(attempt))
  // `2 ** 큰 수` 가 Infinity 가 되어 상한 계산을 통과하는 것을 막는다.
  const raw = options.baseMs * 2 ** Math.min(exponent, 30)
  const ceiling = Math.max(0, Math.min(raw, options.maxMs))
  return jitter(ceiling, options.random)
}
