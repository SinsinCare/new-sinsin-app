/* eslint-disable no-restricted-syntax --
 * 이 파일은 Hermes 에 없는 `Intl.PluralRules` 를 **의도적으로** 참조한다.
 * 앱 코드에서 그 API 를 막는 규칙이 바로 그것인데, 여기서는 엔진에 없는 상태를
 * 재현하는 게 테스트의 목적이라 유일하게 허용되는 자리다.
 */
import { createInstance } from "i18next"

import enAuth from "../src/i18n/locales/en/auth.json"
import enCommon from "../src/i18n/locales/en/common.json"
import enHealth from "../src/i18n/locales/en/health.json"
import enRecipe from "../src/i18n/locales/en/recipe.json"
import enSettings from "../src/i18n/locales/en/settings.json"
import koAuth from "../src/i18n/locales/ko/auth.json"
import koCommon from "../src/i18n/locales/ko/common.json"
import koHealth from "../src/i18n/locales/ko/health.json"
import koRecipe from "../src/i18n/locales/ko/recipe.json"
import koSettings from "../src/i18n/locales/ko/settings.json"

/**
 * Hermes 에는 `Intl.PluralRules` 가 없다. 그러면 i18next 는 조용히 자체 더미 규칙
 * (`count === 1 ? "one" : "other"`, 즉 **영어** 규칙)으로 내려앉는다. 문제는 이게
 * 예외를 던지지 않는다는 점이다 — 개발 기기(Node·JSC)에서는 진짜 `Intl.PluralRules`
 * 가 있어서 멀쩡히 동작하고, 실기기에서만 다르게 동작한다.
 *
 * 가장 위험한 결과: 어떤 복수 그룹이 `_other` 만 갖고 `_one` 도 기본 키도 없으면
 * `count === 1` 에서 i18next 가 **키 문자열 자체**를 렌더한다. 한국어는 복수 구분이
 * 없어서 `_other` 만 쓰는 게 오히려 자연스러운 작성법이라, 이 함정은 "제대로 쓴"
 * 한국어 키에서 터진다.
 *
 * 그래서 정적 검사 대신 **엔진 조건을 그대로 재현해서** 전부 렌더해 본다.
 */

const RESOURCES = {
  ko: {
    auth: koAuth,
    common: koCommon,
    health: koHealth,
    recipe: koRecipe,
    settings: koSettings,
  },
  en: {
    auth: enAuth,
    common: enCommon,
    health: enHealth,
    recipe: enRecipe,
    settings: enSettings,
  },
} as const

const NAMESPACES = ["auth", "common", "health", "recipe", "settings"] as const
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix]
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

/** 복수 접미사가 붙은 키들의 기본 이름 집합. */
function pluralBaseKeys(bundle: unknown): string[] {
  const bases = new Set<string>()
  for (const key of leafKeys(bundle)) {
    if (PLURAL_SUFFIX.test(key)) bases.add(key.replace(PLURAL_SUFFIX, ""))
  }
  return [...bases]
}

describe("plural resolution without Intl.PluralRules (Hermes)", () => {
  const realPluralRules = Intl.PluralRules

  beforeAll(() => {
    // @ts-expect-error -- 실기기(Hermes) 조건을 그대로 만든다.
    delete Intl.PluralRules
  })

  afterAll(() => {
    Object.defineProperty(Intl, "PluralRules", {
      value: realPluralRules,
      configurable: true,
      writable: true,
    })
  })

  it.each(["ko", "en"] as const)(
    "never renders a raw key for any plural group in %s",
    (language) => {
      const i18n = createInstance()
      void i18n.init({
        resources: RESOURCES,
        lng: language,
        fallbackLng: "ko",
        defaultNS: "common",
        ns: [...NAMESPACES],
        interpolation: { escapeValue: false },
        returnNull: false,
      })

      const unresolved: string[] = []
      for (const ns of NAMESPACES) {
        // 키를 리소스에서 동적으로 끌어오므로 생성된 키 유니온을 쓸 수 없다.
        const t = i18n.getFixedT(language, ns) as unknown as (
          key: string,
          options?: Record<string, unknown>,
        ) => string
        for (const base of pluralBaseKeys(RESOURCES[language][ns])) {
          for (const count of [0, 1, 2, 5, 11, 21]) {
            const rendered = t(base, { count })
            // 키가 그대로 나오거나 보간이 안 풀리면 사용자 화면이 깨진 것이다.
            if (rendered === base || rendered.includes("{{")) {
              unresolved.push(`${ns}:${base} @count=${count} -> ${rendered}`)
            }
          }
        }
      }

      expect(unresolved).toEqual([])
    },
  )

  it("confirms the engine condition under test is the one Hermes ships", () => {
    // 이 테스트가 의미를 가지려면 실제로 PluralRules 가 없어야 한다.
    expect(typeof Intl.PluralRules).toBe("undefined")
    // Hermes 가 싣고 있는 셋은 그대로 있어야 한다.
    expect(typeof Intl.DateTimeFormat).toBe("function")
    expect(typeof Intl.NumberFormat).toBe("function")
  })
})
