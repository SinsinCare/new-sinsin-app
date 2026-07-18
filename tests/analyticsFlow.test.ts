import { sanitizeAnalyticsProperties } from "@/src/features/analytics/events"

describe("analytics flow property boundary", () => {
  it("keeps behavioral funnel fields", () => {
    expect(
      sanitizeAnalyticsProperties({
        method: "camera",
        slot: "breakfast",
        step_index: 2,
        step_count: 5,
        items_changed: true,
        consumption_changed: false,
        label_changed: true,
      }),
    ).toEqual({
      method: "camera",
      slot: "breakfast",
      step_index: 2,
      step_count: 5,
      items_changed: true,
      consumption_changed: false,
      label_changed: true,
    })
  })

  it("drops identifiers, content, health values, dates, and raw errors", () => {
    expect(
      sanitizeAnalyticsProperties({
        email: "person@example.com",
        name: "홍길동",
        food_title: "비빔밥",
        image_uri: "file://photo.jpg",
        health_value: 120,
        answer: "sensitive response",
        description: "free-form input",
        recorded_date: "2026-07-14",
        error_message: "backend detail",
        stage: "account",
      }),
    ).toEqual({ stage: "account" })
  })
})
