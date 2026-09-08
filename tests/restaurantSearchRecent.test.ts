import { renderHookWithEffects } from "./helpers/effectHookHarness"
import { useRecentSearches } from "../src/features/restaurant/hooks/useRecentSearches"
import {
  SUGGEST_DEBOUNCE_MS,
  useSearchSuggest,
} from "../src/features/restaurant/hooks/useSearchSuggest"
import {
  MAX_RESTAURANT_RECENT_SEARCHES,
  parseRestaurantRecent,
  prependRestaurantRecent,
  replayRestaurantRecent,
  restaurantRecentFromSuggestion,
  serializeRestaurantRecent,
  type RestaurantRecentSearch,
} from "../src/features/restaurant/utils/restaurantSearchRecent"
import type { SearchSuggestionDto } from "../src/features/restaurant/types"

jest.mock("react", () => {
  const actual = jest.requireActual("react")
  const harness = jest.requireActual("./helpers/effectHookHarness")
  return {
    ...actual,
    useState: harness.useState,
    useRef: harness.useRef,
    useEffect: harness.useEffect,
    useCallback: harness.useCallback,
    useMemo: harness.useMemo,
  }
})

const mockGetItem = jest.fn<Promise<string | null>, [string]>()
const mockSetItem = jest.fn<Promise<void>, [string, string]>()
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { resolvedLanguage: "ko", language: "ko" } }),
}))
jest.mock("@/src/i18n", () => ({ normalizeLanguage: () => "ko" }))
jest.mock("@/src/services/data/restaurantService", () => ({
  restaurantService: { fetchSuggestions: jest.fn() },
}))

type QuerySnapshot = {
  data?: { suggestions: SearchSuggestionDto[] }
  isFetching: boolean
  isError: boolean
  error: unknown
}
const mockQueries = new Map<string, QuerySnapshot>()
jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: readonly unknown[] }) =>
    mockQueries.get(String(options.queryKey[options.queryKey.length - 1])) ?? {
      isFetching: false,
      isError: false,
      error: null,
    },
}))

const REGION: SearchSuggestionDto = {
  type: "REGION",
  label: "강남역",
  lat: 37.4979,
  lng: 127.0276,
  key: "seoul-gangnam",
}
const RESTAURANT: SearchSuggestionDto = {
  type: "RESTAURANT",
  label: "테스트 식당",
  restaurantId: 123,
}
const cleanups: (() => void)[] = []

function mount<T>(hook: () => T) {
  const result = renderHookWithEffects(hook)
  cleanups.push(result.unmount)
  return result
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

async function flushPromises() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
}

beforeEach(() => {
  jest.useFakeTimers()
  mockGetItem.mockReset().mockResolvedValue(null)
  mockSetItem.mockReset().mockResolvedValue(undefined)
  mockQueries.clear()
})
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
  jest.clearAllTimers()
  jest.useRealTimers()
})

describe("recent selections preserve their destination", () => {
  it("a stored region replays the original camera destination, never a name search", () => {
    const entry = restaurantRecentFromSuggestion(REGION)
    const [restored] = parseRestaurantRecent(serializeRestaurantRecent([entry]))
    const actions = {
      onSubmitQuery: jest.fn(),
      onSelectRegion: jest.fn(),
      onSelectRestaurant: jest.fn(),
    }
    replayRestaurantRecent(restored, actions)
    expect(actions.onSelectRegion).toHaveBeenCalledWith(REGION)
    expect(actions.onSubmitQuery).not.toHaveBeenCalled()
    expect(actions.onSelectRestaurant).not.toHaveBeenCalled()
  })

  it("a stored restaurant reopens its ID rather than searching its label", () => {
    const [restored] = parseRestaurantRecent(
      serializeRestaurantRecent([restaurantRecentFromSuggestion(RESTAURANT)]),
    )
    const actions = {
      onSubmitQuery: jest.fn(),
      onSelectRegion: jest.fn(),
      onSelectRestaurant: jest.fn(),
    }
    replayRestaurantRecent(restored, actions)
    expect(actions.onSelectRestaurant).toHaveBeenCalledWith(123)
    expect(actions.onSubmitQuery).not.toHaveBeenCalled()
  })

  it("legacy strings remain ordered, deduplicated, and executable as text searches", () => {
    const entries = parseRestaurantRecent(
      JSON.stringify([" 국밥 ", "강남역", "국밥", "", null]),
    )
    expect(entries).toEqual([
      { kind: "query", label: "국밥" },
      { kind: "query", label: "강남역" },
    ])
    const actions = {
      onSubmitQuery: jest.fn(),
      onSelectRegion: jest.fn(),
      onSelectRestaurant: jest.fn(),
    }
    replayRestaurantRecent(entries[0], actions)
    expect(actions.onSubmitQuery).toHaveBeenCalledWith("국밥")
  })

  it("rejects corrupt destinations and unknown storage versions without inventing a route", () => {
    expect(parseRestaurantRecent("not-json")).toEqual([])
    expect(
      parseRestaurantRecent(JSON.stringify({ version: 3, entries: [REGION] })),
    ).toEqual([])
    expect(
      parseRestaurantRecent(
        JSON.stringify({
          version: 2,
          entries: [
            { kind: "region", label: "bad latitude", lat: 190, lng: 127 },
            { kind: "region", label: "missing longitude", lat: 37 },
            { kind: "restaurant", label: "bad id", restaurantId: -1 },
            { kind: "unknown", label: "unknown intent" },
            { kind: "query", label: "valid" },
          ],
        }),
      ),
    ).toEqual([{ kind: "query", label: "valid" }])
  })

  it("keeps the latest intent for the same label and the latest name for the same ID", () => {
    const region = restaurantRecentFromSuggestion(REGION)
    expect(
      prependRestaurantRecent([{ kind: "query", label: REGION.label }], region),
    ).toEqual([region])
    const renamed: RestaurantRecentSearch = {
      kind: "restaurant",
      label: "새 이름",
      restaurantId: 123,
    }
    expect(
      prependRestaurantRecent(
        [restaurantRecentFromSuggestion(RESTAURANT)],
        renamed,
      ),
    ).toEqual([renamed])
    let entries: RestaurantRecentSearch[] = []
    for (let id = 1; id <= 12; id += 1) {
      entries = prependRestaurantRecent(entries, {
        kind: "restaurant",
        label: `식당 ${id}`,
        restaurantId: id,
      })
    }
    expect(entries).toHaveLength(MAX_RESTAURANT_RECENT_SEARCHES)
    expect(entries[0].label).toBe("식당 12")
    expect(entries[9].label).toBe("식당 3")
  })
})

describe("the actual recent-history hook", () => {
  it("loads legacy entries, writes destination data, and removes only the chosen item", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(["국밥", "샐러드"]))
    const hook = mount(useRecentSearches)
    expect(hook.result().isLoading).toBe(true)
    await flushPromises()
    const region = restaurantRecentFromSuggestion(REGION)
    hook.result().add(region)
    hook.result().remove({ kind: "query", label: "샐러드" })
    await flushPromises()
    const persisted = mockSetItem.mock.calls.at(-1)![1]
    expect(parseRestaurantRecent(persisted)).toEqual([
      region,
      { kind: "query", label: "국밥" },
    ])
    hook.result().clear()
    await flushPromises()
    expect(parseRestaurantRecent(mockSetItem.mock.calls.at(-1)![1])).toEqual([])
  })

  it("merges a fast selection with stored history even if navigation unmounts before loading", async () => {
    const storage = deferred<string | null>()
    mockGetItem.mockReturnValue(storage.promise)
    const hook = mount(useRecentSearches)
    const region = restaurantRecentFromSuggestion(REGION)
    hook.result().add(region)
    hook.unmount()
    storage.resolve(JSON.stringify(["국밥"]))
    await flushPromises()
    expect(parseRestaurantRecent(mockSetItem.mock.calls.at(-1)![1])).toEqual([
      region,
      { kind: "query", label: "국밥" },
    ])
  })

  it("serializes writes so an earlier slow add cannot undo a later clear", async () => {
    const firstWrite = deferred<void>()
    mockSetItem.mockImplementationOnce(() => firstWrite.promise)
    const hook = mount(useRecentSearches)
    await flushPromises()
    hook.result().add(restaurantRecentFromSuggestion(REGION))
    hook.result().clear()
    await flushPromises()
    expect(mockSetItem).toHaveBeenCalledTimes(1)
    firstWrite.resolve(undefined)
    await flushPromises()
    expect(mockSetItem).toHaveBeenCalledTimes(2)
    expect(parseRestaurantRecent(mockSetItem.mock.calls[1][1])).toEqual([])
  })
})

describe("the actual suggestion hook respects the current input", () => {
  it("hides a previous result throughout debounce, then exposes only the new result", () => {
    mockQueries.set("강남", {
      data: { suggestions: [REGION] },
      isFetching: false,
      isError: false,
      error: null,
    })
    const busan: SearchSuggestionDto = {
      type: "REGION",
      label: "부산",
      lat: 35.17,
      lng: 129.07,
    }
    mockQueries.set("부산", {
      data: { suggestions: [busan] },
      isFetching: false,
      isError: false,
      error: null,
    })
    let draft = "강남"
    const hook = mount(() => useSearchSuggest(draft))
    jest.advanceTimersByTime(SUGGEST_DEBOUNCE_MS)
    expect(hook.result().suggestions).toEqual([REGION])
    draft = "부산"
    hook.rerender()
    expect(hook.result().suggestions).toEqual([])
    expect(hook.result().isLoading).toBe(true)
    jest.advanceTimersByTime(SUGGEST_DEBOUNCE_MS - 1)
    expect(hook.result().suggestions).toEqual([])
    jest.advanceTimersByTime(1)
    expect(hook.result().suggestions).toEqual([busan])
  })

  it("does not reveal a late previous response or its error after the input changes", () => {
    let draft = "강남"
    const hook = mount(() => useSearchSuggest(draft))
    jest.advanceTimersByTime(SUGGEST_DEBOUNCE_MS)
    draft = "부산"
    hook.rerender()
    mockQueries.set("강남", {
      data: { suggestions: [REGION] },
      isFetching: false,
      isError: true,
      error: new Error("previous request"),
    })
    hook.rerender()
    expect(hook.result().suggestions).toEqual([])
    expect(hook.result().isError).toBe(false)
    expect(hook.result().error).toBeNull()
    draft = ""
    hook.rerender()
    expect(hook.result().suggestions).toEqual([])
    expect(hook.result().isLoading).toBe(false)
  })

  it("keeps a matching cached response usable during its background refresh", () => {
    mockQueries.set("강남", {
      data: { suggestions: [REGION] },
      isFetching: true,
      isError: false,
      error: null,
    })
    const hook = mount(() => useSearchSuggest(" 강남 "))
    jest.advanceTimersByTime(SUGGEST_DEBOUNCE_MS)
    expect(hook.result().suggestions).toEqual([REGION])
  })
})
