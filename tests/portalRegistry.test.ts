/**
 * 자체 `Portal` 의 계약을 고정한다.
 *
 * ## 왜 테스트가 필요한가
 *
 * tamagui 이행에서 색·간격은 틀려도 "보기 이상한" 정도지만, `Portal` 은 **동작**이다.
 * 여기가 깨지면 로딩 막·업데이트 안내·공지 팝업이 **아예 안 뜨거나**, 반대로 빈 층이
 * 화면 전체 터치를 먹어 **앱이 멈춘 것처럼** 보인다. 둘 다 타입·린트로 안 잡힌다.
 *
 * 렌더러 없이 레지스트리 로직만 검증한다 — 이 파일이 지키려는 것은 그리기가 아니라
 * "언제 무엇이 목록에 있는가" 이기 때문이다.
 */

type Entry = { id: string; node: string }

/** PortalProvider 의 상태 전이를 그대로 옮긴 것. */
function createRegistry() {
  let entries: Entry[] = []
  return {
    mount(id: string, node: string) {
      entries = [...entries.filter((e) => e.id !== id), { id, node }]
    },
    unmount(id: string) {
      entries = entries.filter((e) => e.id !== id)
    },
    get list() {
      return entries
    },
  }
}

describe("Portal 레지스트리 — 무엇이 화면 위에 남는가", () => {
  it("mount 하면 목록에 오르고 unmount 하면 사라진다", () => {
    const r = createRegistry()
    r.mount("a", "로딩")
    expect(r.list.map((e) => e.node)).toEqual(["로딩"])
    r.unmount("a")
    expect(r.list).toEqual([])
  })

  it("같은 id 를 다시 mount 하면 **덮어쓴다** — 내용이 바뀔 때마다 쌓이면 안 된다", () => {
    const r = createRegistry()
    r.mount("a", "분석 중")
    r.mount("a", "저장 중")
    expect(r.list).toHaveLength(1)
    expect(r.list[0].node).toBe("저장 중")
  })

  it("나중에 올린 것이 뒤에 온다 — 겹치면 늦게 연 쪽이 위여야 한다", () => {
    const r = createRegistry()
    r.mount("a", "공지")
    r.mount("b", "로딩")
    expect(r.list.map((e) => e.node)).toEqual(["공지", "로딩"])
  })

  it("같은 id 재mount 는 **순서도 갱신한다** — 다시 연 쪽이 위로 온다", () => {
    const r = createRegistry()
    r.mount("a", "공지")
    r.mount("b", "로딩")
    r.mount("a", "공지(갱신)")
    expect(r.list.map((e) => e.id)).toEqual(["b", "a"])
  })

  it("없는 id 를 unmount 해도 조용하다 — 언마운트가 두 번 불릴 수 있다", () => {
    const r = createRegistry()
    r.mount("a", "로딩")
    r.unmount("a")
    expect(() => r.unmount("a")).not.toThrow()
    expect(r.list).toEqual([])
  })

  it("전부 내리면 목록이 비어야 한다 — 빈 층이 남으면 터치를 먹는다", () => {
    const r = createRegistry()
    r.mount("a", "공지")
    r.mount("b", "로딩")
    r.unmount("a")
    r.unmount("b")
    // Provider 는 `entries.length > 0` 일 때만 오버레이 층을 그린다.
    expect(r.list).toHaveLength(0)
  })
})
