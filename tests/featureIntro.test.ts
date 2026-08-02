import {
  FEATURE_INTRO_SEEN_KEY,
  createFeatureIntroStorage,
  parseSeen,
} from "../src/features/coach/storage"

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
    setItem: (key: string, value: string) => {
      store.set(key, value)
      return Promise.resolve()
    },
    dump: () => store.get(FEATURE_INTRO_SEEN_KEY) ?? null,
  }
}

describe("feature intro storage", () => {
  it("처음에는 아무것도 본 적이 없다", async () => {
    const s = createFeatureIntroStorage(memoryStorage())
    expect(await s.hasSeen("restaurant")).toBe(false)
  })

  it("markSeen 후에는 그 기능만 봤다로 나온다", async () => {
    const mem = memoryStorage()
    const s = createFeatureIntroStorage(mem)
    await s.markSeen("recipe")
    expect(await s.hasSeen("recipe")).toBe(true)
    expect(await s.hasSeen("consult")).toBe(false)
  })

  it("같은 기능을 두 번 기록해도 payload 는 한 번만 쌓인다", async () => {
    const mem = memoryStorage()
    const s = createFeatureIntroStorage(mem)
    await s.markSeen("consult")
    await s.markSeen("consult")
    expect(JSON.parse(mem.dump() as string)).toEqual(["consult"])
  })

  it("깨진 payload 는 빈 목록으로 읽는다 — 안내가 한 번 더 뜨는 쪽이 안전하다", () => {
    expect(parseSeen("not-json")).toEqual([])
    expect(parseSeen('{"a":1}')).toEqual([])
    expect(parseSeen('[1, "recipe", null]')).toEqual(["recipe"])
    expect(parseSeen(null)).toEqual([])
  })
})
