/**
 * 분석 로딩 막에 띄우는 팁의 **순서**.
 *
 * 팁은 i18n(`common:foodLoading.tips.*`)에 살고, 여기는 어느 것을 언제 보여 줄지만
 * 정한다. 예전(5개, 매번 `Math.random`)에는 같은 팁이 연달아 두 번 뜨는 일이 흔했다 —
 * 7초마다 5분의 1 확률이라, 20~30초 걸리는 분석 한 번에 한두 번은 겹쳤다. 사용자에게
 * 그것은 "멈췄나" 로 읽힌다.
 *
 * 그래서 **한 바퀴 안에서는 절대 겹치지 않고**, 바퀴가 바뀌는 경계에서도 직전 팁과
 * 같은 팁으로 시작하지 않는다. 순서는 매번 섞는다 — 같은 순서를 외우게 두면 두 번째
 * 분석부터 "또 이거" 가 된다.
 */

/** i18n 키. 순서는 의미가 없다(매번 섞는다) — 개수만 본다. */
export const LOADING_TIP_KEYS = [
  "foodLoading.tips.t01",
  "foodLoading.tips.t02",
  "foodLoading.tips.t03",
  "foodLoading.tips.t04",
  "foodLoading.tips.t05",
  "foodLoading.tips.t06",
  "foodLoading.tips.t07",
  "foodLoading.tips.t08",
  "foodLoading.tips.t09",
  "foodLoading.tips.t10",
  "foodLoading.tips.t11",
  "foodLoading.tips.t12",
  "foodLoading.tips.t13",
  "foodLoading.tips.t14",
  "foodLoading.tips.t15",
  "foodLoading.tips.t16",
] as const

/** 팁이 바뀌는 간격(ms). 한 문장을 두 번 읽을 만큼 — 7초는 길고 4초는 쫓긴다. */
export const LOADING_TIP_INTERVAL_MS = 5500

export interface TipCycler {
  /** 지금 보여 줄 팁의 인덱스. */
  current(): number
  /** 다음 팁으로 넘어가고 그 인덱스를 돌려준다. */
  next(): number
}

/** Fisher–Yates. `random` 은 [0, 1) — 테스트가 결정적으로 넣는다. */
function shuffled(count: number, random: () => number): number[] {
  const order = Array.from({ length: count }, (_, index) => index)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = order[i]!
    order[i] = order[j]!
    order[j] = tmp
  }
  return order
}

/**
 * 팁 순환기. `count` 가 1 이하면 항상 0 이다(겹침을 피할 방법이 없다).
 *
 * 바퀴 경계: 새로 섞은 순서의 첫 칸이 직전 팁과 같으면 **첫 칸과 마지막 칸을 바꾼다.**
 * 다시 섞는 것보다 싸고, 바꾼 뒤에도 한 바퀴 안에 중복이 없다는 성질은 그대로다.
 */
export function createTipCycler(
  count: number,
  random: () => number = Math.random,
): TipCycler {
  if (count <= 1) {
    return { current: () => 0, next: () => 0 }
  }
  let order = shuffled(count, random)
  let position = 0

  return {
    current: () => order[position]!,
    next: () => {
      position += 1
      if (position >= order.length) {
        const last = order[order.length - 1]!
        order = shuffled(count, random)
        if (order[0] === last) {
          const swap = order[0]!
          order[0] = order[order.length - 1]!
          order[order.length - 1] = swap
        }
        position = 0
      }
      return order[position]!
    },
  }
}
