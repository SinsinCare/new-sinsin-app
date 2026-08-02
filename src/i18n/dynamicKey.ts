/**
 * 런타임 문자열로 만들어진 i18n 키를 타입 지정된 `t()` 에 넘기는 **단 하나의 경계**.
 *
 * `src/i18n/i18next.d.ts` 가 `resources` 를 등록해 둔 덕에 `t("restauant.map.title")` 같은
 * 오타는 컴파일에서 잡힌다. 대신 키가 **표에서 나오는** 경로는 타입이 `string` 이 된다 —
 * `regionCatalog` 는 `` `restaurant.region.groups.${key}` `` 로 키를 조립하고(120개 그룹을
 * 손으로 나열하지 않기 위해서다), `filterCatalog.FilterChipSpec.labelKey` 도 `string` 이다.
 * 그 값들은 리터럴로 좁힐 방법이 없다.
 *
 * 그래서 캐스팅이 필요하다. 문제는 **어디서** 하느냐다. 호출처마다 `t(key as never)` 를
 * 흩뿌리면 그 파일에서는 오타 검사가 통째로 꺼진다 — 진짜 오타(`t("restaurant.sort.titel")`)도
 * 같은 모양이라 리뷰에서 구분되지 않는다. 여기 한 함수만 통과하게 두면, 검사가 꺼진 지점이
 * grep 한 번으로 전부 드러난다.
 *
 * @example
 * <Text>{t(dynamicKey(spec.labelKey))}</Text>
 */

import type { ParseKeys } from "i18next"

/** 기본 네임스페이스(`common`)의 유효한 키 집합. */
export type CommonKey = ParseKeys<"common">

/**
 * 표·응답에서 온 문자열을 `t()` 가 받는 키 타입으로 좁힌다.
 * **런타임 검사는 하지 않는다** — 없는 키면 i18next 가 키 문자열을 그대로 렌더하므로
 * 화면에서 즉시 눈에 띈다. 여기서 던지면 화면 하나가 통째로 날아가는 쪽이 더 나쁘다.
 */
export function dynamicKey(key: string): CommonKey {
  return key as CommonKey
}
