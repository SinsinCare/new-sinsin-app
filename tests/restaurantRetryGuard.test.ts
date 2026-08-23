/**
 * **재시도가 `enabled` 가드를 우회하던 결함** (2026-08-21)
 *
 * 사용자 화면에 이렇게 떴다:
 *
 *     [restaurant] 알 수 없는 조회 실패 map viewport not committed
 *
 * `useMapSearch` 의 질의는 `enabled: committed !== null` 이다 — 지도가 첫 뷰포트를
 * 확정하기 전에는 보낼 상자가 없기 때문이다. 그래서 `queryFn` 첫 줄의
 * `throw new Error("viewport not committed")` 는 **타입 좁히기용**으로만 있었고
 * 도달할 수 없다고 적혀 있었다.
 *
 * 그런데 도달했다. react-query 의 `refetch()` 가 `enabled` 를 **보지 않기 때문**이다
 * (아래 오라클이 설치된 판본으로 그것을 찍는다). 화면의 `다시 시도` 와, 이번에 들어온
 * **탭 재탭 사다리의 4번(새로고침)** 이 그 경로로 들어와 `queryFn` 을 그대로 실행했다.
 * 던져진 예외는 `classifyFetchFailure` 를 지나 사용자에게 **조회 실패**가 됐다 —
 * 뷰포트가 아직 안 정해진 것은 실패가 아니라 아직 이른 것인데도.
 *
 * 같은 뿌리에서 **더 조용한 두 번째 결함**이 나온다. `handleRetry` 는 목록도 같이
 * 다시 받는데, 그 질의의 `enabled` 는 "첫 뷰포트 확정 전에는 묻지 않는다" 를 지키려고
 * 있다 — bbox 도 지역 필터도 없는 요청은 서버에서 **전국**이 되기 때문이다. 이쪽은
 * 실패하지 않고 **성공해서** 엉뚱한 카드로 목록을 채운다. 던지는 쪽보다 나쁘다.
 *
 * 전제를 아는 것은 훅이므로 막는 것도 훅이다. 부르는 쪽마다 다시 검사하게 하면
 * 새 호출자가 생길 때마다 같은 구멍이 다시 열린다 — 실제로 탭 재탭이 그 새 호출자였다.
 */

/* eslint-disable import/first -- jest.mock 은 호이스팅되므로 import 보다 위에 적는다
   (같은 이유의 같은 처리가 `tests/communityInfiniteTail.test.ts` 에도 있다). */
jest.mock("../src/services/core/apiClient", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

// 훅 4개만 갈아 끼워 **훅 본문 자체를** 돌린다(`tests/helpers/hookHarness.ts` 머리말).
jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/hookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
  }
})

/*
  `useTranslation` 만 갈아 끼운다. 모듈을 통째로 대체하면 `initReactI18next` 가 사라져
  `src/i18n/index.ts` 의 `i18n.use(...)` 가 undefined 를 받고 스위트가 로드조차 안 된다.
*/
jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ i18n: { language: "ko", resolvedLanguage: "ko" } }),
}))

/*
  `useQuery`/`useInfiniteQuery` 를 관측 가능한 껍데기로 바꾼다. 우리가 보려는 것은
  "훅이 react-query 에게 **다시 받으라고 말했는가**" 하나이고, 그 말은 옵저버의
  `refetch` 호출로만 나간다. `keepPreviousData` 는 실물을 그대로 통과시킨다 —
  질의 옵션에 그대로 들어가는 값이라 가짜로 바꾸면 옵션이 달라진다.

  스파이는 **팩토리 안에서** 만들어 `__harness` 로 되돌려 받는다. 바깥 `const` 로 두면
  그 선언이 import 보다 앞에 와야 하는데(팩토리가 모듈 로드 시점에 불린다),
  그러면 `import/first` 가 걸린다. 팩토리 안이면 순서 문제가 아예 없다.
*/
jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query")
  const queryRefetch = jest.fn()
  const infiniteRefetch = jest.fn()
  /** 마지막으로 `useQuery` 에 넘어간 옵션 — `queryFn` 과 `enabled` 를 여기서 꺼내 본다. */
  const seen: { queryOptions: Record<string, unknown> } = { queryOptions: {} }
  return {
    ...actual,
    __harness: { queryRefetch, infiniteRefetch, seen },
    useQuery: (options: Record<string, unknown>) => {
      seen.queryOptions = options
      return {
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        refetch: queryRefetch,
      }
    },
    useInfiniteQuery: () => ({
      data: undefined,
      isLoading: false,
      isRefetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      isError: false,
      error: null,
      fetchNextPage: jest.fn(),
      refetch: infiniteRefetch,
    }),
  }
})

import { useMapSearch } from "@/src/features/restaurant/hooks/useMapSearch"
import { useRestaurantList } from "@/src/features/restaurant/hooks/useRestaurantList"
import { DEFAULT_RESTAURANT_FILTERS } from "@/src/features/restaurant/hooks/useRestaurantFilters"
import { renderHookSync } from "./helpers/hookHarness"

const { queryRefetch, infiniteRefetch, seen } = (
  jest.requireMock("@tanstack/react-query") as {
    __harness: {
      queryRefetch: jest.Mock
      infiniteRefetch: jest.Mock
      seen: { queryOptions: Record<string, unknown> }
    }
  }
).__harness

/** 강남 한 블록. 면적 상한(`isBboxTooLarge`) 안쪽이라 첫 팬에서 바로 확정된다. */
const GANGNAM = { swLat: 37.49, swLng: 127.02, neLat: 37.51, neLng: 127.04 }

beforeEach(() => {
  queryRefetch.mockClear()
  infiniteRefetch.mockClear()
  seen.queryOptions = {}
})

describe("react-query 의 refetch 는 enabled 를 보지 않는다 (오라클)", () => {
  /*
    가드가 존재하는 **이유**를 실물로 찍는다. 이 단언이 언젠가 빨개지면 그것은 회귀가
    아니라 좋은 소식이다 — react-query 가 동작을 고쳤다는 뜻이고, 그때 두 훅의 가드를
    지울 수 있는지 다시 판단하면 된다. 이 줄이 없으면 가드는 "왜 있는지 모르는 코드"가
    되어 언젠가 정리된다.
  */
  it("enabled:false 인 질의도 refetch() 하면 queryFn 이 실행된다", async () => {
    const { QueryClient, QueryObserver } = jest.requireActual(
      "@tanstack/react-query",
    )
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const queryFn = jest.fn().mockResolvedValue("ok")
    const observer = new QueryObserver(client, {
      queryKey: ["retry-guard-oracle"],
      queryFn,
      enabled: false,
    })

    // 꺼져 있으니 저절로는 안 나간다.
    expect(queryFn).not.toHaveBeenCalled()

    await observer.refetch()

    // 그런데 손으로 부르면 나간다. 이것이 두 훅이 스스로 막아야 하는 이유다.
    expect(queryFn).toHaveBeenCalledTimes(1)
    client.clear()
  })
})

describe("지도 질의 — 뷰포트 확정 전에는 다시 받지 않는다", () => {
  it("확정 전 refetch() 는 아무 것도 하지 않는다", () => {
    const hook = renderHookSync(() =>
      useMapSearch({ filters: DEFAULT_RESTAURANT_FILTERS, userLocation: null }),
    )

    expect(hook.result().committedBounds).toBeNull()
    hook.result().refetch()

    expect(queryRefetch).not.toHaveBeenCalled()
  })

  it("확정된 뒤에는 다시 받는다 — 가드가 재시도를 통째로 죽이지 않는다", () => {
    const hook = renderHookSync(() =>
      useMapSearch({ filters: DEFAULT_RESTAURANT_FILTERS, userLocation: null }),
    )

    hook.result().onViewportChange(GANGNAM, 5)
    expect(hook.result().committedBounds).not.toBeNull()

    hook.result().refetch()
    expect(queryRefetch).toHaveBeenCalledTimes(1)
  })

  it("queryFn 의 가드는 그대로 있다 — 막은 것이지 지운 것이 아니다", () => {
    renderHookSync(() =>
      useMapSearch({ filters: DEFAULT_RESTAURANT_FILTERS, userLocation: null }),
    )

    // 확정 전에는 질의 자체가 꺼져 있고,
    expect(seen.queryOptions.enabled).toBe(false)
    // 그래도 누군가 `queryFn` 을 직접 실행하면 여전히 던진다(마지막 방어선).
    const queryFn = seen.queryOptions.queryFn as (arg: {
      signal: AbortSignal
    }) => unknown
    expect(() => queryFn({ signal: new AbortController().signal })).toThrow(
      "viewport not committed",
    )
  })
})

describe("목록 질의 — 확정 전 재시도가 전국 질의를 내보내지 않는다", () => {
  it("enabled:false 면 refetch() 가 나가지 않는다", () => {
    const hook = renderHookSync(() =>
      useRestaurantList({
        filters: DEFAULT_RESTAURANT_FILTERS,
        userLocation: null,
        bounds: null,
        enabled: false,
      }),
    )

    hook.result().refetch()

    expect(infiniteRefetch).not.toHaveBeenCalled()
  })

  it("enabled:true 면 다시 받는다", () => {
    const hook = renderHookSync(() =>
      useRestaurantList({
        filters: DEFAULT_RESTAURANT_FILTERS,
        userLocation: null,
        bounds: GANGNAM,
        enabled: true,
      }),
    )

    hook.result().refetch()

    expect(infiniteRefetch).toHaveBeenCalledTimes(1)
  })
})
