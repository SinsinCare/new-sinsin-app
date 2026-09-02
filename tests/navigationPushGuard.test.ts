/**
 * 같은 상세 화면이 겹쳐 쌓이는 결함의 회귀 테스트 — `src/shared/navigation/pushGuard.ts`.
 *
 * 카드를 전환 중에 여러 번 누르거나 Pressable 이 두 번 발화하면 `push` 가 같은 href 로
 * 두 번 나갔다. 빗장은 **같은 href 만** 짧은 창 안에서 접고, 다른 href 와 창 밖의
 * 재진입은 그대로 보낸다.
 */
import type { Href } from "expo-router"

import {
  DUPLICATE_PUSH_WINDOW_MS,
  createPushGuard,
  hrefKey,
} from "@/src/shared/navigation/pushGuard"

function guardAt(start = 1_000) {
  let now = start
  const guard = createPushGuard(() => now)
  return { guard, tick: (ms: number) => (now += ms) }
}

describe("pushGuard — 같은 href 연타", () => {
  test("첫 push 는 통과하고, 창 안의 같은 href 는 버린다", () => {
    const { guard, tick } = guardAt()
    expect(guard.allow("/post/42")).toBe(true)
    tick(50)
    expect(guard.allow("/post/42")).toBe(false)
    tick(300)
    expect(guard.allow("/post/42")).toBe(false)
  })

  test("창이 지나면 같은 href 도 다시 통과한다 — 열었다 닫고 다시 여는 정상 사용", () => {
    const { guard, tick } = guardAt()
    expect(guard.allow("/recipe/7")).toBe(true)
    tick(DUPLICATE_PUSH_WINDOW_MS)
    expect(guard.allow("/recipe/7")).toBe(true)
  })

  test("다른 href 는 막지 않는다 — push(a); push(b) 로 스택을 쌓는 흐름", () => {
    const { guard } = guardAt()
    expect(guard.allow("/(tabs)/home")).toBe(true)
    expect(guard.allow("/consult")).toBe(true)
  })

  test("버려진 시도는 창을 연장하지 않는다 — 연타를 계속하면 영영 잠기는 자물쇠가 아니다", () => {
    const { guard, tick } = guardAt()
    expect(guard.allow("/post/1")).toBe(true)
    for (let i = 0; i < 7; i += 1) {
      tick(100)
      expect(guard.allow("/post/1")).toBe(false)
    }
    tick(100) // 처음 허용으로부터 800ms
    expect(guard.allow("/post/1")).toBe(true)
  })

  test("reset 뒤에는 바로 다시 통과한다", () => {
    const { guard } = guardAt()
    expect(guard.allow("/post/1")).toBe(true)
    guard.reset()
    expect(guard.allow("/post/1")).toBe(true)
  })
})

describe("hrefKey — 객체 href 정규화", () => {
  test("필드 순서만 다른 객체 href 는 같은 키다", () => {
    const a = {
      pathname: "/post/[id]",
      params: { id: "3", from: "feed" },
    } as Href
    const b = {
      pathname: "/post/[id]",
      params: { from: "feed", id: "3" },
    } as Href
    expect(hrefKey(a)).toBe(hrefKey(b))
  })

  test("params 가 다르면 다른 키다", () => {
    const a = { pathname: "/post/[id]", params: { id: "3" } } as Href
    const b = { pathname: "/post/[id]", params: { id: "4" } } as Href
    expect(hrefKey(a)).not.toBe(hrefKey(b))
  })

  test("문자열 href 는 그대로 키다", () => {
    expect(hrefKey("/community/search")).toBe("/community/search")
  })
})
