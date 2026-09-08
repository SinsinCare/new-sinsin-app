/**
 * 영양 미확정(PENDING) 항목의 표시 규칙 — 2026-09-05 실측(식품표에 없는 "순대국"):
 * 앱이 서버의 UNKNOWN 등급을 "조절 필요" 로 그리고, null 영양을 0 으로 더해 "0 kcal · 적정" 을
 * 만들었다. 모름은 제한도 안심도 아니다.
 */
import ko from "../src/i18n/locales/ko/common.json"
import {
  isNutritionReliable,
  sumReliableNutrient,
  verdictLabel,
} from "../src/features/home/components/reportCopy"
import type { Translate } from "../src/features/home/components/reportCopy"

const t: Translate = (key) => {
  const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ko)
  if (typeof value !== "string") throw new Error(`missing key ${key}`)
  return value
}

describe("UNKNOWN 등급 라벨", () => {
  it("모름은 '확인 안 됨' — 제한 라벨을 빌리지 않는다", () => {
    expect(verdictLabel("UNKNOWN", t)).toBe("확인 안 됨")
    expect(verdictLabel("UNKNOWN", t)).not.toBe(verdictLabel("RESTRICTED", t))
    expect(verdictLabel("RESTRICTED", t)).toBe("조절 필요")
  })
})

describe("DB 재료 합 — PENDING 제외", () => {
  const milk = { name: "우유", nutritionStatus: "OK", potassium: 300 }
  const soup = { name: "순대국", nutritionStatus: "PENDING", potassium: null }
  it("확정 항목만 더한다", () => {
    expect(sumReliableNutrient([milk, soup], (f) => f.potassium)).toBe(300)
  })
  it("항목이 있는데 전부 PENDING 이면 null — 0 이 아니다", () => {
    expect(sumReliableNutrient([soup], (f) => f.potassium)).toBeNull()
  })
  it("항목이 없으면 null (호출부가 서버 합계로 물러선다)", () => {
    expect(sumReliableNutrient([], (f: typeof milk) => f.potassium)).toBeNull()
  })
  it("상태가 없는 옛 응답은 확정으로 본다 (양성 대조)", () => {
    expect(isNutritionReliable({ name: "밥", nutritionStatus: undefined })).toBe(true)
    expect(sumReliableNutrient([{ name: "밥", potassium: 40, nutritionStatus: undefined }], (f) => f.potassium)).toBe(40)
  })
})
