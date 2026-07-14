import { normalizeFoodAnalysisResult } from "../src/shared/utils/foodAnalysisResult"

const total = {
  calories: 420,
  protein: 18,
  carbohydrates: 55,
  fat: 14,
  sodium: 610,
  potassium: 350,
  phosphorus: 220,
  water: 90,
}

describe("normalizeFoodAnalysisResult", () => {
  it("adapts the exact v2 READY payload to the result-card contract", () => {
    const result = normalizeFoodAnalysisResult({
      foodAnalysisResultId: 91,
      title: "현미밥",
      servings: 1,
      eatenPercentage: 100,
      foods: [
        {
          id: 7,
          name: "현미밥",
          restrictionLevel: "SAFE",
          servingSizeValue: 150,
          servingSizeUnit: "g",
          ...total,
        },
      ],
      total,
      revision: {
        revisionId: "revision-v2",
        catalogSnapshotId: "catalog-v2",
        policyVersion: "renal-default-v1",
        nutritionFingerprint: "fingerprint-v2",
        fullTotal: total,
        evaluation: {
          policyVersion: "renal-default-v1",
          context: "DEFAULT",
          alerts: [],
          guidance: [
            "이 결과는 식이 기록과 의료진 상담을 돕기 위한 참고 정보입니다.",
          ],
          medicationAction: null,
        },
        items: [
          {
            analysisItemId: "item-v2",
            canonicalFoodId: "food-v2",
            name: "현미밥",
            analyzedGrams: 150,
            fullNutrients: total,
            provenance: { type: "CATALOG" },
            confidence: 0.98,
          },
        ],
      },
    })

    expect(result.evaluation).toEqual({
      comment: "이 결과는 식이 기록과 의료진 상담을 돕기 위한 참고 정보입니다.",
      score: 0,
      cautionFoods: [],
      detail: {
        riskFactors: "",
        disclaimer:
          "이 결과는 식이 기록과 의료진 상담을 돕기 위한 참고 정보입니다.",
      },
    })
    expect(result.foods[0]).toMatchObject({
      id: 7,
      analysisItemId: "item-v2",
      canonicalFoodId: "food-v2",
      provenance: "CATALOG",
    })
  })

  it("fills nested arrays and detail when a legacy evaluation is partial", () => {
    const result = normalizeFoodAnalysisResult({
      foodAnalysisResultId: 92,
      foods: [],
      total: {},
      evaluation: { comment: "부분 응답", detail: null },
    })

    expect(result.foods).toEqual([])
    expect(result.evaluation).toEqual({
      comment: "부분 응답",
      score: 0,
      cautionFoods: [],
      detail: { riskFactors: "", disclaimer: "" },
    })
    expect(result.total).toEqual({
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      sodium: 0,
      potassium: 0,
      phosphorus: 0,
      water: 0,
    })
  })

  it("builds safe foods from revision items when the legacy projection is absent", () => {
    const result = normalizeFoodAnalysisResult({
      revision: {
        revisionId: "revision-only",
        fullTotal: { ...total, potassium: null },
        evaluation: { guidance: ["참고 안내"], alerts: ["나트륨 주의"] },
        items: [
          {
            analysisItemId: "item-only",
            name: "국",
            analyzedGrams: 200,
            fullNutrients: { ...total, sodium: undefined },
            provenance: { type: "AI_INGREDIENT_ESTIMATE" },
          },
        ],
      },
    })

    expect(result.foods).toHaveLength(1)
    expect(result.foods[0]).toMatchObject({
      analysisItemId: "item-only",
      name: "국",
      servingSizeValue: 200,
      sodium: 0,
      provenance: "AI_ESTIMATE",
    })
    expect(result.total.potassium).toBe(0)
    expect(result.evaluation.cautionFoods).toEqual([
      { food: "", reason: "나트륨 주의" },
    ])
  })

  it("prefers consumption nutrients for the current displayed result", () => {
    const result = normalizeFoodAnalysisResult({
      foods: [{ name: "국", ...total }],
      revision: {
        revisionId: "revision-consumption",
        fullTotal: total,
        evaluation: { guidance: ["전체 기준"] },
        items: [
          {
            analysisItemId: "item-consumption",
            name: "국",
            analyzedGrams: 200,
            fullNutrients: total,
            provenance: "CATALOG",
          },
        ],
      },
      consumptionRevision: {
        consumptionRevisionId: "consumption-1",
        baseRevisionId: "revision-consumption",
        consumedTotal: { ...total, calories: 210 },
        evaluation: { guidance: ["섭취 기준"] },
        items: [
          {
            analysisItemId: "item-consumption",
            consumedGrams: 100,
            nutrients: { ...total, calories: 210 },
          },
        ],
      },
    })

    expect(result.total.calories).toBe(210)
    expect(result.foods[0]).toMatchObject({
      analysisItemId: "item-consumption",
      consumedGrams: 100,
      calories: 210,
    })
    expect(result.evaluation.comment).toBe("섭취 기준")
  })

  it("matches legacy foods to revision items without trusting database order", () => {
    const result = normalizeFoodAnalysisResult({
      foods: [
        { name: "국", ...total },
        { name: "밥", ...total },
      ],
      revision: {
        revisionId: "revision-reordered",
        fullTotal: total,
        items: [
          {
            analysisItemId: "rice-item",
            name: "밥",
            analyzedGrams: 150,
            fullNutrients: total,
            provenance: "CATALOG",
          },
          {
            analysisItemId: "soup-item",
            name: "국",
            analyzedGrams: 200,
            fullNutrients: total,
            provenance: "AI_INGREDIENT_ESTIMATE",
          },
        ],
      },
    })

    expect(result.foods.map((food) => food.analysisItemId)).toEqual([
      "soup-item",
      "rice-item",
    ])
  })
})
