import {
  buildReportCopy,
  recommendationFallback,
  verdictLabel,
} from "../src/features/home/components/reportCopy"
import type { MealReport } from "../src/features/food-report/types/report"

/**
 * 문구는 **실제 로케일 파일**에서 읽는다. 테스트가 자기 사전을 들고 있으면 화면에 나가는
 * 문장이 바뀌어도 초록으로 남는다 — 2026-09-05 문구 교정에서 실제로 그랬다.
 */
import ko from "../src/i18n/locales/ko/common.json"

import { localImageUri } from "../src/shared/images/localImageUri"

function lookup(key: string): string {
  let node: unknown = ko
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return key
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === "string" ? node : key
}

const t = (key: string, values?: Record<string, unknown>) =>
  Object.entries(values ?? {}).reduce(
    (s, [k, v]) => s.split(`{{${k}}}`).join(String(v)),
    lookup(key),
  )
function report(over: boolean): MealReport {
  return {
    foodAnalysisResultId: 1,
    mealType: "LUNCH",
    reportDate: "2026-09-04",
    focusNutrient: "potassium",
    source: "AI",
    policyVersion: null,
    prose: {
      headline: "AI 문장",
      evidence: [],
      plainly: "",
      foodNotes: {},
      swapTip: "",
      source: "AI",
    },
    facts: {
      mealType: "LUNCH",
      mealName: "샐러드와 오리고기",
      ckdStageLabel: "3기",
      isRecorded: true,
      focus: {
        nutrient: "potassium",
        nutrientLabel: "칼륨",
        level: over ? "OVER" : "TIGHT",
      },
      budgets: [
        {
          nutrient: "potassium",
          label: "칼륨",
          isReference: true,
          limit: 2380,
          limitText: "2,380mg",
          beforeThisMeal: 880,
          thisMeal: 620,
          consumed: 1500,
          consumedText: "1,500mg",
          remaining: 880,
          remainingText: "880mg",
          over: over ? 200 : 0,
          overText: over ? "200mg" : null,
          usedRatio: 0.63,
          isOver: over,
        },
      ],
      split: {
        nutrient: "potassium",
        past: 880,
        pastText: "880mg",
        pastLabel: "아침에 드신 만큼",
        current: 620,
        currentText: "620mg",
        currentLabel: "지금 이 점심",
        remaining: 880,
        remainingShare: 880,
        remainingShareText: "880mg",
        remainingLabel: "남은 몫",
        remainingMeals: ["DINNER"],
        isLastMeal: false,
      },
      mealVerdict: {
        level: "CAUTION",
        label: "기준 근접",
        driver: "potassium",
      },
      foods: [
        {
          name: "샐러드",
          grams: 120,
          level: "SAFE",
          levelLabel: "기준 안",
          nutrient: "potassium",
          nutrientLabel: "칼륨",
          amount: 200,
          amountText: "200mg",
          sharePercent: 30,
          dailyPercent: 8,
          hasPhosphateAdditive: false,
        },
        {
          name: "오리고기",
          grams: 50,
          level: "CAUTION",
          levelLabel: "기준 근접",
          nutrient: "potassium",
          nutrientLabel: "칼륨",
          amount: 420,
          amountText: "420mg",
          sharePercent: 70,
          dailyPercent: 18,
          hasPhosphateAdditive: false,
        },
      ],
      swaps: [],
      cookingTip: "",
      mealTotal: { calories: 234 },
      energyPercent: null,
    },
  }
}

describe("시안 문장 틀로 조립한다 (write.svg)", () => {
  it("헤드라인 · 범례 · 막대 · 근거가 시안 문장 그대로다", () => {
    const copy = buildReportCopy(report(false), t)!
    expect(copy.headline).toBe("칼륨을 880mg 더 드실 수 있어요.")
    expect(copy.segments.map((s) => s.label)).toEqual([
      "이전 섭취",
      "식사",
      "하루 기준까지",
    ])
    expect(copy.segments.map((s) => s.text)).toEqual([
      "880mg",
      "620mg",
      "880mg",
    ])
    expect(copy.evidence).toEqual([
      "이번 식사에서 섭취한 칼륨은 총 620mg이에요.",
      "대부분 오리고기(420mg)에서 섭취되었어요.",
    ])
  })

  it("all meal slots and unsaved reports are labelled 식사 without changing totals", () => {
    for (const slot of ["BREAKFAST", "LUNCH", "DINNER", "SNACKS", null]) {
      const r = report(false)
      r.facts.mealType = slot
      const copy = buildReportCopy(r, t)!
      expect(
        copy.segments.find((segment) => segment.key === "current"),
      ).toMatchObject({ label: "식사", value: 620 })
      expect(
        copy.segments.reduce((sum, segment) => sum + segment.value, 0),
      ).toBe(2380)
    }
  })

  it("넘겼으면 '넘었어요' 로 바뀌고 남은 칸은 사라진다", () => {
    const r = report(true)
    r.facts.split!.remaining = 0
    r.facts.split!.isLastMeal = true
    const copy = buildReportCopy(r, t)!
    expect(copy.headline).toBe("오늘 칼륨 권장량을 200mg 초과했어요.")
    expect(copy.segments.map((s) => s.key)).toEqual(["past", "current"])
  })

  it("리포트가 그 영양소의 음식을 안 골랐으면 재료 값에서 최대 기여를 고른다", () => {
    const r = report(false)
    r.facts.foods = r.facts.foods.map((f) => ({
      ...f,
      nutrient: "phosphorus",
      amountText: null,
    }))
    const copy = buildReportCopy(r, t, [
      {
        name: "샐러드",
        potassium: 200,
        sodium: 10,
        phosphorus: 30,
        protein: 2,
      },
      {
        name: "오리고기",
        potassium: 420,
        sodium: 90,
        phosphorus: 120,
        protein: 12,
      },
    ])!
    expect(copy.evidence[1]).toBe("대부분 오리고기(420mg)에서 섭취되었어요.")
  })

  it("집중 영양소가 없으면 null — 화면은 서버 문장으로 물러선다", () => {
    const r = report(false)
    r.facts.focus = null
    expect(buildReportCopy(r, t)).toBeNull()
  })

  it("배지는 안전 / 주의 / 제한 세 단어다", () => {
    expect(verdictLabel("SAFE", t)).toBe("적정")
    expect(verdictLabel("CAUTION", t)).toBe("주의")
    expect(verdictLabel("RESTRICTED", t)).toBe("조절 필요")
  })

  it("추천이 없을 때 음식 허용량을 대신 만들지 않는다", () => {
    expect(recommendationFallback(report(false), t)).toBe(
      "추천 식단을 준비하지 못했어요. 잠시 후 다시 확인해 주세요.",
    )
    expect(recommendationFallback(report(true), t)).toBe(
      "추천 식단을 준비하지 못했어요. 잠시 후 다시 확인해 주세요.",
    )
    const last = report(false)
    last.facts.split!.remainingMeals = []
    last.facts.split!.isLastMeal = true
    expect(recommendationFallback(last, t)).toBe(
      "추천 식단을 준비하지 못했어요. 잠시 후 다시 확인해 주세요.",
    )
    const none = report(false)
    none.facts.focus = null
    expect(recommendationFallback(none, t)).toBeNull()
  })

  it("재료가 하나뿐이면 근거는 한 줄이다 — 같은 말을 두 번 하지 않는다", () => {
    const single = report(false)
    single.facts.foods = [single.facts.foods[1]!]
    single.facts.topContributor = {
      name: "오리고기",
      amount: 420,
      amountText: "420mg",
      sharePercent: 100,
    }
    expect(buildReportCopy(single, t)!.evidence).toEqual([
      "이번 식사에서 섭취한 칼륨은 총 620mg이에요.",
    ])
  })

  it("한 재료가 절반 미만이면 이름을 짚지 않는다 — '그중 …' 은 새 정보일 때만", () => {
    const even = report(false)
    even.facts.topContributor = {
      name: "오리고기",
      amount: 300,
      amountText: "300mg",
      sharePercent: 48,
    }
    even.facts.foods = even.facts.foods.map((food) => ({
      ...food,
      sharePercent: 48,
    }))
    expect(buildReportCopy(even, t)!.evidence).toHaveLength(1)
  })
})

describe("local image URLs", () => {
  it("resolves cached loopback image URLs against the active local backend", () => {
    expect(
      localImageUri(
        "http://127.0.0.1:8000/static/food.jpg",
        "http://localhost:8100/api/v1",
        true,
      ),
    ).toBe("http://localhost:8100/static/food.jpg")
  })
  it("leaves cloud, device file and production URLs unchanged", () => {
    for (const uri of [
      "https://storage.googleapis.com/a.jpg?signature=x",
      "file:///photo.jpg",
      "http://127.0.0.1:8000/other.jpg",
    ])
      expect(localImageUri(uri, "http://localhost:8100/api/v1", true)).toBe(uri)
    const uri = "http://127.0.0.1:8000/static/food.jpg"
    expect(localImageUri(uri, "https://api.example.com/api/v1", true)).toBe(uri)
    expect(localImageUri(uri, "http://localhost:8100/api/v1", false)).toBe(uri)
  })
})
