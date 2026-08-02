/**
 * **필드 이름 드리프트 회귀 테스트.**
 *
 * 이 기능은 "만들어졌는데 동작하지 않는" 상태였다. 앱과 백엔드를 같은 문서를 보고 병렬로
 * 만드는 동안 필드 이름이 갈렸고, 서비스가 응답을 `as SomeDto` 로 단정했기 때문에
 * `npx tsc --noEmit` 은 깨끗한데 화면에서는 모든 값이 `undefined` 였다. 실제 증상은
 * `RestaurantCard` 의 `card.nutritionBadges.slice(...)` → `Cannot read property 'slice'
 * of undefined` 로 목록 전체가 죽는 것이었다.
 *
 * 타입은 이 계열의 결함을 못 잡는다는 것이 이미 증명됐다. 그래서 **런타임 검사와 유도
 * 로직을 테스트로 고정한다.** 아래 픽스처는 살아 있는 서버(:8100, 강남 376곳, alembic 074)
 * 에서 실측한 응답이다 — 문서가 아니라 응답이 근거다. 서버가 다시 이름을 바꾸면 이 테스트가
 * 먼저 빨개져야 하고, 화면이 죽는 것이 그 다음이어야 한다.
 */

import {
  BOOKMARK_CARD_KEYS,
  CARD_KEYS,
  LIST_KEYS,
  MAP_KEYS,
  RestaurantShapeError,
  SUGGESTION_KEYS,
  isRestaurantShapeError,
  requireItemShape,
  requireShape,
} from "../src/services/data/restaurantShape"
import {
  cardSafetyBadges,
  cardSafetyNoteKey,
  dominantDriver,
} from "../src/features/restaurant/utils/cardSafetyBadge"
import {
  classifyFetchFailure,
  failureSpec,
  totalExcluded,
} from "../src/features/restaurant/utils/fetchError"
import { ApiError } from "../src/services/core/apiError"
import ko from "../src/i18n/locales/ko/common.json"
import en from "../src/i18n/locales/en/common.json"
import type { RestaurantSafetyDto } from "../src/features/restaurant/types"

/* ─────────── 실측 픽스처 (GET /restaurants/search 의 items[0]) ─────────── */

/** 서버가 실제로 보낸 카드. 키 이름을 손으로 고치지 말 것 — 실측값이다. */
const MEASURED_CARD = {
  restaurantId: 317,
  name: "맛짱김밥천국",
  lat: 37.501564024429,
  lng: 127.024848569699,
  cuisineType: "KOREAN",
  rating: 5,
  reviewCount: 8,
  distanceKm: null,
  shortAddress: "서울 서초구 서초대로77길",
  address: "서울 서초구 서초대로77길 45",
  jibunAddress: null,
  zipcode: null,
  imageUrls: ["a.jpg", "b.jpg", "c.jpg"],
  avgPrice: 9666,
  priceRange: null,
  regionSido: "seoul",
  regionGroup: "seoul-seocho",
  regionSigungu: "서초구",
  businessStatus: "CLOSED",
  openTime: "11:30",
  closeTime: "21:00",
  breakStart: null,
  breakEnd: null,
  bookmarked: false,
  safety: {
    level: "RESTRICTED",
    menuCount: 6,
    safeMenuCount: 0,
    cautionMenuCount: 0,
    restrictedMenuCount: 6,
    unknownMenuCount: 0,
    hasSafeMenu: false,
    driverCounts: { sodium: 5, protein: 1 },
    profileMissing: false,
  },
  legacyNutritionTags: [],
}

/** 서버가 실제로 보낸 저장한 곳 카드. **위 카드와 모양이 다르다.** */
const MEASURED_BOOKMARK_CARD = {
  restaurantId: 317,
  name: "맛짱김밥천국",
  lat: 37.501564024429,
  lng: 127.024848569699,
  cuisineType: "KOREAN",
  legacyNutritionTags: [],
  rating: 5,
  reviewCount: 8,
  distanceKm: null,
  shortAddress: "서울 서초구 서초대로77길",
  regionSigungu: "서초구",
  priceRange: null,
  imageUrls: ["a.jpg"],
  bookmarked: true,
  bookmarkedAt: "2026-07-30T13:27:20.371000",
  businessStatus: "CLOSED",
  openTime: "11:30",
  closeTime: "21:00",
  safetySummary: null,
}

function safety(over: Partial<RestaurantSafetyDto> = {}): RestaurantSafetyDto {
  return {
    level: "CAUTION",
    menuCount: 6,
    safeMenuCount: 0,
    cautionMenuCount: 6,
    restrictedMenuCount: 0,
    unknownMenuCount: 0,
    hasSafeMenu: false,
    driverCounts: {},
    profileMissing: false,
    ...over,
  }
}

/* ─────────────────────────── 런타임 모양 검사 ─────────────────────────── */

describe("응답 모양 검사", () => {
  it("실측 카드는 통과한다 — 검사가 정상 응답을 막지 않는다", () => {
    expect(() =>
      requireItemShape([MEASURED_CARD], "GET /search", CARD_KEYS),
    ).not.toThrow()
  })

  it("`safety` 가 없으면 이름을 부르며 던진다 (원래 사고의 재현)", () => {
    const { safety: _dropped, ...withoutSafety } = MEASURED_CARD
    let caught: unknown
    try {
      requireItemShape([withoutSafety], "GET /search", CARD_KEYS)
    } catch (error) {
      caught = error
    }
    expect(isRestaurantShapeError(caught)).toBe(true)
    const error = caught as RestaurantShapeError
    // 사람이 읽는 한 줄. 화면 깊은 곳의 `undefined.slice` 를 이 문장으로 대체한 것이 목적이다.
    expect(error.message).toContain("서버 응답에 safety 가 없습니다")
    expect(error.message).toContain("GET /search")
    expect(error.at).toBe("items[0]")
    expect(error.missing).toEqual(["safety"])
  })

  it("`null` 값은 결함이 아니다 — 값이 아니라 키의 존재만 본다", () => {
    // `rating`·`distanceKm`·`jibunAddress` 가 실제로 `null` 로 온다.
    expect(() =>
      requireItemShape(
        [{ ...MEASURED_CARD, rating: null, distanceKm: null }],
        "GET /search",
        CARD_KEYS,
      ),
    ).not.toThrow()
  })

  it("`imageUrls` 가 배열이 아니면 잡는다 (`PhotoStrip` 이 `.length` 를 바로 읽는다)", () => {
    expect(() =>
      requireItemShape(
        [{ ...MEASURED_CARD, imageUrls: "a.jpg" }],
        "GET /search",
        CARD_KEYS,
      ),
    ).toThrow(RestaurantShapeError)
  })

  it("저장한 곳 카드는 `safety` 가 없어도 통과한다 (다른 계약이다)", () => {
    // 이걸 `CARD_KEYS` 로 검사하면 저장한 곳 목록이 **항상** 죽는다.
    expect(() =>
      requireItemShape(
        [MEASURED_BOOKMARK_CARD],
        "GET /bookmarks",
        BOOKMARK_CARD_KEYS,
      ),
    ).not.toThrow()
    expect(() =>
      requireItemShape([MEASURED_BOOKMARK_CARD], "GET /bookmarks", CARD_KEYS),
    ).toThrow(RestaurantShapeError)
  })

  it("자동완성은 `type`·`label` 만 요구한다 — 선택 키는 서버가 지운다", () => {
    const region = {
      type: "REGION",
      label: "강남",
      key: "seoul-gangnam",
      lat: 37.49,
      lng: 127.02,
      count: 258,
    }
    const menu = { type: "MENU", label: "국밥", count: 12 }
    expect(() =>
      requireItemShape([region, menu], "GET /suggest", SUGGESTION_KEYS),
    ).not.toThrow()
  })

  it("목록 응답의 `items` 가 배열이 아니면 최상위에서 잡는다", () => {
    expect(() =>
      requireShape(
        {
          items: {},
          nextCursor: null,
          hasMore: false,
          total: 0,
          excludedForMissingData: {},
          profileMissing: false,
        },
        "GET /search",
        LIST_KEYS,
      ),
    ).toThrow(RestaurantShapeError)
  })

  it("`markers`·`clusters` 키가 없으면 지도 응답을 거절한다", () => {
    expect(() =>
      requireShape({ mode: "MARKER", total: 0 }, "GET /map", MAP_KEYS),
    ).toThrow(RestaurantShapeError)
  })
})

/* ──────────────── `excludedForMissingData` 는 객체다 ──────────────── */

describe("excludedForMissingData 합산", () => {
  it("축별 객체를 더한다 — 숫자로 읽으면 안내가 조용히 사라졌다", () => {
    expect(totalExcluded({ nutritionTags: 3 })).toBe(3)
    expect(totalExcluded({ nutritionTags: 0 })).toBe(0)
    expect(totalExcluded(undefined)).toBe(0)
  })

  it("서버가 축을 더해도 합에 반영된다 (DTO 수정 전에도)", () => {
    const future = { nutritionTags: 2, businessHours: 5 } as never
    expect(totalExcluded(future)).toBe(7)
  })
})

/* ────────────── 카드 배지: `nutritionBadges` 의 대체물 ────────────── */

describe("카드 안전도 배지 유도", () => {
  it("프로필이 없으면 배지가 없다 (근거 없는 판정을 그리지 않는다)", () => {
    const badges = cardSafetyBadges(
      safety({
        level: "RESTRICTED",
        profileMissing: true,
        driverCounts: { sodium: 5 },
      }),
    )
    expect(badges).toEqual({ level: null, note: null })
  })

  it("`UNKNOWN` 은 배지가 없다 — 회색 `정보 없음` 으로도 채우지 않는다", () => {
    expect(cardSafetyBadges(safety({ level: "UNKNOWN" }))).toEqual({
      level: null,
      note: null,
    })
  })

  it("`UNKNOWN` 이 `SAFE` 로 새지 않는다", () => {
    // 신장 환자에게 가장 위험한 방향의 실수다. 등급 자리가 `SAFE` 가 되는 일이 없어야 한다.
    expect(cardSafetyBadges(safety({ level: "UNKNOWN" })).level).not.toBe(
      "SAFE",
    )
  })

  it("`safety` 가 아예 없는 목록(저장한 곳)에서도 죽지 않고 배지가 없다", () => {
    expect(cardSafetyBadges(null)).toEqual({ level: null, note: null })
    expect(cardSafetyBadges(undefined)).toEqual({ level: null, note: null })
  })

  it("`SAFE` 는 등급만 — 경고할 것도 단서 달 것도 없다", () => {
    expect(
      cardSafetyBadges(safety({ level: "SAFE", safeMenuCount: 6 })),
    ).toEqual({
      level: "SAFE",
      note: null,
    })
  })

  it("제한이라도 안전 메뉴가 있으면 **갈 이유**를 말한다", () => {
    const badges = cardSafetyBadges(
      safety({
        level: "RESTRICTED",
        safeMenuCount: 2,
        driverCounts: { sodium: 4 },
      }),
    )
    expect(badges.level).toBe("RESTRICTED")
    expect(badges.note).toEqual({ kind: "SAFE_MENU_COUNT", count: 2 })
    expect(cardSafetyNoteKey(badges.note!)).toBe(
      "restaurant.safety.safeMenuCountBadge",
    )
  })

  it("안전 메뉴가 0개면 **이유**를 말한다 (실측 카드가 이 경우다)", () => {
    const badges = cardSafetyBadges(MEASURED_CARD.safety as RestaurantSafetyDto)
    expect(badges.level).toBe("RESTRICTED")
    // 나트륨 5 vs 단백질 1 — 판정을 가장 많이 끈 쪽.
    expect(badges.note).toEqual({ kind: "DRIVER", driver: "sodium" })
    expect(cardSafetyNoteKey(badges.note!)).toBe(
      "restaurant.safety.driverBadge",
    )
  })

  it("근거 영양소도 없으면 보조 배지를 지어내지 않는다", () => {
    const badges = cardSafetyBadges(
      safety({ level: "CAUTION", safeMenuCount: 0, driverCounts: {} }),
    )
    expect(badges.level).toBe("CAUTION")
    expect(badges.note).toBeNull()
  })

  it("`안전 메뉴 0개` 는 절대 나오지 않는다", () => {
    // `hasSafeMenu: true` 인데 수가 0 인 어긋난 응답에서도 수를 근거로 삼기 때문에 안전하다.
    const badges = cardSafetyBadges(
      safety({
        level: "CAUTION",
        hasSafeMenu: true,
        safeMenuCount: 0,
        driverCounts: { potassium: 1 },
      }),
    )
    expect(badges.note).toEqual({ kind: "DRIVER", driver: "potassium" })
  })
})

describe("dominantDriver", () => {
  it("가장 많이 끈 영양소를 고른다", () => {
    expect(dominantDriver({ sodium: 5, protein: 1 })).toBe("sodium")
    expect(dominantDriver({ sodium: 1, phosphorus: 9 })).toBe("phosphorus")
  })

  it("동수면 순서가 안정적이다 — 새로 고칠 때마다 이유가 바뀌면 아무도 신뢰하지 않는다", () => {
    expect(dominantDriver({ protein: 2, sodium: 2 })).toBe("sodium")
    expect(dominantDriver({ sodium: 2, protein: 2 })).toBe("sodium")
  })

  it("빈 객체면 `null`", () => {
    expect(dominantDriver({})).toBeNull()
  })

  it("없는 키를 `undefined` 로 비교하지 않는다 (0 으로 접는다)", () => {
    expect(dominantDriver({ sodium: undefined, protein: 3 })).toBe("protein")
  })
})

/* ─────────────── 실패 원인 분류 (400 ≠ 인터넷 문제) ─────────────── */

describe("classifyFetchFailure", () => {
  it("응답이 없으면 통신 실패 — 여기서만 인터넷을 언급한다", () => {
    const error = new ApiError("네트워크", "NETWORK_ERROR", undefined, true)
    expect(classifyFetchFailure(error, "list")).toBe("NETWORK_FAILURE")
  })

  it("상태 코드가 없으면 요청이 나가지도 못한 것 — 통신 실패다", () => {
    const error = new ApiError("타임아웃", "ECONNABORTED")
    expect(classifyFetchFailure(error, "list")).toBe("NETWORK_FAILURE")
  })

  it("**400 은 우리 버그다** — 인터넷 문제로 분류하지 않는다", () => {
    // 실측: `GET /restaurants/search?cursor=GARBAGE` → 400 COMMON_ERROR_001.
    // 예전에는 이것이 `NETWORK_FAILURE` 가 되어 사용자에게 와이파이를 의심하게 했다.
    const error = new ApiError("잘못된 요청입니다", "COMMON_ERROR_001", 400)
    expect(classifyFetchFailure(error, "list")).toBe("REQUEST_REJECTED")
    expect(classifyFetchFailure(error, "list")).not.toBe("NETWORK_FAILURE")
  })

  it("5xx 는 서버 문제 — 우리 요청 결함과 구분한다", () => {
    const error = new ApiError("서버 오류", "INTERNAL", 503)
    expect(classifyFetchFailure(error, "map")).toBe("SERVER_ERROR")
  })

  it("모양 불일치는 통신 성공이지만 우리 버그다", () => {
    const error = new RestaurantShapeError(
      "GET /search",
      ["safety"],
      "items[0]",
    )
    expect(classifyFetchFailure(error, "list")).toBe("RESPONSE_MALFORMED")
  })

  it("정규화되지 않은 예외도 통신 문제로 숨기지 않는다", () => {
    expect(
      classifyFetchFailure(new Error("viewport not committed"), "map"),
    ).toBe("REQUEST_REJECTED")
  })

  it("모든 실패 갈래에 문구가 있다 — 하나라도 비면 화면이 빈 오류를 그린다", () => {
    const reasons = [
      "NETWORK_FAILURE",
      "SERVER_ERROR",
      "REQUEST_REJECTED",
      "RESPONSE_MALFORMED",
    ] as const
    for (const reason of reasons) {
      const spec = failureSpec(reason)
      expect(spec).not.toBeNull()
      expect(errorText(ko, spec!.titleKey)).toBeTruthy()
      expect(errorText(ko, spec!.bodyKey)).toBeTruthy()
      expect(errorText(en, spec!.titleKey)).toBeTruthy()
      expect(errorText(en, spec!.bodyKey)).toBeTruthy()
    }
  })

  it("0건 갈래는 실패가 아니다 — 오류 시각언어를 쓰지 않는다", () => {
    expect(failureSpec("NO_DATA_HERE")).toBeNull()
    expect(failureSpec("FILTERED_TO_ZERO")).toBeNull()
  })

  it("인터넷을 언급하는 문구는 통신 실패 하나뿐이다", () => {
    // 이 단언이 이 작업의 핵심이다. 400·5xx·모양 불일치 문구에 "인터넷" 이 새어 들어오면
    // 사용자는 다시 고칠 수 없는 것을 고치려 한다.
    const mentionsInternet = (key: string) =>
      errorText(ko, key).includes("인터넷")
    expect(mentionsInternet(failureSpec("NETWORK_FAILURE")!.bodyKey)).toBe(true)
    for (const reason of [
      "SERVER_ERROR",
      "REQUEST_REJECTED",
      "RESPONSE_MALFORMED",
    ] as const) {
      const body = errorText(ko, failureSpec(reason)!.bodyKey)
      // 우리 버그인 두 갈래는 "인터넷 문제는 아니에요" 로 **부정형**으로만 언급한다.
      if (body.includes("인터넷"))
        expect(body).toContain("인터넷 문제는 아니에요")
    }
  })
})

/**
 * `restaurant.error.listBody` → 그 문구. i18n JSON 은 리터럴 타입이 붙어 있어서
 * 문자열로 인덱싱할 수 없으므로 여기서 한 번만 좁힌다(테스트 전용).
 */
function errorText(bundle: typeof ko | typeof en, key: string): string {
  const table = bundle.restaurant.error as Record<string, string>
  return table[key.slice(key.lastIndexOf(".") + 1)]
}
