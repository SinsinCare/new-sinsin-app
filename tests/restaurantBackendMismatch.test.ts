/**
 * "이 백엔드에는 그 API 가 없다" 판정.
 *
 * 픽스처는 지어낸 값이 아니라 2026-07-31 에 화면에 뜬 실제 400 본문이다. 그 응답을
 * 아무도 읽어 내지 못해서 식당 탭 전체가 "만들었는데 안 되는 기능" 으로 남아 있었다.
 */

import {
  backendMismatchMessage,
  isMisroutedCollectionRequest,
} from "../src/features/restaurant/utils/backendMismatch"

/** 실제 응답: `GET /api/v1/restaurants/search` → 400 COMMON_ERROR_001 */
const REAL_400 = {
  statusCode: 400,
  fieldErrors: [
    {
      field: "path.restaurant_id",
      rejectedValue: null,
      type: "int_parsing",
      reason:
        "Input should be a valid integer, unable to parse string as an integer",
    },
  ],
}

describe("isMisroutedCollectionRequest", () => {
  it("실제로 났던 400 을 **환경 문제로 알아본다**", () => {
    expect(isMisroutedCollectionRequest(REAL_400)).toBe(true)
  })

  it("진짜 잘못된 요청(쿼리 파라미터 문제)은 환경 문제가 아니다", () => {
    // 뒤집힌 bbox·없는 필터 키는 우리가 고쳐야 할 요청 결함이다. 이걸 환경 문제로
    // 오진하면 앞 판본이 400 을 전부 "인터넷 확인" 으로 뭉갠 실수를 방향만 바꿔 되풀이한다.
    expect(
      isMisroutedCollectionRequest({
        statusCode: 400,
        fieldErrors: [
          { field: "query.swLat", type: "greater_than", reason: "…" },
        ],
      }),
    ).toBe(false)
  })

  it("경로 파라미터라도 정수 파싱 실패가 아니면 아니다", () => {
    expect(
      isMisroutedCollectionRequest({
        statusCode: 400,
        fieldErrors: [{ field: "path.restaurant_id", type: "missing" }],
      }),
    ).toBe(false)
  })

  it("400 이 아닌 상태는 보지 않는다 (404·500 은 다른 갈래다)", () => {
    expect(isMisroutedCollectionRequest({ ...REAL_400, statusCode: 404 })).toBe(
      false,
    )
    expect(isMisroutedCollectionRequest({ ...REAL_400, statusCode: 500 })).toBe(
      false,
    )
  })

  it("fieldErrors 가 없거나 이상한 모양이어도 죽지 않는다", () => {
    expect(isMisroutedCollectionRequest({ statusCode: 400 })).toBe(false)
    expect(
      isMisroutedCollectionRequest({ statusCode: 400, fieldErrors: "nope" }),
    ).toBe(false)
    expect(
      isMisroutedCollectionRequest({ statusCode: 400, fieldErrors: [null, 3] }),
    ).toBe(false)
  })
})

describe("backendMismatchMessage", () => {
  it("어느 API 가 없는지와 무엇을 확인할지를 함께 말한다", () => {
    const message = backendMismatchMessage("restaurant-search")
    expect(message).toContain("restaurant-search")
    expect(message).toContain("EXPO_PUBLIC_BACKEND_URL")
  })
})
