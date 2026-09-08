import {
  encodeStatsConsultMessage,
  parseStatsConsultMessage,
} from "../src/features/consultation/utils/statsConsultMessage"
import { resolveConsultUserCard } from "../src/features/consultation/utils/consultUserMessage"
import { buildStatsConsultContext } from "../src/features/stats-report/utils/consultContext"
import { weeklyStatsReport } from "./fixtures/nutritionStatsReports"

describe("report consultation message", () => {
  const card = {
    question: "이 리포트에서 무엇을 챙길까요?",
    label: "영양 통계",
    startDate: "2026-08-31",
    endDate: "2026-09-06",
  }
  test("renders the same attachment after server transcript serialization without exposing prompt context", () => {
    const context = buildStatsConsultContext(weeklyStatsReport)
    const message = encodeStatsConsultMessage(card, context)
    const reloaded = JSON.parse(JSON.stringify({ content: message }))
    expect(parseStatsConsultMessage(reloaded.content)).toEqual(card)
    expect(message).toContain(JSON.stringify(context).slice(1, -1))
    expect(parseStatsConsultMessage(message)).not.toHaveProperty("context")
  })
  test("takes precedence over permissive legacy parsers", () => {
    expect(
      resolveConsultUserCard({
        stats: () => card,
        restaurant: () => ({ question: "wrong" }),
        food: () => null,
        exam: () => null,
      }),
    ).toEqual({ kind: "stats", data: card })
  })
  test("does not swallow ordinary messages, corrupt payloads or mismatched question text", () => {
    expect(parseStatsConsultMessage("영양 통계가 궁금해요")).toBeNull()
    expect(
      parseStatsConsultMessage(`${card.question}\n\n[STATS_REPORT_V1]\n{`),
    ).toBeNull()
    expect(
      parseStatsConsultMessage(
        encodeStatsConsultMessage(card, "facts").replace(
          card.question,
          "changed",
        ),
      ),
    ).toBeNull()
    expect(
      parseStatsConsultMessage(
        encodeStatsConsultMessage({ ...card, endDate: "" }, "facts"),
      ),
    ).toBeNull()
  })
})
