import {
  getAnalyticsScreenName,
  sanitizeAnalyticsProperties,
} from "@/src/features/analytics/events"

describe("analytics privacy contract", () => {
  it("keeps only primitive, non-sensitive properties", () => {
    expect(
      sanitizeAnalyticsProperties({
        method: "photo",
        step_count: 4,
        success: true,
        email: "patient@example.com",
        health_status: "sensitive",
        nested: { value: "blocked" },
      }),
    ).toEqual({ method: "photo", step_count: 4, success: true })
  })

  it("maps route segments to stable categories without identifiers", () => {
    expect(getAnalyticsScreenName(["(tabs)", "home"])).toBe("home")
    expect(getAnalyticsScreenName(["post", "patient-post-id"])).toBe(
      "community_post",
    )
    expect(
      getAnalyticsScreenName(["(settings)", "notification-settings"]),
    ).toBe("notifications")
  })
})
