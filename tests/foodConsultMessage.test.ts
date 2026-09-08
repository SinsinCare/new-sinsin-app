import enCommon from "../src/i18n/locales/en/common.json"
import koCommon from "../src/i18n/locales/ko/common.json"
import {
  buildFoodConsultMessage,
  parseFoodConsultMessage,
  resolveNutrientLabel,
  type FoodConsultContext,
  type FoodConsultTranslate,
} from "../src/features/consultation/utils/foodConsultMessage"

/** i18next 흉내 — 점 경로 조회, count 복수형, 누락 시 키 반환. */
function makeTranslate(locale: Record<string, unknown>): FoodConsultTranslate {
  const resolve = (key: string): unknown =>
    key
      .split(".")
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === "object"
            ? (node as Record<string, unknown>)[part]
            : undefined,
        locale,
      )

  return (key, options) => {
    const count = options?.count
    let value: unknown
    if (typeof count === "number") {
      value = resolve(`${key}_${count === 1 ? "one" : "other"}`) ?? resolve(key)
    } else {
      value = resolve(key)
    }
    if (typeof value !== "string") return key
    return value.replace(/\{\{count\}\}/g, String(count))
  }
}

const koT = makeTranslate(koCommon)
const enT = makeTranslate(enCommon)

const bibimbapContext: FoodConsultContext = {
  mealType: "DINNER",
  title: "비빔밥과 미역국",
  servings: 1,
  total: {
    calories: 600,
    carbohydrates: 90,
    protein: 18,
    fat: 14,
    sodium: 1800,
    potassium: 900,
    phosphorus: 330,
    water: 490,
  },
  foods: [
    {
      name: "비빔밥",
      servingSizeValue: 500,
      servingSizeUnit: "g",
      calories: 550,
      protein: 18,
      sodium: 1200,
      potassium: 600,
      phosphorus: 280,
    },
    {
      name: "미역국",
      servingSizeValue: 1,
      servingSizeUnit: "그릇",
      calories: 50,
      protein: 3,
      sodium: 600,
      potassium: 300,
      phosphorus: 50,
    },
  ],
}

describe("buildFoodConsultMessage", () => {
  it("resolves every nutrient label in Korean (no raw i18n keys)", () => {
    const message = buildFoodConsultMessage(bibimbapContext, "ko", koT)
    expect(message).not.toMatch(/\w+\.nutrients\./)
    expect(message).toContain("[식사] 비빔밥과 미역국")
    expect(message).toContain("[끼니] 저녁")
    expect(message).toContain("[먹은 양] 1인분")
    expect(message).toContain("칼로리 600kcal")
    expect(message).toContain("나트륨 1,800mg")
  })

  it("resolves every nutrient label in English", () => {
    const message = buildFoodConsultMessage(bibimbapContext, "en", enT)
    expect(message).not.toMatch(/\w+\.nutrients\./)
    expect(message).toContain("Calories: 600 kcal")
    expect(message).toContain("Sodium: 1,800 mg")
    expect(message).toContain("1 serving")
  })
})

describe("parseFoodConsultMessage", () => {
  it("round-trips the Korean message into card data", () => {
    const message = buildFoodConsultMessage(bibimbapContext, "ko", koT)
    const parsed = parseFoodConsultMessage(message)

    expect(parsed).not.toBeNull()
    expect(parsed!.prompt).toBe(koT("consult.mealPrompt"))
    expect(parsed!.title).toBe("비빔밥과 미역국")
    expect(parsed!.mealLabel).toBe("저녁")
    expect(parsed!.servingsLabel).toBe("1인분")
    expect(parsed!.totals).toHaveLength(8)
    expect(parsed!.totals[0]).toEqual({
      label: "칼로리",
      amount: "600",
      unit: "kcal",
    })
    expect(parsed!.totals[4]).toEqual({
      label: "나트륨",
      amount: "1,800",
      unit: "mg",
    })
    expect(parsed!.foods).toHaveLength(2)
    expect(parsed!.foods[0].name).toBe("비빔밥 500g")
    expect(parsed!.foods[0].nutrients).toContainEqual({
      label: "나트륨",
      amount: "1,200",
      unit: "mg",
    })
    expect(parsed!.foods[1].name).toBe("미역국 1그릇")
  })

  it("round-trips the English message into card data", () => {
    const message = buildFoodConsultMessage(bibimbapContext, "en", enT)
    const parsed = parseFoodConsultMessage(message)

    expect(parsed).not.toBeNull()
    expect(parsed!.title).toBe("비빔밥과 미역국")
    expect(parsed!.mealLabel).toBe("Dinner")
    expect(parsed!.servingsLabel).toBe("1 serving")
    expect(parsed!.totals[0]).toEqual({
      label: "Calories",
      amount: "600",
      unit: "kcal",
    })
    expect(parsed!.totals[4]).toEqual({
      label: "Sodium",
      amount: "1,800",
      unit: "mg",
    })
    expect(parsed!.foods[0].name).toBe("비빔밥 500 g")
  })

  it("parses meal-only context without foods", () => {
    const message = buildFoodConsultMessage(
      { title: "닭죽", total: { calories: 320, sodium: 800 } },
      "ko",
      koT,
    )
    const parsed = parseFoodConsultMessage(message)

    expect(parsed).not.toBeNull()
    expect(parsed!.mealLabel).toBeNull()
    expect(parsed!.servingsLabel).toBeNull()
    expect(parsed!.totals).toHaveLength(2)
    expect(parsed!.foods).toHaveLength(0)
  })

  it("still parses legacy messages saved with raw i18n keys", () => {
    // 번역 누락 버그(foodReport.*) 시절 서버에 저장된 원문 — 스크린샷 재현.
    const legacy = [
      "이 식사의 영양 수치를 개인 기준과 비교하고, 다음 식사에서 확인할 항목을 알려 주세요.",
      "",
      "[식사] 비빔밥과 미역국",
      "[끼니] 저녁",
      "[먹은 양] 1인분",
      "[영양소] foodReport.nutrients.calories 600kcal, foodReport.nutrients.sodium 1,800mg",
      "[음식별 영양소]",
      "- 비빔밥 500g: foodReport.nutrients.calories 550kcal, foodReport.nutrients.sodium 1,200mg",
    ].join("\n")

    const parsed = parseFoodConsultMessage(legacy)
    expect(parsed).not.toBeNull()
    expect(parsed!.totals[0].label).toBe("foodReport.nutrients.calories")

    // 표시 시점 복원 — raw 키가 사람 말로 돌아온다.
    expect(resolveNutrientLabel(parsed!.totals[0].label, koT)).toBe("칼로리")
    expect(resolveNutrientLabel(parsed!.totals[1].label, koT)).toBe("나트륨")
    expect(resolveNutrientLabel("나트륨", koT)).toBe("나트륨")
  })

  it("ignores plain chat messages", () => {
    expect(parseFoodConsultMessage("안녕하세요, 오늘 뭐 먹을까요?")).toBeNull()
    expect(parseFoodConsultMessage("")).toBeNull()
    expect(
      parseFoodConsultMessage("오늘 [점심]으로 비빔밥 어때요?"),
    ).toBeNull()
    // 섹션 형태여도 영양 수치가 없으면 카드가 아니다.
    expect(
      parseFoodConsultMessage("[식사] 비빔밥\n[끼니] 저녁"),
    ).toBeNull()
  })

  it("survives max-length truncation mid line", () => {
    const message = buildFoodConsultMessage(bibimbapContext, "ko", koT)
    const truncated = message.slice(0, message.length - 25)
    const parsed = parseFoodConsultMessage(truncated)

    expect(parsed).not.toBeNull()
    expect(parsed!.totals).toHaveLength(8)
  })

  /*
    단백질이 **음식별 줄**에 실리는지 본다. 합계 줄에는 원래 있었고 음식별 줄에만 없었는데,
    픽스처에 `protein` 이 없어서 그 결함이 테스트를 그대로 통과했다. 콩팥병에서 단백질은
    나트륨과 나란한 판정 축이라 조용히 빠지면 안 된다.
  */
  it("음식별 줄에 단백질이 실린다", () => {
    const message = buildFoodConsultMessage(bibimbapContext, "ko", koT)
    const bibimbapLine = message
      .split("\n")
      .find((line) => line.startsWith("- 비빔밥"))
    expect(bibimbapLine).toBeDefined()
    expect(bibimbapLine).toContain("18")
    // 합계 줄이 아니라 그 음식 줄에서 나와야 한다.
    expect(message.split("\n").find((l) => l.startsWith("- 미역국"))).toContain("3")
  })
})
