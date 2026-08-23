/**
 * **보고 있는 탭을 다시 눌렀을 때 — 한 번 누르면 한 걸음.**
 * 대상: `src/shared/navigation/tabReset.ts`
 *
 * ─── 무엇을 실제로 돌리나 ───────────────────────────────────────────────────
 * 이 저장소의 jest 에는 렌더러가 없다. 그래서 **진짜 함수를 그대로 부르고 무엇이
 * 불렸는지 센다.** 로직을 테스트에 다시 쓰지 않는다 — 사본을 검사하면 원본이 바뀌어도
 * 초록으로 남는다(`tests/helpers/hookHarness.ts` 머리말의 같은 이유).
 *
 * 순서를 세는 방식이 중요하다: 각 능력의 실행 함수는 **호출된 순서대로 이름을 배열에
 * 밀어 넣는다.** 그래서 "무엇이 불렸나" 뿐 아니라 **"몇 개가 불렸나"** 가 같이 잡힌다 —
 * 이 계약의 핵심은 "위 칸이 이긴다" 가 아니라 **"아래 칸이 같이 돌지 않는다"** 이고,
 * `toHaveBeenCalled` 만 쓰면 후자를 놓친다(한 탭이 시트를 닫으면서 스크롤까지 하면
 * 사용자는 자기가 무엇을 눌렀는지 알 수 없다 — 그것이 이 기능의 실패 모드다).
 */
import {
  createTabResetRegistry,
  isAtScrollTop,
  readTabResetFacts,
  resolveTabResetStep,
  runTabReset,
  SCROLL_TOP_EPSILON_PT,
  type TabResetFacts,
  type TabResetStep,
  type TabResetTarget,
} from "@/src/shared/navigation/tabReset"

/** 무엇이 **어떤 순서로** 불렸는지 남기는 화면 대역. */
function screen(options: {
  overlayOpen?: boolean
  /** 없으면 `content` 자체를 등록하지 않는다(스크롤 없는 탭). */
  atRoot?: boolean
  /**
   * 화면이 **고장나 있는가**. 참일 때만 `recover` 를 등록한다 — 멀쩡한 화면은
   * 그 칸을 비워 두고 사다리를 3번에서 끝낸다(2026-08-21 · `tabReset.ts` §4번).
   * 기본값이 `false` 인 것도 그 결정이다: 아무 말 없는 화면 = 멀쩡한 화면.
   */
  broken?: boolean
  /** 판정 함수가 던지는 화면(ref 가 아직 안 붙은 순간). */
  throwOnProbe?: boolean
}) {
  const calls: string[] = []
  const target: TabResetTarget = {
    overlay: {
      isOpen: () => {
        if (options.throwOnProbe) throw new Error("ref 없음")
        return options.overlayOpen ?? false
      },
      close: () => calls.push("closeOverlay"),
    },
    content:
      options.atRoot === undefined
        ? undefined
        : {
            isAtRoot: () => options.atRoot as boolean,
            reset: () => calls.push("resetContent"),
          },
    recover: options.broken ? () => calls.push("recover") : undefined,
  }
  return { calls, target }
}

describe("사다리는 **정확히 한 칸**만 밟는다", () => {
  it("시트가 열려 있으면 닫기 하나 — 팝도 스크롤도 새로고침도 하지 않는다", () => {
    const { calls, target } = screen({ overlayOpen: true, atRoot: false })
    const popped: string[] = []
    const step = runTabReset({
      target,
      popToRoot: () => popped.push("popToRoot"),
    })
    expect(step).toBe<TabResetStep>("closeOverlay")
    expect(calls).toEqual(["closeOverlay"])
    expect(popped).toEqual([])
  })

  it("시트가 없고 탭 안 루트가 아니면 루트로 — 스크롤은 건드리지 않는다", () => {
    const { calls, target } = screen({ atRoot: false })
    const popped: string[] = []
    const step = runTabReset({
      target,
      popToRoot: () => popped.push("popToRoot"),
    })
    expect(step).toBe<TabResetStep>("popToRoot")
    expect(popped).toEqual(["popToRoot"])
    expect(calls).toEqual([])
  })

  it("루트 화면이고 콘텐츠가 내려가 있으면 맨 위로 — 새로고침은 아직이다", () => {
    const { calls, target } = screen({ atRoot: false })
    const step = runTabReset({ target, popToRoot: null })
    expect(step).toBe<TabResetStep>("resetContent")
    expect(calls).toEqual(["resetContent"])
  })

  it("**멀쩡한 화면은 맨 위에서 끝난다** — 재탭이 데이터를 갈아치우지 않는다", () => {
    /*
      2026-08-21 에 뒤집힌 결정이다. 예전에는 이 자리가 `"refresh"` 였고, 그래서
      실기기에서 "다시 누르면 스크롤 맨 위가 아니라 새로고침 스피너까지 간다" 가 났다.
      탭 탭은 이동 제스처다 — 새로고침은 당김이 한다.
    */
    const { calls, target } = screen({ atRoot: true })
    const step = runTabReset({ target, popToRoot: null })
    expect(step).toBe<TabResetStep>("none")
    expect(calls).toEqual([])
  })

  it("고장난 화면에서만 4번(복구)이 산다", () => {
    const { calls, target } = screen({ atRoot: true, broken: true })
    const step = runTabReset({ target, popToRoot: null })
    expect(step).toBe<TabResetStep>("recover")
    expect(calls).toEqual(["recover"])
  })

  it("고장났어도 **되돌릴 스크롤이 먼저다** — 복구는 맨 위에 닿은 뒤에", () => {
    const { calls, target } = screen({ atRoot: false, broken: true })
    const step = runTabReset({ target, popToRoot: null })
    expect(step).toBe<TabResetStep>("resetContent")
    expect(calls).toEqual(["resetContent"])
  })
})

describe("멀쩡한 화면에서 **계속 눌러도** 아무 일이 없다", () => {
  it('두 번째·세 번째 재탭이 `"none"` 이다 — 걸음도 부수효과도 없다', () => {
    /*
      이것이 사용자가 실제로 밟은 경로다. 3번의 `scrollToTop` 은 기억한 오프셋을
      **동기적으로** 0 으로 쓰므로(늦게 오는 `onScroll` 이 옛 위치를 되살리는 다른
      결함을 막는다) 애니메이션이 도착하기 전에 이미 "맨 위" 가 된다. 4번이
      새로고침이던 시절에는 그 조기 참이 곧 두 번째 탭의 스피너였다.

      여기서는 그 순서를 그대로 흉내 낸다: 내려가 있음 → 재탭(3번) → 즉시 맨 위 →
      재탭 → 재탭. 두 번째부터는 아무 것도 실행되지 않아야 한다.
    */
    let atTop = false
    const calls: string[] = []
    const target: TabResetTarget = {
      content: {
        isAtRoot: () => atTop,
        reset: () => {
          calls.push("resetContent")
          // `scrollToTop` 의 동기 쓰기 — 애니메이션보다 먼저 맨 위가 된다.
          atTop = true
        },
      },
    }

    expect(runTabReset({ target, popToRoot: null })).toBe<TabResetStep>(
      "resetContent",
    )
    expect(runTabReset({ target, popToRoot: null })).toBe<TabResetStep>("none")
    expect(runTabReset({ target, popToRoot: null })).toBe<TabResetStep>("none")
    expect(calls).toEqual(["resetContent"])
  })

  it("같은 순서라도 화면이 고장나 있으면 두 번째가 복구다", () => {
    // 같은 조기 참을 밟지만 이번에는 4번이 등록돼 있다 — 그 차이만으로 갈린다.
    let atTop = false
    const calls: string[] = []
    const target: TabResetTarget = {
      content: {
        isAtRoot: () => atTop,
        reset: () => {
          calls.push("resetContent")
          atTop = true
        },
      },
      recover: () => calls.push("recover"),
    }

    runTabReset({ target, popToRoot: null })
    expect(runTabReset({ target, popToRoot: null })).toBe<TabResetStep>(
      "recover",
    )
    expect(calls).toEqual(["resetContent", "recover"])
  })
})

describe("등록되지 않은 칸은 **없는 것으로 치고 떨어진다**", () => {
  it("스크롤을 등록하지 않은 고장난 탭은 3번을 건너뛰고 복구로 간다", () => {
    /* 지도가 죽은 식당 탭이 정확히 이 모양이다 — 되돌릴 지도가 없어 `content` 를
       등록하지 않고, 그래서 사다리가 다음 칸(다시 시도)으로 떨어진다. */
    const { calls, target } = screen({ broken: true })
    expect(target.content).toBeUndefined()
    const step = runTabReset({ target, popToRoot: null })
    expect(step).toBe<TabResetStep>("recover")
    expect(calls).toEqual(["recover"])
  })

  it("멀쩡한데 스크롤도 없는 탭은 조용히 끝난다 — 진동만 오지 않게", () => {
    const { calls, target } = screen({})
    expect(target.recover).toBeUndefined()
    expect(runTabReset({ target, popToRoot: null })).toBe<TabResetStep>("none")
    expect(calls).toEqual([])
  })

  it("아무것도 등록하지 않은 탭은 조용히 끝난다 — 던지지 않는다", () => {
    const step = runTabReset({ target: null, popToRoot: null })
    expect(step).toBe<TabResetStep>("none")
  })

  it("등록이 통째로 없어도 탭 안 루트 복귀는 여전히 선다", () => {
    const popped: string[] = []
    const step = runTabReset({
      target: null,
      popToRoot: () => popped.push("popToRoot"),
    })
    expect(step).toBe<TabResetStep>("popToRoot")
    expect(popped).toEqual(["popToRoot"])
  })

  it("판정 함수가 던지면 그 능력만 없는 것으로 친다 — 탭 바가 죽지 않는다", () => {
    const { calls, target } = screen({
      throwOnProbe: true,
      atRoot: true,
      broken: true,
    })
    const step = runTabReset({ target, popToRoot: null })
    expect(step).toBe<TabResetStep>("recover")
    expect(calls).toEqual(["recover"])
  })
})

describe("전 조합 — 어떤 입력에도 부수효과는 한 개 이하다", () => {
  const axes = [false, true]

  it("네 축을 전부 세어도 실행되는 것은 언제나 0개 또는 1개이고, 그것은 판정과 같다", () => {
    let seen = 0
    for (const overlayOpen of axes) {
      for (const away of axes) {
        for (const atRoot of [undefined, false, true] as const) {
          for (const broken of axes) {
            seen += 1
            const { calls, target } = screen({
              overlayOpen,
              atRoot,
              broken,
            })
            const popped: string[] = []
            const request = {
              target,
              popToRoot: away ? () => popped.push("popToRoot") : null,
            }
            const expected = resolveTabResetStep(readTabResetFacts(request))
            const step = runTabReset(request)

            expect(step).toBe(expected)
            const performed = [...calls, ...popped]
            expect(performed.length).toBeLessThanOrEqual(1)
            expect(performed).toEqual(step === "none" ? [] : [step])
          }
        }
      }
    }
    // 축이 줄어들면(조합을 빼먹으면) 이 수가 떨어진다.
    expect(seen).toBe(2 * 2 * 3 * 2)
  })
})

describe("판정 자체(순수 함수)", () => {
  const facts = (over: Partial<TabResetFacts> = {}): TabResetFacts => ({
    overlayOpen: false,
    awayFromTabRoot: false,
    contentAwayFromRoot: false,
    canRecover: false,
    ...over,
  })

  it("네 사실이 전부 참이면 가장 위 칸이 이긴다", () => {
    expect(
      resolveTabResetStep(
        facts({
          overlayOpen: true,
          awayFromTabRoot: true,
          contentAwayFromRoot: true,
          canRecover: true,
        }),
      ),
    ).toBe<TabResetStep>("closeOverlay")
  })

  it("아래 세 개만 참이면 두 번째 칸", () => {
    expect(
      resolveTabResetStep(
        facts({
          awayFromTabRoot: true,
          contentAwayFromRoot: true,
          canRecover: true,
        }),
      ),
    ).toBe<TabResetStep>("popToRoot")
  })

  it("스크롤과 복구만 남으면 스크롤이 먼저다", () => {
    expect(
      resolveTabResetStep(
        facts({ contentAwayFromRoot: true, canRecover: true }),
      ),
    ).toBe<TabResetStep>("resetContent")
  })

  it("아무 사실도 없으면 아무 것도 하지 않는다", () => {
    expect(resolveTabResetStep(facts())).toBe<TabResetStep>("none")
  })

  it("`popToRoot` 가 `null` 이면 탭 안 루트라는 뜻이다", () => {
    expect(readTabResetFacts({ target: null, popToRoot: null })).toEqual({
      overlayOpen: false,
      awayFromTabRoot: false,
      contentAwayFromRoot: false,
      canRecover: false,
    })
    expect(
      readTabResetFacts({ target: null, popToRoot: () => {} }).awayFromTabRoot,
    ).toBe(true)
  })
})

describe("등록소 — 한 라우트에 여러 벌이 **합쳐진다**", () => {
  it("라우트 파일과 그 안의 화면이 각자 등록해도 둘 다 산다", () => {
    /* 홈이 정확히 이 모양이다: 달력 시트는 `app/(tabs)/home.tsx`, 스크롤·새로고침은
       그 아래 `RecordView`. 덮어쓰기로 두면 마운트 순서에 따라 한쪽이 사라진다. */
    const registry = createTabResetRegistry()
    const overlayCalls: string[] = []
    const contentCalls: string[] = []
    registry.register("home", {
      content: {
        isAtRoot: () => false,
        reset: () => contentCalls.push("resetContent"),
      },
    })
    registry.register("home", {
      overlay: {
        isOpen: () => true,
        close: () => overlayCalls.push("closeOverlay"),
      },
    })

    const merged = registry.resolve("home")
    expect(merged?.overlay).toBeDefined()
    expect(merged?.content).toBeDefined()

    expect(runTabReset({ target: merged, popToRoot: null })).toBe(
      "closeOverlay",
    )
    expect(overlayCalls).toEqual(["closeOverlay"])
    expect(contentCalls).toEqual([])
  })

  it("같은 능력을 둘이 등록하면 **나중에 등록한 것**이 이긴다", () => {
    const registry = createTabResetRegistry()
    const order: string[] = []
    registry.register("recipe", { recover: () => order.push("first") })
    registry.register("recipe", { recover: () => order.push("second") })
    registry.resolve("recipe")?.recover?.()
    expect(order).toEqual(["second"])
  })

  it("해제는 **자기 것만** 지운다 — 남의 등록이 같이 사라지지 않는다", () => {
    const registry = createTabResetRegistry()
    const order: string[] = []
    const releaseFirst = registry.register("all", {
      recover: () => order.push("first"),
    })
    registry.register("all", { recover: () => order.push("second") })
    releaseFirst()
    registry.resolve("all")?.recover?.()
    expect(order).toEqual(["second"])
  })

  it("두 번 해제해도 살아 있는 등록을 지우지 않는다", () => {
    /* 같은 대리 객체가 두 번 등록될 수 있으므로(리마운트) `indexOf` 만 믿으면
       두 번째 해제가 **다른 등록**을 지운다. */
    const registry = createTabResetRegistry()
    const order: string[] = []
    const target: TabResetTarget = { recover: () => order.push("kept") }
    const release = registry.register("all", target)
    registry.register("all", target)
    release()
    release()
    registry.resolve("all")?.recover?.()
    expect(order).toEqual(["kept"])
  })

  it("등록을 전부 해제하면 그 라우트는 다시 비어 있다", () => {
    const registry = createTabResetRegistry()
    const release = registry.register("restaurant", { recover: () => {} })
    expect(registry.resolve("restaurant")).not.toBeNull()
    release()
    expect(registry.resolve("restaurant")).toBeNull()
  })

  it("등록되지 않은 라우트는 `null` 이다 — 다른 탭의 리셋이 새지 않는다", () => {
    const registry = createTabResetRegistry()
    registry.register("home", { recover: () => {} })
    expect(registry.resolve("recipe")).toBeNull()
  })
})

describe("맨 위 판정", () => {
  it("바운스가 남긴 아주 작은 값은 맨 위로 친다", () => {
    expect(isAtScrollTop(0)).toBe(true)
    expect(isAtScrollTop(SCROLL_TOP_EPSILON_PT)).toBe(true)
    // 안드로이드 오버스크롤이 남기는 음수.
    expect(isAtScrollTop(-12)).toBe(true)
  })

  it("한 줄만 내려가도 맨 위가 아니다 — 아니면 3번이 스크롤을 건너뛴다", () => {
    expect(isAtScrollTop(SCROLL_TOP_EPSILON_PT + 0.5)).toBe(false)
    expect(isAtScrollTop(240)).toBe(false)
  })

  it("측정값이 없으면(NaN) 맨 위로 친다 — 눌러도 아무 일 없는 탭이 되지 않게", () => {
    expect(isAtScrollTop(Number.NaN)).toBe(true)
  })
})
