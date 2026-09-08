import { buildStatsConsultContext } from "../src/features/stats-report/utils/consultContext"
import {
  dailyStatsReport,
  weeklyStatsReport,
} from "./fixtures/nutritionStatsReports"

describe("statistics consultation context", () => {
  test("retains the selected report period, references, interpretations and uncertainty", () => {
    for (const report of [dailyStatsReport, weeklyStatsReport]) {
      const [, json] = buildStatsConsultContext(report).split("\n")
      const context = JSON.parse(json)
      expect(context.startDate).toBe(report.startDate)
      expect(context.endDate).toBe(report.endDate)
      expect(context.conclusion).toEqual(report.conclusion)
      expect(context.reliability).toEqual(report.reliability)
      expect(context.nutrients).toEqual(report.nutrients)
      expect(context.weekCharts).toEqual(report.weekCharts)
      expect(context.disclaimer).toBe(report.disclaimer)
    }
  })

  test("passes meal facts without record identifiers or mutating the report", () => {
    const before = JSON.stringify(dailyStatsReport)
    const [, json] = buildStatsConsultContext(dailyStatsReport).split("\n")
    const context = JSON.parse(json)
    expect(context.foods).toHaveLength(dailyStatsReport.foods!.length)
    for (const [index, food] of context.foods.entries()) {
      expect(food).not.toHaveProperty("analysisId")
      expect(food.title).toBe(dailyStatsReport.foods![index].title)
      expect(food.metricText).toBe(dailyStatsReport.foods![index].metricText)
    }
    expect(JSON.stringify(dailyStatsReport)).toBe(before)
  })
})
