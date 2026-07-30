import enCommon from "../src/i18n/locales/en/common.json"
import koCommon from "../src/i18n/locales/ko/common.json"

type Leaf = { key: string; value: unknown }

function leaves(value: unknown, prefix = ""): Leaf[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [{ key: prefix, value }]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("common translations", () => {
  it("has an English value for every Korean UI key", () => {
    const englishKeys = new Set(leaves(enCommon).map(({ key }) => key))
    const missing = leaves(koCommon)
      .map(({ key }) => key)
      .filter((key) => !englishKeys.has(key))

    expect(missing).toEqual([])
  })

  it("does not fall back to Korean inside the English locale", () => {
    const allowedAutonyms = new Set(["settings.language.korean"])
    const koreanValues = leaves(enCommon)
      .filter(
        ({ key, value }) =>
          typeof value === "string" &&
          /[가-힣]/.test(value) &&
          !allowedAutonyms.has(key),
      )
      .map(({ key }) => key)

    expect(koreanValues).toEqual([])
  })
})
