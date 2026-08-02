/**
 * `common.json` 에 키가 **실제로 있는지** 리소스에서 직접 확인한다.
 *
 * `i18n.t()` 를 쓰지 않는 이유가 둘이다.
 *  1. 앱 tsconfig 는 i18n 키를 리터럴 유니온으로 타입해 둬서 **동적 키를 넘길 수 없다**
 *     (`npx tsc --noEmit` 이 TS2345 로 잡는다). 카탈로그를 순회하며 검사하려면 캐스팅으로
 *     그 타입 안전을 깨야 하는데, 깨 버리면 정작 앱 코드에서 오타 키가 통과한다.
 *  2. i18next 는 키가 없으면 **키 문자열을 그대로 돌려준다.** 그래서 `t()` 결과만 보면
 *     "번역이 키와 같은 문자열" 인 경우와 구분되지 않는다.
 *
 * 리소스를 직접 뒤지면 두 문제가 동시에 사라진다.
 */

import enCommon from "../../src/i18n/locales/en/common.json"
import koCommon from "../../src/i18n/locales/ko/common.json"

export type TestLocale = "ko" | "en"

export const TEST_LOCALES: readonly TestLocale[] = ["ko", "en"]

function resolve(key: string, locale: TestLocale): unknown {
  const root: unknown = locale === "ko" ? koCommon : enCommon
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      root,
    )
}

/** 그 로케일에 잎(문자열) 값이 있는가. 중간 객체만 있으면 `false` 다. */
export function hasCommonKey(key: string, locale: TestLocale): boolean {
  return typeof resolve(key, locale) === "string"
}

/** ko/en 양쪽에 있는가. 한쪽만 있으면 그 언어 사용자에게 키 문자열이 노출된다. */
export function hasCommonKeyInBothLocales(key: string): boolean {
  return TEST_LOCALES.every((locale) => hasCommonKey(key, locale))
}

/** 문구 자체를 봐야 할 때. 없으면 `undefined`. */
export function commonValue(
  key: string,
  locale: TestLocale,
): string | undefined {
  const value = resolve(key, locale)
  return typeof value === "string" ? value : undefined
}
