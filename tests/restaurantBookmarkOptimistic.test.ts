/**
 * 북마크 낙관 갱신. 같은 식당이 화면 **네 군데**에 동시에 존재한다 — 지도 마커,
 * 시트/리스트 카드, 상세 헤더, 저장한 곳 목록. 한 곳을 빼먹으면 "저장했는데 지도 마커는
 * 그대로" 인 화면이 남고, 그건 사용자에게 저장이 안 된 것으로 보인다.
 *
 * ## 어떻게 훅을 돌리나
 *
 * 이 저장소에는 `renderHook` 이 없다(`@testing-library/react-native`·`react-test-renderer`
 * 미설치, jest 는 node 환경). 하지만 이 훅의 상태 전이는 react 상태가 아니라 **react-query
 * 캐시**에 있고 `mutate()` 는 렌더 밖에서 돈다. 그래서 `react-dom/server` 로 **한 번만**
 * 렌더해 훅 반환값을 붙잡고, 이후는 캐시를 직접 읽어 단언한다. 재렌더가 필요 없다.
 */

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import i18n, { normalizeLanguage } from "../src/i18n"
import { restaurantService } from "../src/services/data/restaurantService"
import { useBookmark } from "../src/features/restaurant/hooks/useBookmark"
import {
  RESTAURANT_BOOKMARKS_KEY,
  restaurantKeys,
} from "../src/features/restaurant/hooks/restaurantQueryKeys"
import type {
  MapMarkerDto,
  MapSearchResponse,
  RestaurantCardDto,
  RestaurantDetailDto,
} from "../src/features/restaurant/types"

jest.mock("../src/services/data/restaurantService", () => ({
  restaurantService: {
    addBookmark: jest.fn(),
    removeBookmark: jest.fn(),
  },
}))

// @types/react-dom 이 없어 타입 선언만 require 로 우회한다. 런타임은 정식 빌드 그대로다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require("react-dom/server") as {
  renderToStaticMarkup: (node: unknown) => string
}

const TARGET = 42
const OTHER = 99

const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

const BOUNDS = {
  swLat: 37.4906,
  swLng: 127.0197,
  neLat: 37.5053,
  neLng: 127.0367,
}
const MAP_KEY = restaurantKeys.map(language, BOUNDS, 4, "", false)
const LIST_KEY = restaurantKeys.list(language, "", false)
const BOOKMARKS_KEY = restaurantKeys.bookmarks(language)
const DETAIL_KEY = restaurantKeys.detail(language, TARGET)

function marker(id: number, bookmarked: boolean): MapMarkerDto {
  return {
    restaurantId: id,
    name: `가게 ${id}`,
    lat: 37.4979,
    lng: 127.0276,
    cuisineType: "KOREAN",
    avgSafety: "CAUTION",
    bookmarked,
    hasSafeMenu: true,
  }
}

/**
 * `/search` 카드 1건. **실측 응답 모양이다** — `branch`·`nutritionBadges`·`closingTime`·
 * `nextTransitionAt`·`roadAddress`·`safetySummary` 는 서버가 주지 않는다(그 이름들로
 * 적어 두었던 것이 이 기능이 런타임에 죽은 원인이다). 픽스처를 계약 문서가 아니라
 * 실제 응답에 맞춰 두는 것이 이 테스트가 회귀를 잡는 유일한 방법이다.
 */
function card(id: number, bookmarked: boolean): RestaurantCardDto {
  return {
    restaurantId: id,
    name: `가게 ${id}`,
    lat: 37.4979,
    lng: 127.0276,
    cuisineType: "KOREAN",
    legacyNutritionTags: [],
    rating: 4.5,
    reviewCount: 12,
    businessStatus: "OPEN",
    closeTime: "21:30",
    openTime: "11:00",
    breakStart: null,
    breakEnd: null,
    distanceKm: 0.62,
    shortAddress: "서울 강남구 대치동",
    address: null,
    jibunAddress: null,
    zipcode: null,
    imageUrls: [],
    safety: {
      level: "CAUTION",
      menuCount: 3,
      safeMenuCount: 1,
      cautionMenuCount: 2,
      restrictedMenuCount: 0,
      unknownMenuCount: 0,
      hasSafeMenu: true,
      driverCounts: { sodium: 2 },
      profileMissing: false,
    },
    bookmarked,
    avgPrice: 9000,
    priceRange: null,
    regionSido: "seoul",
    regionGroup: "seoul-gangnam",
    regionSigungu: "강남구",
  }
}

function mapResponse(bookmarked: boolean): MapSearchResponse {
  return {
    mode: "MARKER",
    markers: [marker(TARGET, bookmarked), marker(OTHER, false)],
    clusters: [],
    total: 2,
    truncated: false,
    limitReached: false,
    // 숫자가 아니라 축별 객체다(서버 실측). 숫자로 두면 화면의 `> 0` 이 영원히 false 다.
    excludedForMissingData: { nutritionTags: 0 },
    profileMissing: false,
    distanceAvailable: true,
    sort: "RECOMMENDED",
    zoom: 3,
    cellDeg: null,
    clusterTotal: null,
    limit: 200,
    viewport: { swLat: 37.49, swLng: 127.02, neLat: 37.51, neLng: 127.04 },
  }
}

function infinite(items: RestaurantCardDto[]) {
  return { pages: [{ items }], pageParams: [null] }
}

/**
 * 상세 응답 한 건. **실측 payload 의 키를 그대로 쓴다** — 예전 이 fixture 는
 * `branch`/`tagline`/`nutritionBadges`/`roadAddress` 를 담고 있었는데 서버는 그 키를
 * 하나도 보내지 않는다. 통과하는 테스트가 없는 필드를 있는 것처럼 굳히고 있었다.
 */
function detail(bookmarked: boolean): RestaurantDetailDto {
  return {
    restaurantId: TARGET,
    name: "신신국밥",
    description: null,
    cuisineType: "KOREAN",
    rating: 4.5,
    reviewCount: 12,
    address: null,
    shortAddress: null,
    jibunAddress: null,
    zipcode: null,
    phone: null,
    lat: 37.4979,
    lng: 127.0276,
    regionSido: "seoul",
    regionGroup: "seoul-gangnam",
    regionSigungu: "강남구",
    instagramUrl: null,
    blogUrl: null,
    youtubeUrl: null,
    imageUrls: [],
    photoCategoryCounts: {},
    photoCount: 0,
    amenities: [],
    parking: { available: null, free: null, note: null },
    avgPrice: 9000,
    priceRange: null,
    bookmarked,
    businessStatus: "OPEN",
    openTime: "10:00",
    closeTime: "21:30",
    breakStart: null,
    breakEnd: null,
    lastOrder: null,
    nextTransitionAt: null,
    nextOpenWeekday: null,
    nextOpenTime: null,
    businessHours: [],
    hoursSource: "BUSINESS_HOUR",
    menuCount: 3,
    safetySummary: { safe: 1, caution: 2, restricted: 0, unknown: 0 },
    avgSafety: "CAUTION",
    hasSafeMenu: true,
    profileMissing: false,
    proteinAxisAvailable: true,
    legacyNutritionTags: [],
    legacyRiskCounts: { SAFE: 1, CAUTION: 2, HIGH_RISK: 0 },
    legacyClosedDay: null,
  }
}

interface Harness {
  client: QueryClient
  hook: ReturnType<typeof useBookmark>
}

/** 네 캐시를 시드하고 훅 반환값을 붙잡는다. */
function setup(seeded = false): Harness {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  client.setQueryData(MAP_KEY, mapResponse(seeded))
  client.setQueryData(
    LIST_KEY,
    infinite([card(TARGET, seeded), card(OTHER, false)]),
  )
  client.setQueryData(
    BOOKMARKS_KEY,
    infinite(seeded ? [card(TARGET, true)] : []),
  )
  client.setQueryData(DETAIL_KEY, detail(seeded))

  let captured: ReturnType<typeof useBookmark> | null = null
  const Probe = () => {
    captured = useBookmark()
    return null
  }
  renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(Probe),
    ),
  )
  if (captured === null) throw new Error("훅이 렌더되지 않았다")
  return { client, hook: captured }
}

/** 마이크로태스크·매크로태스크를 한 번 비운다. mutationFn 프라미스는 여기서 안 풀린다. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function read(client: QueryClient) {
  const map = client.getQueryData<MapSearchResponse>(MAP_KEY)
  const list = client.getQueryData<{ pages: { items: RestaurantCardDto[] }[] }>(
    LIST_KEY,
  )
  const bookmarks = client.getQueryData<{
    pages: { items: RestaurantCardDto[] }[]
  }>(BOOKMARKS_KEY)
  const detailData = client.getQueryData<RestaurantDetailDto>(DETAIL_KEY)
  return {
    marker: map?.markers.find((m) => m.restaurantId === TARGET)?.bookmarked,
    otherMarker: map?.markers.find((m) => m.restaurantId === OTHER)?.bookmarked,
    card: list?.pages[0].items.find((i) => i.restaurantId === TARGET)
      ?.bookmarked,
    bookmarkIds: bookmarks?.pages[0].items.map((i) => i.restaurantId),
    detail: detailData?.bookmarked,
  }
}

describe("낙관 갱신 — 네 캐시가 한 번에 켜진다", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("응답을 기다리지 않고 지도·목록·상세가 즉시 저장 상태가 된다", async () => {
    const { client, hook } = setup(false)
    let settle: (value: unknown) => void = () => {}
    ;(restaurantService.addBookmark as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        settle = resolve
      }),
    )

    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    await flush()

    const state = read(client)
    expect(state.marker).toBe(true)
    expect(state.card).toBe(true)
    expect(state.detail).toBe(true)
    // 아직 서버는 대답하지 않았다.
    expect(restaurantService.addBookmark).toHaveBeenCalledWith(TARGET)

    settle({ restaurantId: TARGET, bookmarked: true })
    await flush()
    expect(read(client).marker).toBe(true)
  })

  it("같은 캐시의 다른 식당은 건드리지 않는다", async () => {
    const { client, hook } = setup(false)
    ;(restaurantService.addBookmark as jest.Mock).mockResolvedValue({
      restaurantId: TARGET,
      bookmarked: true,
    })
    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    await flush()
    expect(read(client).otherMarker).toBe(false)
  })

  it("대상이 없는 캐시는 새 객체를 만들지 않는다 (헛된 리렌더 방지)", async () => {
    const { client, hook } = setup(false)
    const before = client.getQueryData(LIST_KEY)
    ;(restaurantService.addBookmark as jest.Mock).mockResolvedValue({
      restaurantId: 12345,
      bookmarked: true,
    })
    hook.toggleBookmark({ restaurantId: 12345, bookmarked: false })
    await flush()
    expect(client.getQueryData(LIST_KEY)).toBe(before)
  })

  it("해제하면 저장 목록에서 카드가 사라진다", async () => {
    const { client, hook } = setup(true)
    ;(restaurantService.removeBookmark as jest.Mock).mockResolvedValue({
      restaurantId: TARGET,
      bookmarked: false,
    })

    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: true })
    await flush()

    const state = read(client)
    expect(state.bookmarkIds).toEqual([])
    expect(state.marker).toBe(false)
    expect(state.card).toBe(false)
    expect(state.detail).toBe(false)
    expect(restaurantService.removeBookmark).toHaveBeenCalledWith(TARGET)
    expect(restaurantService.addBookmark).not.toHaveBeenCalled()
  })
})

describe("실패하면 네 캐시를 스냅샷 그대로 되돌린다", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("저장 실패 → 전부 원래 값으로", async () => {
    const { client, hook } = setup(false)
    ;(restaurantService.addBookmark as jest.Mock).mockRejectedValue(
      new Error("network"),
    )

    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    await flush()

    const state = read(client)
    // 부분 롤백은 화면 간 불일치를 남긴다 — 그래서 넷을 함께 본다.
    expect(state.marker).toBe(false)
    expect(state.card).toBe(false)
    expect(state.detail).toBe(false)
    expect(state.bookmarkIds).toEqual([])
  })

  it("해제 실패 → 저장 목록의 카드가 되살아난다", async () => {
    const { client, hook } = setup(true)
    ;(restaurantService.removeBookmark as jest.Mock).mockRejectedValue(
      new Error("network"),
    )

    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: true })
    await flush()

    const state = read(client)
    expect(state.bookmarkIds).toEqual([TARGET])
    expect(state.marker).toBe(true)
    expect(state.card).toBe(true)
    expect(state.detail).toBe(true)
  })

  it("실패해도 진행 중 표시가 풀려 다시 누를 수 있다", async () => {
    const { hook } = setup(false)
    ;(restaurantService.addBookmark as jest.Mock).mockRejectedValue(
      new Error("network"),
    )
    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    await flush()
    // 두 번째 탭이 통과하는 것이 곧 "진행 중 표시가 풀렸다" 다. 훅이 그 상태를
    // 밖으로 내주지 않으므로(가드용 ref 는 렌더에 참여하지 않는다) 동작으로 단언한다.
    // 여기서 안 풀리면 그 식당은 앱을 재시작할 때까지 저장이 안 된다.
    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    await flush()
    expect(restaurantService.addBookmark).toHaveBeenCalledTimes(2)
  })
})

describe("서버가 돌려준 값이 최종값이다", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("낙관값과 다르면 서버가 이긴다", async () => {
    const { client, hook } = setup(false)
    // `mealrec.toggleBookmark` 는 요청한 상태를 그대로 돌려줘 연타 시 저장된 행과 어긋났다.
    // 새 API 는 저장 후 다시 읽은 상태를 준다 — 그 값으로 한 번 더 덮어쓴다.
    ;(restaurantService.addBookmark as jest.Mock).mockResolvedValue({
      restaurantId: TARGET,
      bookmarked: false,
    })

    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    await flush()

    const state = read(client)
    expect(state.marker).toBe(false)
    expect(state.card).toBe(false)
    expect(state.detail).toBe(false)
  })
})

describe("연타 방어", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("진행 중인 식당의 두 번째 탭은 무시한다", async () => {
    const { hook } = setup(false)
    let settle: (value: unknown) => void = () => {}
    ;(restaurantService.addBookmark as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        settle = resolve
      }),
    )

    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    await flush()

    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: true })
    await flush()
    // PUT→DELETE 가 뒤집혀 도착하면 최종 상태가 마지막 의도와 달라진다.
    // 요청이 한 번만 나간 것이 곧 가드가 걸렸다는 뜻이다.
    expect(restaurantService.addBookmark).toHaveBeenCalledTimes(1)
    expect(restaurantService.removeBookmark).not.toHaveBeenCalled()

    settle({ restaurantId: TARGET, bookmarked: true })
    await flush()
    // 끝난 뒤에는 같은 식당을 다시 토글할 수 있다(가드 해제).
    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: true })
    await flush()
    expect(restaurantService.removeBookmark).toHaveBeenCalledTimes(1)
  })

  it("다른 식당은 동시에 토글할 수 있다", async () => {
    const { hook } = setup(false)
    ;(restaurantService.addBookmark as jest.Mock).mockReturnValue(
      new Promise(() => {}),
    )
    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    hook.toggleBookmark({ restaurantId: OTHER, bookmarked: false })
    await flush()
    // 가드가 식당별이 아니라 전역이면 두 번째 요청이 막혀 1이 된다.
    expect(restaurantService.addBookmark).toHaveBeenCalledTimes(2)
  })
})

describe("저장 목록은 끝나고 다시 받는다", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("추가는 카드 원본이 없어 낙관적으로 만들 수 없으므로 무효화한다", async () => {
    const { client, hook } = setup(false)
    ;(restaurantService.addBookmark as jest.Mock).mockResolvedValue({
      restaurantId: TARGET,
      bookmarked: true,
    })

    hook.toggleBookmark({ restaurantId: TARGET, bookmarked: false })
    await flush()

    // 저장 직후 목록에 카드가 없어도 되지만, 다음에 그 화면을 열면 반드시 새로 받아야 한다.
    const state = client.getQueryState(BOOKMARKS_KEY)
    expect(state?.isInvalidated).toBe(true)
    expect(BOOKMARKS_KEY.slice(0, 2)).toEqual([...RESTAURANT_BOOKMARKS_KEY])
  })
})
