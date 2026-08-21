/**
 * **응답 가드가 빠짐없이 걸려 있는지** 고정한다.
 *
 * `restaurantShape.ts` 는 "`as` 캐스트 자리마다 싸구려 검사 한 줄" 이라는 규칙 하나로
 * 서 있는 파일이다. 그런데 규칙에는 구멍이 있었다 — `fetchNearby`·`aiSearch`·
 * `reportReview` 세 응답만 검사를 건너뛰고 생짜 캐스트로 남아 있었고, 그 셋은 정확히
 * 이 저장소가 이미 한 번 겪은 실패(화면 깊은 곳의 `undefined.slice`)로 다시 갈 수 있는
 * 경로였다. 값 하나하나를 여기서 검증하려는 것이 아니라, **검사가 붙어 있다는 사실**과
 * **빠진 키가 이름을 부르며 죽는다는 것**을 고정한다.
 *
 * ## 왜 소스를 읽는 테스트가 있나
 *
 * 가드는 "다음 사람이 검사 없는 캐스트를 하나 더 만들지 않는 것" 까지가 목적이다. 새
 * 엔드포인트가 늘 때 그 사람이 이 테스트를 보지 않아도 빨개져야 한다. 그래서 마지막
 * 그룹이 소스를 **메서드 블록으로 잘라** `api.*` 를 부르는 블록마다 가드 호출이 최소 하나
 * 있는지 센다(`tests/restaurantContractDrift.test.ts` 가 값 쪽을, 이 파일이 구조 쪽을 본다).
 *
 * 사정거리를 정확히 적어 둔다 — **블록 단위**다. 가드를 한 줄도 부르지 않는 새 메서드는
 * 응답 본문을 어떤 형태로 꺼내든(`response.data.result` 든 `const { result } = response.data`
 * 든), 어떤 문법으로 쓰든(`async` 가 아닌 메서드든 화살표 프로퍼티든) 잡힌다. 그리고
 * **주석은 코드가 아니다** — 가드 이름이 든 주석을 달아도 가드를 부른 것으로 세지 않는다.
 *
 * 한 메서드가 **두 응답**을 다루면서 한쪽만 검사하는 경우는 어느 쪽이 빠졌는지까지
 * 짚지 못한다. 그래도 조용히 지나가지는 않는다 — `api.*` 호출 자리 수가 블록 수와
 * 어긋나면서 "분해기가 헛돌지 않는다" 가 먼저 빨개지고, 그때 사람이 그 메서드를 본다.
 *
 * ## `ai-search` 의 404 는 결함이 아니다
 *
 * 그 라우트는 서버가 `ai` 의존성을 받지 못하면 **등록되지 않는다**(조건부 등록). 그때 앱은
 * 404 를 받아 `AI 검색` 칩을 **그대로 둔 채** 시트 안에서 오류 + 재시도를 보여 준다 —
 * 칩을 숨기는 코드는 앱에 없다(`CategoryChipRail` 은 조건 없이 그린다). 여기서 지키는 것은
 * 그 404 가 "형식이 어긋났어요" 로 바뀌지 않는 것뿐이다: 없는 기능이 고장난 기능이 되면
 * 안 된다. 칩을 실제로 숨기는 것은 이 파일의 관할이 아니다.
 */

import fs from "node:fs"
import path from "node:path"

import { api } from "../src/services/core"
import { restaurantService } from "../src/services/data/restaurantService"
/* 네임스페이스로도 들여온다 — 아래 404 그룹이 **가드가 불렸는지**를 감시하기 때문이다.
   서비스는 이 모듈 객체를 통해 가드를 부르므로 여기 건 스파이가 그 호출을 본다. */
import * as restaurantShape from "../src/services/data/restaurantShape"
import {
  DETAIL_KEYS,
  HOURS_KEYS,
  HOURS_TODAY_KEYS,
  REVIEW_ITEM_KEYS,
  RestaurantShapeError,
  isRestaurantShapeError,
} from "../src/services/data/restaurantShape"
import { classifyFetchFailure } from "../src/features/restaurant/utils/fetchError"
import { ApiError } from "../src/services/core/apiError"

jest.mock("../src/services/core", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}))

const apiGet = api.get as jest.Mock
const apiPost = api.post as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

/* ───────────────────────────── 픽스처 ───────────────────────────── */

/** 레거시 `/nearby` 의 항목 1건. 서버 `cardPayload` 가 조립하는 키를 그대로 옮겼다. */
const NEARBY_ITEM = {
  restaurantId: 317,
  name: "맛짱김밥천국",
  lat: 37.501564024429,
  lng: 127.024848569699,
  cuisineType: "KOREAN",
  nutritionTags: [],
  rating: 5,
  reviewCount: 8,
  distanceKm: 0.42,
  shortAddress: "서울 서초구 서초대로77길",
  imageUrls: ["a.jpg", "b.jpg"],
  menuCount: 6,
  safeMenuCount: 0,
  cautionMenuCount: 0,
  highRiskMenuCount: 6,
  avgRiskLevel: "HIGH_RISK",
  businessStatus: "CLOSED",
  openTime: "11:30",
  closeTime: "21:00",
}

/** `POST /ai-search` 의 성공 응답(서버 `aiSearchPayload` 의 키 순서 그대로). */
const AI_SEARCH_RESULT = {
  filters: {
    cuisineTypes: ["KOREAN"],
    nutritionTags: ["LOW_POTASSIUM"],
    regionGroups: [],
    sort: "RECOMMENDED",
    openNow: false,
    maxPrice: null,
    q: "삼계탕",
  },
  rationale: "한식 · 저칼륨 조건으로 찾았어요.",
  unmatchedTerms: ["국물 없는"],
  fallback: false,
}

/** 신고 응답. `reportId`·`createdAt` 은 서버가 함께 주지만 앱이 읽지 않는 키다. */
const REPORT_RESULT = {
  reviewId: 4021,
  reportId: 12,
  status: "PENDING",
  alreadyReported: false,
  createdAt: "2026-08-19T04:11:02.183000",
}

/** 키 목록으로 **존재만 하는** 응답을 만든다. 요청 모양을 볼 때만 쓴다(값은 무의미). */
function shellFor(keys: readonly string[]): Record<string, unknown> {
  const shell: Record<string, unknown> = {}
  for (const key of keys) {
    if (key.endsWith("[]")) shell[key.slice(0, -2)] = []
    else shell[key] = null
  }
  return shell
}

/** 던진 오류를 돌려준다. `rejects.toThrow` 로는 `at`·`missing` 을 볼 수 없다. */
async function caught(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run()
    return null
  } catch (error) {
    return error
  }
}

const AI_SEARCH_PAYLOAD = {
  query: "칼륨 낮고 국물 없는 한식",
  viewport: null,
  userLat: 37.5,
  userLng: 127.02,
}

/* ─────────────────── 1. 정상 응답을 막지 않는다 ─────────────────── */

describe("가드는 정상 응답을 통과시킨다", () => {
  it("`/nearby` 는 최상위가 배열이다 — 봉투가 아니다", async () => {
    apiGet.mockResolvedValue({ data: { result: [NEARBY_ITEM] } })
    await expect(
      restaurantService.fetchNearby(37.5, 127.0),
    ).resolves.toHaveLength(1)
  })

  it("빈 배열도 정상이다 (반경 안에 아무것도 없을 수 있다)", async () => {
    apiGet.mockResolvedValue({ data: { result: [] } })
    await expect(restaurantService.fetchNearby(37.5, 127.0)).resolves.toEqual(
      [],
    )
  })

  it("`ai-search` 성공 응답이 통과한다", async () => {
    apiPost.mockResolvedValue({ data: { result: AI_SEARCH_RESULT } })
    await expect(
      restaurantService.aiSearch(AI_SEARCH_PAYLOAD),
    ).resolves.toEqual(AI_SEARCH_RESULT)
  })

  it("`filters.q` 가 없는 구버전 응답도 통과한다 — 걸지 않기로 한 키다", async () => {
    const { q: _dropped, ...older } = AI_SEARCH_RESULT.filters
    apiPost.mockResolvedValue({
      data: { result: { ...AI_SEARCH_RESULT, filters: older } },
    })
    await expect(
      restaurantService.aiSearch(AI_SEARCH_PAYLOAD),
    ).resolves.toBeTruthy()
  })

  it("신고 응답이 통과한다 — 앱이 안 읽는 키가 더 와도 괜찮다", async () => {
    apiPost.mockResolvedValue({ data: { result: REPORT_RESULT } })
    await expect(
      restaurantService.reportReview(4021, { reason: "SPAM" }),
    ).resolves.toEqual(REPORT_RESULT)
  })
})

/* ─────────────────── 2. 키가 빠지면 이름을 부른다 ─────────────────── */

describe("키가 빠지면 `RestaurantShapeError` 를 던진다", () => {
  it("`/nearby` — `avgRiskLevel` 이 사라지면 근거 없는 위험도 표시가 된다", async () => {
    const { avgRiskLevel: _dropped, ...broken } = NEARBY_ITEM
    apiGet.mockResolvedValue({ data: { result: [broken] } })

    const error = await caught(() => restaurantService.fetchNearby(37.5, 127.0))
    expect(isRestaurantShapeError(error)).toBe(true)
    const shape = error as RestaurantShapeError
    expect(shape.missing).toEqual(["avgRiskLevel"])
    // 이 응답에는 봉투가 없다 — `items` 키가 **아예 없으므로** 그 이름을 부르면 안 된다.
    // 다음 사람이 오류를 들고 응답에서 찾을 수 없는 경로를 뒤지게 된다.
    expect(shape.at).toBe("[0]")
    expect(shape.message).toContain("GET /restaurants/nearby 의 [0]")
    expect(shape.endpoint).toBe("GET /restaurants/nearby")
  })

  it("`/nearby` — `imageUrls` 가 배열이 아니면 잡는다 (`.slice(0, 3)` 전에)", async () => {
    apiGet.mockResolvedValue({
      data: { result: [{ ...NEARBY_ITEM, imageUrls: "a.jpg" }] },
    })
    await expect(restaurantService.fetchNearby(37.5, 127.0)).rejects.toThrow(
      RestaurantShapeError,
    )
  })

  it("`/nearby` — 배열이 봉투로 바뀌면 `.map` 이 아니라 여기서 죽는다", async () => {
    apiGet.mockResolvedValue({ data: { result: { items: [NEARBY_ITEM] } } })

    const error = await caught(() => restaurantService.fetchNearby(37.5, 127.0))
    expect(isRestaurantShapeError(error)).toBe(true)
    expect((error as RestaurantShapeError).missing).toEqual([
      "(응답이 배열이 아닙니다)",
    ])
  })

  it("`ai-search` — `fallback` 이 없으면 거절한다 (조용한 `false` 가 거짓말이 된다)", async () => {
    const { fallback: _dropped, ...broken } = AI_SEARCH_RESULT
    apiPost.mockResolvedValue({ data: { result: broken } })

    const error = await caught(() =>
      restaurantService.aiSearch(AI_SEARCH_PAYLOAD),
    )
    expect(isRestaurantShapeError(error)).toBe(true)
    expect((error as RestaurantShapeError).missing).toEqual(["fallback"])
  })

  it("`ai-search` — `unmatchedTerms` 가 배열이 아니면 잡는다 (`.join` 전에)", async () => {
    apiPost.mockResolvedValue({
      data: { result: { ...AI_SEARCH_RESULT, unmatchedTerms: "국물 없는" } },
    })
    await expect(restaurantService.aiSearch(AI_SEARCH_PAYLOAD)).rejects.toThrow(
      RestaurantShapeError,
    )
  })

  it("`ai-search` — 중첩 `filters` 의 배열이 사라지면 위치까지 말한다", async () => {
    const { cuisineTypes: _dropped, ...filters } = AI_SEARCH_RESULT.filters
    apiPost.mockResolvedValue({
      data: { result: { ...AI_SEARCH_RESULT, filters } },
    })

    const error = await caught(() =>
      restaurantService.aiSearch(AI_SEARCH_PAYLOAD),
    )
    expect(isRestaurantShapeError(error)).toBe(true)
    const shape = error as RestaurantShapeError
    // 최상위 검사만 있으면 통과했을 자리다 — 시트가 `for...of` 로 도는 순간 죽는다.
    expect(shape.at).toBe("filters")
    expect(shape.missing).toEqual(["cuisineTypes"])
    expect(shape.message).toContain("filters")
  })

  it("`ai-search` — `regionGroups` 가 배열이 아니어도 잡는다", async () => {
    apiPost.mockResolvedValue({
      data: {
        result: {
          ...AI_SEARCH_RESULT,
          filters: {
            ...AI_SEARCH_RESULT.filters,
            regionGroups: "seoul-gangnam",
          },
        },
      },
    })
    await expect(restaurantService.aiSearch(AI_SEARCH_PAYLOAD)).rejects.toThrow(
      RestaurantShapeError,
    )
  })

  it("신고 — `status` 가 없으면 성공 토스트 뒤로 `undefined` 를 흘리지 않는다", async () => {
    const { status: _dropped, ...broken } = REPORT_RESULT
    apiPost.mockResolvedValue({ data: { result: broken } })

    const error = await caught(() =>
      restaurantService.reportReview(4021, { reason: "SPAM" }),
    )
    expect(isRestaurantShapeError(error)).toBe(true)
    expect((error as RestaurantShapeError).missing).toEqual(["status"])
    expect((error as RestaurantShapeError).endpoint).toBe(
      "POST /restaurants/reviews/:id/report",
    )
  })

  /**
   * 두 번째 신고를 첫 신고처럼 말하지 않기 위한 키다. 서버는 중복 신고를 오류가 아니라
   * **200 + `alreadyReported: true`** 로 돌려주고(`engagementService.createReviewReport`),
   * 시트는 그 값으로 `reportAlready`/`reportDone` 토스트를 가른다.
   *
   * 옵셔널로 두면 "키가 안 왔다" 와 "첫 신고다" 가 같은 모양(`false` 로 읽힘)이 되어,
   * 서버가 그 필드를 흘리는 날 사용자가 어제 한 신고를 오늘 새로 한 줄 안다. 그래서
   * **없으면 죽는다** — 서버 성공 반환이 하나뿐이라 이 키는 200 이면 항상 온다.
   */
  it("신고 — `alreadyReported` 가 없으면 거절한다 (중복 신고를 첫 신고로 말하게 된다)", async () => {
    const { alreadyReported: _dropped, ...broken } = REPORT_RESULT
    apiPost.mockResolvedValue({ data: { result: broken } })

    const error = await caught(() =>
      restaurantService.reportReview(4021, { reason: "SPAM" }),
    )
    expect(isRestaurantShapeError(error)).toBe(true)
    expect((error as RestaurantShapeError).missing).toEqual(["alreadyReported"])
  })

  it("신고 — 두 번째 신고(`alreadyReported: true`)도 정상 응답이다", async () => {
    apiPost.mockResolvedValue({
      data: { result: { ...REPORT_RESULT, alreadyReported: true } },
    })

    await expect(
      restaurantService.reportReview(4021, { reason: "SPAM" }),
    ).resolves.toMatchObject({ alreadyReported: true })
  })
})

/* ─────── 2-b. 중첩이 비면 "봉투가 없다" 와 다른 문장이 나온다 ─────── */

/**
 * `at` 인자가 존재하는 이유를 고정한다.
 *
 * 중첩 객체를 검사하면서 위치를 안 넘기면, **봉투 자체가 비어서** 죽은 것과 **봉투 안이
 * 비어서** 죽은 것이 글자 그대로 같은 문장이 된다. 오류를 받은 사람은 서버 응답을 볼지
 * 우리 조립을 볼지 알 수 없다. 그래서 두 경우를 나란히 놓고 `at` 이 서로 달라야 함을 본다.
 *
 * 위치를 **엔드포인트 문자열에 섞는** 방식(`"…/hours 의 today"`)도 같은 이유로 막는다 —
 * 그러면 `endpoint` 가 기계 분류용 값이 아니게 되고, 한 파일 안에 표기 관습이 두 벌 생긴다.
 */
describe("중첩 가드는 위치를 `at` 으로 말한다", () => {
  const REVIEW_ITEM = shellFor(REVIEW_ITEM_KEYS)
  const HOURS = { ...shellFor(HOURS_KEYS), today: shellFor(HOURS_TODAY_KEYS) }
  const SUBMIT = { rating: 5, content: "좋아요", keywords: [] }

  it('후기 작성 — 봉투에 `review` 가 없으면 최상위(`at: ""`)로 말한다', async () => {
    apiPost.mockResolvedValue({ data: { result: { photosIndexed: 0 } } })

    const error = await caught(() =>
      restaurantService.createReview(317, SUBMIT),
    )
    const shape = error as RestaurantShapeError
    expect(isRestaurantShapeError(error)).toBe(true)
    expect(shape.missing).toEqual(["review"])
    expect(shape.at).toBe("")
  })

  it('후기 작성 — 봉투 **안**의 후기가 비면 `at: "review"` 로 갈라진다', async () => {
    const { reviewId: _dropped, ...brokenReview } = REVIEW_ITEM
    apiPost.mockResolvedValue({
      data: { result: { review: brokenReview, photosIndexed: 0 } },
    })

    const error = await caught(() =>
      restaurantService.createReview(317, SUBMIT),
    )
    const shape = error as RestaurantShapeError
    expect(isRestaurantShapeError(error)).toBe(true)
    expect(shape.missing).toEqual(["reviewId"])
    // 위 테스트와 **같은 엔드포인트인데 문장이 달라야** 한다. 이게 `at` 의 존재 이유다.
    expect(shape.at).toBe("review")
    expect(shape.message).toContain("POST /restaurants/:id/reviews 의 review")
  })

  it("`/hours` — 위치는 `at` 이지 엔드포인트 문자열이 아니다", async () => {
    const { closeTime: _dropped, ...brokenToday } = HOURS.today
    apiGet.mockResolvedValue({
      data: { result: { ...HOURS, today: brokenToday } },
    })

    const error = await caught(() => restaurantService.fetchHours(317))
    const shape = error as RestaurantShapeError
    expect(isRestaurantShapeError(error)).toBe(true)
    expect(shape.missing).toEqual(["closeTime"])
    expect(shape.at).toBe("today")
    /* `endpoint` 는 위치가 섞이지 않은 **순수한 엔드포인트 이름**이어야 한다 — 여기에
       `의 today` 가 붙으면 이 값으로는 더 이상 엔드포인트를 분류할 수 없다. */
    expect(shape.endpoint).toBe("GET /restaurants/:id/hours")
  })
})

/* ────────────── 3. `ai-search` 404 는 스키마 드리프트가 아니다 ────────────── */

describe("ai-search 404 (라우트 미등록)", () => {
  /**
   * 던진 오류가 그대로 나온다는 단언만으로는 **아무것도 고정되지 않는다** — 가드가 돌든
   * 안 돌든 통과하기 때문이다(예전 이 그룹의 세 테스트가 전부 그랬다). 그래서 가드
   * 자체에 스파이를 걸고 **불렸는지·언제 불렸는지**를 본다.
   */
  let guardSpy: jest.SpyInstance

  beforeEach(() => {
    guardSpy = jest.spyOn(restaurantShape, "requireShape")
  })

  afterEach(() => {
    guardSpy.mockRestore()
  })

  it("요청이 던지면 가드는 **아예 돌지 않는다** — 없는 기능이 고장난 기능이 되지 않는다", async () => {
    const notFound = new ApiError("Not Found", "COMMON_ERROR_404", 404)
    apiPost.mockRejectedValue(notFound)

    const error = await caught(() =>
      restaurantService.aiSearch(AI_SEARCH_PAYLOAD),
    )
    // 던진 그 객체가 그대로 나온다(감싸거나 바꿔 말하지 않는다).
    expect(error).toBe(notFound)
    expect(isRestaurantShapeError(error)).toBe(false)
    /* 여기가 실효를 만드는 줄이다. 실패를 `catch` 로 받아 빈 본문을 만들어 넣는 순간
       — 즉 "가드를 먼저 돌리는" 모든 되돌림에서 — 이 단언이 빨개진다. */
    expect(guardSpy).not.toHaveBeenCalled()
  })

  it("404 를 `RESPONSE_MALFORMED` 로 분류하지 않는다 (그 문구가 사용자에게 나간다)", async () => {
    const notFound = new ApiError("Not Found", "COMMON_ERROR_404", 404)
    apiPost.mockRejectedValue(notFound)

    const error = await caught(() =>
      restaurantService.aiSearch(AI_SEARCH_PAYLOAD),
    )
    expect(classifyFetchFailure(error, "aiSearch")).not.toBe(
      "RESPONSE_MALFORMED",
    )
  })

  it("가드는 **응답을 받은 뒤에** 돈다 — 호출 순서로 못 박는다", async () => {
    apiPost.mockResolvedValue({ data: { result: AI_SEARCH_RESULT } })

    await restaurantService.aiSearch(AI_SEARCH_PAYLOAD)

    expect(guardSpy).toHaveBeenCalled()
    // `invocationCallOrder` 는 스파이 전역 카운터다 — 두 mock 사이의 순서를 그대로 준다.
    expect(apiPost.mock.invocationCallOrder[0]).toBeLessThan(
      guardSpy.mock.invocationCallOrder[0],
    )
  })
})

/* ────────────── 4. 죽은 파라미터: 상세는 좌표를 보내지 않는다 ────────────── */

describe("GET /restaurants/:id 는 앵커 좌표를 보내지 않는다", () => {
  it("경로 하나만 보낸다 — 서버가 안 읽는 `userLat`/`userLng` 를 싣지 않는다", async () => {
    apiGet.mockResolvedValue({ data: { result: shellFor(DETAIL_KEYS) } })

    await restaurantService.fetchDetail(317)

    // 두 번째 인자 자체가 없어야 한다. `{ params: {} }` 를 남기면 다음 사람이
    // "여기에 좌표를 다시 넣으면 되겠다" 고 읽는다.
    expect(apiGet).toHaveBeenCalledWith("/restaurants/317")
  })

  it("`ai-search` 는 반대다 — 그쪽 좌표는 서버가 실제로 읽는다", async () => {
    apiPost.mockResolvedValue({ data: { result: AI_SEARCH_RESULT } })

    await restaurantService.aiSearch(AI_SEARCH_PAYLOAD)

    expect(apiPost).toHaveBeenCalledWith(
      "/restaurants/ai-search",
      expect.objectContaining({ userLat: 37.5, userLng: 127.02 }),
      expect.anything(),
    )
  })
})

/* ────────────── 5. 구조: 응답이 가드 밖으로 나가는 자리가 없다 ────────────── */

describe("restaurantService 의 모든 응답은 가드를 통과한다", () => {
  const SERVICE = path.resolve(
    __dirname,
    "../src/services/data/restaurantService.ts",
  )
  const source = fs.readFileSync(SERVICE, "utf8")

  /**
   * 주석을 지운다. **주석 안의 글자는 코드가 아니다.**
   *
   * 아래 정규식들을 원문에 그대로 대면 `// TODO: requireArrayShape(...) 나중에 붙인다`
   * 같은 평범한 한 줄이 "가드를 불렀다" 로 계산돼 구조 테스트가 통째로 무력해진다.
   * 더 흔한 경로는 JSDoc 이다 — 다음 메서드의 머리말은 **앞 메서드 블록 꼬리에** 붙으므로,
   * 남의 문서에 적힌 `requireShape` 로 가드 없는 메서드가 통과한다.
   */
  const stripComments = (text: string): string =>
    text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "")

  const code = stripComments(source)

  /**
   * 서비스 객체의 멤버를 **블록으로** 자른다.
   *
   * 한때 이 그룹은 리터럴 `response.data.result` 로만 소스를 쪼갰다. 그래서
   * `const { result } = response.data` 처럼 한 번 지역변수로 받은 뒤 캐스트하는 형태가
   * 통째로 빠져나갔다(검수에서 그 모양의 메서드를 넣고 돌렸더니 전부 초록이었다).
   * 표현 하나를 쫓는 대신 **범위**를 본다: 네트워크를 부르는 메서드에는 가드가 있어야 한다.
   *
   * 그 다음 판에서는 `\n  async 이름(` 으로만 잘랐고, 그래서 **`async` 가 아닌** 메서드가
   * 블록으로 잡히지 않고 앞 블록에 흡수됐다 — 앞 메서드에 가드가 있으면 새 메서드가
   * 가드를 한 줄도 안 불러도 전부 초록이었다. 그래서 `async`·화살표 프로퍼티·평범한
   * 메서드를 모두 받는다.
   *
   * 자르기 전에 **객체 리터럴로 범위를 좁힌다.** 파일 위쪽 `interface` 의 필드도 2칸
   * 들여쓰기 + `이름:` 이라 그대로 자르면 그것들이 메서드로 둔갑한다.
   */
  const OBJECT_HEAD = "export const restaurantService = {"
  const objectSource = source.slice(source.indexOf(OBJECT_HEAD))
  /** 2칸 들여쓰기로 시작하는 멤버 머리(`async 이름(` · `이름(` · `이름:`). */
  const MEMBER_HEAD = /\n  (?=(?:async\s+)?[A-Za-z_$][\w$]*\s*[(<:])/u
  const MEMBER_NAME = /^(?:async\s+)?([A-Za-z_$][\w$]*)/u

  const METHODS = objectSource
    .split(MEMBER_HEAD)
    .slice(1)
    .map((block) => ({
      // 이름은 원문 머리에서 읽는다(자른 자리가 곧 멤버 머리다).
      name: MEMBER_NAME.exec(block)?.[1] ?? "",
      // 판정은 주석 없는 본문으로만 한다. 위 `stripComments` 머리말 참고.
      code: stripComments(block),
    }))

  // `api\n  .post(` 처럼 프리티어가 줄을 접은 형태도 같은 호출이다 — 점 둘레의 공백을 허용한다.
  const HTTP_CALL = /\bapi\s*\.\s*(?:get|post|put|patch|delete)\s*[(<]/u
  const HTTP_CALL_ALL = new RegExp(HTTP_CALL.source, "gu")
  const GUARD_CALL =
    /\b(?:requireShape|requireItemShape|requireArrayShape)\s*[<(]/u

  const networking = () => METHODS.filter((m) => HTTP_CALL.test(m.code))

  it("분해기가 헛돌지 않는다 — 메서드와 네트워크 호출을 실제로 찾아낸다", () => {
    /* 아래 세 단언은 "일치가 0건" 형태라, 소스를 못 읽거나 정규식이 어긋나도 초록이 될
       수 있다. 그 구멍을 여기서 막는다 — 지금 서비스의 메서드는 17개이고 전부 네트워크를 탄다. */
    expect(METHODS.map((m) => m.name)).toEqual(
      expect.arrayContaining([
        "fetchNearby",
        "aiSearch",
        "reportReview",
        "fetchMenus",
      ]),
    )
    expect(METHODS.length).toBeGreaterThanOrEqual(17)
    expect(networking().length).toBe(METHODS.length)
    /* 여기가 분해기의 **우회로**를 막는 줄이다. 위 세 줄은 흡수를 못 본다 — 메서드가
       앞 블록에 통째로 먹히면 개수가 늘지 않아 그대로 초록이기 때문이다. 반대로 `api.*`
       호출 **자리** 수는 흡수돼도 줄지 않으므로, 블록 수와 어긋나는 순간 빨개진다.
       (파일 전체를 세므로 객체 **밖**에서 네트워크를 타는 헬퍼가 생겨도 같이 걸린다.)

       한 메서드가 두 번 부르는 것이 정말 옳은 날에는 이 줄을 손으로 고쳐야 한다. 그게
       의도다 — 그때 이 파일 머리말이 적어 둔 사각지대(한 메서드·두 응답)가 살아나므로
       사람이 그 메서드를 한 번 봐야 한다. */
    expect(code.match(HTTP_CALL_ALL)?.length).toBe(networking().length)
  })

  it("`api.*` 를 부르는 메서드마다 가드가 최소 하나 걸려 있다", () => {
    const unguarded = networking()
      .filter((m) => !GUARD_CALL.test(m.code))
      .map((m) => m.name)
    /* 이름이 하나라도 남으면 그 메서드가 곧 `undefined` 를 화면까지 내려보내는 경로다.
       가드를 부르는 **표현**이 아니라 부르는 **자리**를 세므로, 응답 본문을 어떤 형태로
       꺼내든(`response.data.result` · 구조분해 · 중간 변수) 빠져나갈 수 없다. */
    expect(unguarded).toEqual([])
  })

  it("`response.data.result` 를 같은 줄에서 캐스트하는 자리가 없다", () => {
    // 위 블록 테스트보다 좁다(한 줄짜리 형태만 본다). 사정거리는 위가 넓고, 이건 그
    // 중에서도 가장 흔한 모양을 오류 메시지로 곧장 이름 붙여 주는 용도다.
    // 주석 없는 본문을 보는 것은 위 두 테스트와 같다 — 금지된 모양을 **설명하는** 주석이
    // 위반으로 잡히면 다음 사람이 설명을 지우게 된다.
    const rawCasts = code.match(/response\.data[^\n]*\bas\s+[A-Za-z{]/gu) ?? []
    expect(rawCasts).toEqual([])
  })
})

/* ────────────── 6. 표의 머리말이 그 표에 붙어 있다 ────────────── */

describe("설명할 대상 없이 떠 있는 JSDoc 이 없다", () => {
  /**
   * JSDoc 이 **바로 뒤 심볼**에 붙는다는 사실을 고정한다.
   *
   * 주석 두 벌이 연달아 오면 TS 도 에디터도 **마지막 것만** 그 심볼의 문서로 본다.
   * 실제로 `REVIEW_ITEM_KEYS` 의 머리말("작성자 네 필드가 평평하게…")이
   * `REVIEW_CREATE_KEYS` 앞에 얹혀 있었고, 그래서 `REVIEW_ITEM_KEYS` 는 문서가 통째로
   * 사라진 채였다. 소스를 위에서 아래로 읽는 사람 눈에는 두 설명이 다 보이므로 눈으로는
   * 안 잡히고, 정작 문서가 필요한 순간(호버·자동완성)에만 없다.
   *
   * 본문에 `*​/` 가 못 들어오게 막은 것은 일부러다 — 게으른 `[\s\S]*?` 로 두면 앞뒤로
   * 멀리 떨어진 두 주석을 한 덩이로 붙여 잡아 엉뚱한 곳을 지목한다.
   */
  const ORPHAN_DOC = /\/\*\*(?:[^*]|\*(?!\/))*\*\/\s*(?=\/\*)/gu

  it.each([
    ["restaurantShape.ts", "../src/services/data/restaurantShape.ts"],
    ["restaurantService.ts", "../src/services/data/restaurantService.ts"],
  ])("%s", (_name, relative) => {
    const text = fs.readFileSync(path.resolve(__dirname, relative), "utf8")
    // 첫 내용 줄로 이름을 붙인다 — 블록 전문을 그대로 뱉으면 어느 자리인지 못 읽는다.
    const orphans = (text.match(ORPHAN_DOC) ?? []).map(
      (block) => block.split("\n")[1]?.trim() ?? block,
    )
    expect(orphans).toEqual([])
  })
})
