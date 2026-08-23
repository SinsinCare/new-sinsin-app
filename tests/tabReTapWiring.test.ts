/**
 * **탭 바가 사다리를 실제로 돌리는가.** 대상: `app/(tabs)/_layout.tsx`
 *
 * 규칙 자체는 `tests/tabReset.test.ts` 가 조합으로 센다. 여기서 보는 것은 그 규칙이
 * **화면에 연결돼 있는가** 다 — 판정만 초록이고 탭 바는 예전처럼 `return` 하고 있는
 * 상태가 이 저장소에서 가장 흔한 종류의 거짓 초록이다.
 *
 * 렌더러가 없으므로 레이아웃 함수를 그대로 부르고, `Tabs` 의 `tabBar` 프롭을 호출해
 * 바를 만든 뒤, `V2TabBar` 가 받은 `onChange` 를 **손가락 대신 부른다.**
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

jest.mock("react-native", () => ({
  StyleSheet: { create: <T>(styles: T): T => styles },
  View: "View",
}))

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => [
    typeof initial === "function" ? (initial as () => unknown)() : initial,
    () => {},
  ],
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (fn: unknown) => fn,
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: () => {},
}))

jest.mock("expo-router", () => {
  /* `Tabs` 는 문자열 태그로 두되 `Tabs.Screen` 도 필요하다(레이아웃이 자식으로 쓴다).
     문자열에는 속성을 못 붙이므로 함수 객체를 쓴다 — 트리에서는 `type` 정체로 찾는다. */
  const Tabs = Object.assign(() => null, { Screen: () => null })
  return { Tabs, usePathname: () => "/community" }
})
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/src/design-system-v2", () => ({
  V2TabBar: "V2TabBar",
  tabBarBackdrop: () => "#000000",
  useV2Theme: () => ({
    colors: { background: { default: "#ffffff", lower: "#f7f7f7" } },
    mode: "light",
  }),
}))
jest.mock("@/src/shared/components/FloatingAiButton", () => ({
  FLOATING_AI_BUTTON_BOTTOM: 16,
  FloatingAiButton: "FloatingAiButton",
}))
jest.mock("@/src/shared/utils/bottomSafeArea", () => ({ TAB_BAR_HEIGHT: 62 }))
jest.mock("@/src/lib/haptics", () => ({ hapticSelection: jest.fn() }))

/*
  사다리(`runTabReset`)는 **진짜**다 — 그것이 이 파일이 확인하려는 배선의 절반이다.
  등록소만 테스트가 들고 있는 것으로 갈아 끼운다(provider 는 렌더러 없이 못 돈다).
*/
jest.mock("@/src/shared/navigation", () => ({
  runTabReset: jest.requireActual("@/src/shared/navigation/tabReset")
    .runTabReset,
  TabResetProvider: "TabResetProvider",
  useTabResetRegistry: () => mockRegistry,
}))

import { Tabs } from "expo-router"
import { hapticSelection } from "@/src/lib/haptics"
import {
  createTabResetRegistry,
  type TabResetRegistry,
} from "@/src/shared/navigation/tabReset"
import TabLayout from "@/app/(tabs)/_layout"

let mockRegistry: TabResetRegistry | null = null

type Element = { type: unknown; props: Record<string, unknown> }
const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

/** 트리를 훑는다. **함수 컴포넌트는 본문을 호출해 펼친다**(`tabBar` 가 그 모양이다). */
function walk(element: Element): Element[] {
  if (typeof element.type === "function") {
    const out = (element.type as (props: unknown) => unknown)(element.props)
    return isElement(out) ? [element, ...walk(out)] : [element]
  }
  const raw = element.props.children
  const list = (Array.isArray(raw) ? raw.flat(Infinity) : [raw]).filter(
    isElement,
  )
  return list.reduce<Element[]>(
    (acc, child) => [...acc, ...walk(child)],
    [element],
  )
}

/** 레이아웃 → `Tabs` 의 `tabBar` 프롭 → 바 → `V2TabBar` 의 `onChange`. */
function tabBarChange(
  focusedRoute: string,
  navigation: { navigate: jest.Mock },
) {
  const layout = TabLayout() as unknown
  expect(isElement(layout)).toBe(true)
  const tabs = walk(layout as Element).find((el) => el.type === Tabs)
  expect(tabs).toBeDefined()
  const renderBar = tabs?.props.tabBar as (props: unknown) => unknown
  const bar = renderBar({
    state: { index: 0, routes: [{ name: focusedRoute, key: focusedRoute }] },
    navigation,
  })
  expect(isElement(bar)).toBe(true)
  const v2 = walk(bar as Element).find((el) => el.type === "V2TabBar")
  expect(v2).toBeDefined()
  return {
    value: v2?.props.value as string,
    onChange: v2?.props.onChange as (value: string) => void,
  }
}

beforeEach(() => {
  mockRegistry = createTabResetRegistry()
  ;(hapticSelection as jest.Mock).mockClear()
})

describe("다른 탭을 누르면 예전과 똑같이 이동한다", () => {
  it("`navigate` 한 번 — 사다리는 끼어들지 않는다", () => {
    const navigation = { navigate: jest.fn() }
    const calls: string[] = []
    mockRegistry?.register("community", {
      content: { isAtRoot: () => false, reset: () => calls.push("reset") },
    })
    const { onChange } = tabBarChange("community", navigation)
    onChange("recipe")
    expect(navigation.navigate).toHaveBeenCalledWith("recipe")
    expect(calls).toEqual([])
  })
})

describe("보고 있는 탭을 다시 누르면", () => {
  it("**이동하지 않는다** — 그 자리에서 등록된 리셋 하나가 돈다", () => {
    /* 종전에는 여기서 그냥 반환했다(아무 일도 없음). `navigate` 를 부르는 것도
       똑같이 틀렸다 — 스택이 초기화돼 스크롤이 튄다. */
    const navigation = { navigate: jest.fn() }
    const calls: string[] = []
    mockRegistry?.register("recipe", {
      content: { isAtRoot: () => false, reset: () => calls.push("reset") },
      recover: () => calls.push("recover"),
    })
    const { onChange } = tabBarChange("recipe", navigation)
    onChange("recipe")
    expect(navigation.navigate).not.toHaveBeenCalled()
    expect(calls).toEqual(["reset"])
  })

  it("**맨 위였으면 아무 일도 안 한다** — 탭이 데이터를 갈아치우지 않는다", () => {
    /*
      2026-08-21 에 뒤집힌 결정. 예전 단언은 `["refresh"]` 였고, 그것이 실기기에서
      "다시 누르면 새로고침 스피너까지 간다" 로 나왔다. 멀쩡한 화면은 3번에서 끝난다
      (`tabReset.ts` §4번 — 새로고침은 당김의 일이다).
    */
    const navigation = { navigate: jest.fn() }
    const calls: string[] = []
    mockRegistry?.register("recipe", {
      content: { isAtRoot: () => true, reset: () => calls.push("reset") },
    })
    const { onChange } = tabBarChange("recipe", navigation)
    onChange("recipe")
    expect(calls).toEqual([])
    expect(hapticSelection).not.toHaveBeenCalled()
  })

  it("**계속 눌러도** 멀쩡한 화면에서는 아무 일이 없다 — 햅틱도 없다", () => {
    /* 3번의 스크롤 리셋이 기억한 오프셋을 동기적으로 0 으로 쓰기 때문에(그 쓰기는
       늦게 온 `onScroll` 이 옛 위치를 되살리는 다른 결함을 막는다) 두 번째 탭은
       곧바로 "맨 위" 를 본다. 그 자리가 `"none"` 이어야 한다. */
    const navigation = { navigate: jest.fn() }
    const calls: string[] = []
    let atTop = false
    mockRegistry?.register("recipe", {
      content: {
        isAtRoot: () => atTop,
        reset: () => {
          calls.push("reset")
          atTop = true
        },
      },
    })
    const { onChange } = tabBarChange("recipe", navigation)
    onChange("recipe")
    onChange("recipe")
    onChange("recipe")
    expect(calls).toEqual(["reset"])
    // 첫 걸음 하나에만 진동이 붙는다.
    expect(hapticSelection).toHaveBeenCalledTimes(1)
  })

  it("고장난 화면에서만 4번(복구)이 돈다", () => {
    const navigation = { navigate: jest.fn() }
    const calls: string[] = []
    mockRegistry?.register("recipe", {
      content: { isAtRoot: () => true, reset: () => calls.push("reset") },
      recover: () => calls.push("recover"),
    })
    const { onChange } = tabBarChange("recipe", navigation)
    onChange("recipe")
    expect(calls).toEqual(["recover"])
  })

  it("아무도 등록하지 않은 탭에서도 던지지 않는다", () => {
    const navigation = { navigate: jest.fn() }
    const { onChange } = tabBarChange("home", navigation)
    expect(() => onChange("home")).not.toThrow()
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it("아무 일도 안 일어났으면 **햅틱도 없다** — 진동만 오면 '눌렸는데 안 먹었다' 다", () => {
    const navigation = { navigate: jest.fn() }
    const { onChange } = tabBarChange("home", navigation)
    onChange("home")
    expect(hapticSelection).not.toHaveBeenCalled()
  })

  it("한 걸음이라도 밟았으면 햅틱을 준다", () => {
    const navigation = { navigate: jest.fn() }
    mockRegistry?.register("home", { recover: () => {} })
    const { onChange } = tabBarChange("home", navigation)
    onChange("home")
    expect(hapticSelection).toHaveBeenCalledTimes(1)
  })
})

describe("인기글은 커뮤니티 탭 **안**이다", () => {
  it("인기글을 보는 동안 탭 바는 `커뮤니티` 를 켠다", () => {
    const { value } = tabBarChange("community-popular", { navigate: jest.fn() })
    expect(value).toBe("community")
  })

  it("거기서 `커뮤니티` 를 누르면 **피드로 돌아온다**(사다리 2번)", () => {
    const navigation = { navigate: jest.fn() }
    const { onChange } = tabBarChange("community-popular", navigation)
    onChange("community")
    expect(navigation.navigate).toHaveBeenCalledWith("community")
  })

  it("루트 복귀가 스크롤보다 먼저다 — 인기글 화면의 리셋은 돌지 않는다", () => {
    const navigation = { navigate: jest.fn() }
    const calls: string[] = []
    mockRegistry?.register("community-popular", {
      content: { isAtRoot: () => false, reset: () => calls.push("reset") },
    })
    const { onChange } = tabBarChange("community-popular", navigation)
    onChange("community")
    expect(navigation.navigate).toHaveBeenCalledWith("community")
    expect(calls).toEqual([])
  })

  it("등록은 **탭 이름이 아니라 focus 된 라우트**로 찾는다", () => {
    /*
      두 화면은 같은 탭이지만 등록은 각자 자기 라우트 이름으로 한다. 조회를 탭 이름
      (`커뮤니티`)으로 하면 인기글을 보는 동안 **피드 화면의 시트**를 닫는다 —
      사용자 눈에는 아무 일도 안 일어난다(보이지 않는 화면에서 뭔가 닫혔다).
      탭 네비게이터는 둘 다 마운트한 채 들고 있으므로 실제로 닿는 경로다.
      1번(시트 닫기)이 2번(루트 복귀)보다 위라서 이 자리에서만 드러난다.
    */
    const navigation = { navigate: jest.fn() }
    const closed: string[] = []
    mockRegistry?.register("community", {
      overlay: { isOpen: () => true, close: () => closed.push("feed") },
    })
    mockRegistry?.register("community-popular", {
      overlay: { isOpen: () => true, close: () => closed.push("popular") },
    })
    const { onChange } = tabBarChange("community-popular", navigation)
    onChange("community")
    expect(closed).toEqual(["popular"])
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it("뒤에 마운트된 채 남은 화면의 리셋이 새지 않는다", () => {
    const navigation = { navigate: jest.fn() }
    const calls: string[] = []
    mockRegistry?.register("community", {
      content: { isAtRoot: () => false, reset: () => calls.push("feed") },
    })
    mockRegistry?.register("community-popular", {
      content: { isAtRoot: () => false, reset: () => calls.push("popular") },
    })
    const { onChange } = tabBarChange("community", navigation)
    onChange("community")
    expect(calls).toEqual(["feed"])
  })
})
