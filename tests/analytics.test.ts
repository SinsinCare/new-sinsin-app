import {
  getAnalyticsScreenName,
  getAnalyticsSignupStep,
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
    expect(getAnalyticsScreenName(["post", "[id]"])).toBe("community_post")
    expect(
      getAnalyticsScreenName(["(settings)", "notification-settings"]),
    ).toBe("notification_settings")
    // 알림 설정과 알림함은 다른 화면이다. 종전에는 둘 다 `notifications` 였다.
    expect(getAnalyticsScreenName(["(settings)", "notifications"])).toBe(
      "notification_inbox",
    )
  })

  it("normalizes the real ids that useSegments hands over on device", () => {
    // 표는 라우트 패턴이지만 실기기 세그먼트에는 실제 id 가 들어온다. 정규화가 없으면
    // 상세 화면이 전부 `other` 로 떨어진다 — 화면명은 남되 식별자는 안 남는다.
    expect(getAnalyticsScreenName(["post", "patient-post-id"])).toBe(
      "community_post",
    )
    expect(getAnalyticsScreenName(["recipe", "482"])).toBe("recipe_detail")
    expect(getAnalyticsScreenName(["restaurant", "317", "photos"])).toBe(
      "restaurant_photos",
    )
    expect(getAnalyticsScreenName(["(write)", "recipe", "edit", "7"])).toBe(
      "recipe_edit",
    )
  })

  it("maps signup routes to stable step codes", () => {
    expect(getAnalyticsSignupStep(["(auth)", "terms-agreement"])).toBe("terms")
    expect(getAnalyticsSignupStep(["(auth)", "signup-email"])).toBe(
      "email_verification",
    )
    expect(getAnalyticsSignupStep(["(tabs)", "home"])).toBeNull()
  })
})
