import { sanitizeAnalyticsProperties } from "@/src/features/analytics/events"
import { analyticsBatchUrl } from "@/src/features/analytics/transport"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = join(__dirname, "..")

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

  it("keeps screen exit location and dwell time", () => {
    expect(
      sanitizeAnalyticsProperties({
        screen: "restaurant_map",
        reason: "background",
        dwell_seconds: 37,
        dwell_bucket: "slow",
      }),
    ).toEqual({
      screen: "restaurant_map",
      reason: "background",
      dwell_seconds: 37,
      dwell_bucket: "slow",
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

describe("analytics transport ownership", () => {
  it("Mixpanel ingestion is server-owned, not duplicated by a native client SDK", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf-8")
    const envExample = readFileSync(join(ROOT, ".env.example"), "utf-8")
    expect(pkg).not.toContain('"mixpanel-react-native"')
    expect(envExample).not.toContain("EXPO_PUBLIC_MIXPANEL_TOKEN")
    expect(envExample).not.toContain("EXPO_PUBLIC_MIXPANEL_SERVER_URL")
  })
})

/*
  전송 URL — 이 오타 하나가 앱의 모든 이벤트를 지웠다.

  `EXPO_PUBLIC_BACKEND_URL` 은 `/api/v1` 까지 포함한 값이라, 거기에 `/api/v1/analytics/batch` 를
  문자열로 이으면 `/api/v1/api/v1/...` 이 되어 404 가 난다. 전송기는 4xx 를 계약 위반으로 보고
  배치를 **버리므로**(무한 재전송 방지) 아무 데도 흔적이 안 남는다. 실측으로 잡았다:
  로컬 서버 도착 0건 · 이중 경로 404 · 정상 경로 200.
*/
describe("analyticsBatchUrl", () => {
  it("base 에 이미 /api/v1 이 있으면 한 번만 붙인다", () => {
    expect(analyticsBatchUrl("http://localhost:8100/api/v1")).toBe(
      "http://localhost:8100/api/v1/analytics/batch",
    )
  })

  it("끝의 슬래시와 버전 접두를 함께 걷어낸다", () => {
    expect(
      analyticsBatchUrl("https://sinsin-test-be.example.com/api/v1/"),
    ).toBe("https://sinsin-test-be.example.com/api/v1/analytics/batch")
  })

  it("오리진만 온 base 에도 같은 결과를 만든다", () => {
    expect(analyticsBatchUrl("https://sinsin-test-be.example.com")).toBe(
      "https://sinsin-test-be.example.com/api/v1/analytics/batch",
    )
  })

  it("경로 중간의 api/v1 은 건드리지 않는다 — 끝에 붙은 것만 접두다", () => {
    expect(analyticsBatchUrl("https://gw.example.com/api/v1/proxy")).toBe(
      "https://gw.example.com/api/v1/proxy/api/v1/analytics/batch",
    )
  })
})
