/**
 * 라우트 파라미터 해석 — 화면 파일마다 복붙되던 두 가지를 한 곳에.
 *
 * expo-router 의 `useLocalSearchParams` 는 타입을 `string` 으로 주지만, 같은 키가 URL 에
 * 두 번 오면 런타임 값은 배열이다. 그래서 파라미터는 늘 `string | string[] | undefined`
 * 로 읽어야 하고, 그 분기가 라우트 파일 넷에 같은 모양으로 흩어져 있었다.
 */

/** 배열이면 첫 값. 같은 키가 겹쳐 온 URL 에서는 첫 번째만 쓴다. */
export function firstParam(
  param: string | string[] | undefined,
): string | undefined {
  return Array.isArray(param) ? param[0] : param
}

/** 10진수만 받는다. `Number("0x2a")` 는 42 를 돌려주고 `Number("")` 는 0 이다. */
const DECIMAL_ID = /^\d+$/u

/**
 * 숫자 id 파라미터. 10진수 문자열이 아니면 **null** — 0 이나 NaN 으로 뭉개지 않는다.
 * "없는 식당" 을 그릴지, 0 을 넘겨 화면이 자기 오류 상태를 그리게 할지는 호출부가 정한다.
 */
export function parseDecimalId(
  param: string | string[] | undefined,
): number | null {
  const value = firstParam(param)
  return value !== undefined && DECIMAL_ID.test(value)
    ? Number.parseInt(value, 10)
    : null
}
