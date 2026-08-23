/**
 * **라이트 모드 가시성 감사** — "이런 식으로 가시성 떨어지는 컴포넌트·텍스트"(2026-08-21 사용자 지적).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 색 **이름**이 아니라 **숫자**를 단언하나
 *
 * `expect(color).toBe(light.label.neutral)` 은 토큰 값이 바뀌는 날 헛돈다 — 이름이 같은
 * 채로 안 읽히게 될 수 있다. 여기서는 컴포넌트가 실제로 내놓은 색을 **그 색이 앉는
 * 바닥 위에서** 계산해 WCAG 문턱과 비교한다. 계산기는 `tests/helpers/contrast.ts` 한 벌이고,
 * §0 이 그 계산기가 진짜로 계산하는지(늘 통과하는 계산기가 아닌지) 먼저 시험한다.
 *
 * ■ 왜 라이트만 문제였나 — 흰색 근처에서 같은 스텝이 더 작다
 *
 * v2 label 사다리는 알파다. 다크에서 `#65676a` 계열 한 단은 어두운 바닥 위에서 넉넉한
 * 명도차가 되지만, 라이트에서 같은 알파는 흰 바닥 위에서 훨씬 작은 차가 된다. 면도 그랬다 —
 * 라이트의 바닥↔카드가 ΔL* 3.8, 다크는 8.6 으로 **두 배 이상** 차이났다. "다크는 자연스러운데
 * 라이트만 안 읽힌다" 의 출처가 이 비대칭이고, 그래서 감사도 라이트가 기준이다.
 * 면 쪽은 2026-08-21 에 고쳤다(3.79 → 7.25) — §6 이 그 표를 들고 있다. 글자 쪽은 그대로다.
 *
 * ■ 무엇을 보증하고 무엇을 안 하나
 *
 * 보증: 아래 §2 의 자리들이 **두 모드 모두** AA 를 넘는다는 것, §3 라이트를 고치다 다크가
 * 나빠지지 않았다는 것, §4 `SectionBand` 의 변경이 다크에서 **값이 같아 무해**하다는 것,
 * §5 다크 `label` 사다리가 `#65676a` 계열로 되돌아가지 않는다는 것,
 * §7 컨트롤면(`fill.control`)이 장식면(`fill.normal`)에서 갈린 채로 남는다는 것 —
 * 그 값이 왜 §6 처럼 "다크의 80%" 에 못 닿고 11% 에서 멈추는지까지 계산으로 남긴다.
 * 안 함: 앱 전체 훑기. 못 고친 자리는 §5 에 **측정값으로** 박아 둔다 — 보고서는 썩지만
 * 실패하는 단언은 안 썩는다.
 *
 * ■ 왜 다크까지 여기서 재나 — 이 변경이 다크를 그 사다리에 **묶었다**
 *
 * 커뮤니티 컴포넌트들이 `assistive`/`alternative` 에서 `neutral` 로 옮겨 왔다. 그래서
 * 다크 `neutral` 이 무슨 값이냐가 **이제 커뮤니티 화면의 문제**다. 실제로 이 작업 중
 * 그 3단이 `#65676a` 계열(다크 본문 2.18:1)로 되돌아간 적이 있고, 그 상태에서는
 * 사용자가 "자연스럽다" 고 한 다크 화면이 조용히 나빠진다. §5 가 그 회귀를 잡는다.
 */
/* eslint-disable import/first -- RN 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

/*
  `communityPrimitives` · `v2CommunityGaps` 와 같은 수법이다: 렌더러 없이 **함수 컴포넌트를
  그대로 호출해** 돌려받은 트리를 읽는다. 흉내 낸 구현이 아니라 진짜 본문이 돌아야
  "컴포넌트가 실제로 그 색을 내놓는가" 를 물을 수 있다.
*/
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
  StyleSheet: {
    create: <T>(styles: T): T => styles,
    absoluteFillObject: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
}))
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "ko" } }),
}))
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
jest.mock("@/src/design-system-v2/components/V2Button", () => ({
  V2Button: "V2Button",
}))
jest.mock("@/src/features/analytics", () => ({ trackAnalyticsEvent: () => {} }))
/*
  §8 이 부르는 두 섹션(`TrendingPostsSection` · `NeighborSuggestionSection`)이 끌고 오는
  네이티브 의존만 끊는다. 여기서 보는 것은 **어느 면 위에 앉는가** 뿐이라 프롭이면 충분하다
  (`communityFeedSections.test.ts` 가 같은 자리에서 같은 셋을 끊는다).
*/
jest.mock("expo-image", () => ({ Image: "Image" }))
jest.mock("@/src/design-system-v2/components/V2Skeleton", () => ({
  V2Skeleton: "V2Skeleton",
  V2SkeletonGroup: "V2SkeletonGroup",
}))
/*
  가시성 문턱(delay 180 / minDuration 420)은 DS 의 계약이고 여기서 볼 것이 아니다.
  §8 은 **로딩 중에도 면이 안 바뀐다**를 물으므로 `isLoading` 을 그대로 통과시킨다.
*/
jest.mock("@/src/design-system-v2/hooks/useLoadingVisible", () => ({
  useLoadingVisible: (isLoading: boolean): boolean => isLoading,
}))
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))
// `V2EmptyState` 만 훅(useRef/useEffect)을 쓴다. 렌더러가 없으므로 그 둘만 대신한다.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useRef: <T>(initial: T) => ({ current: initial }),
  useEffect: (fn: () => void) => {
    fn()
  },
  // `V2Avatar` 의 "실패한 URL" 한 칸. 렌더러가 없으므로 초깃값으로 고정한다.
  useState: (initial: unknown) => [initial, () => {}],
}))

let mockMode: "light" | "dark" = "light"

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { resolveTheme } from "@/src/design-system-v2/theme"
import { primitives } from "@/src/design-system-v2/tokens/colors"
import { over as blendOver } from "@/src/design-system-v2/tokens/blend"
import { tokens } from "@/src/theme/tokens"
import { V2Chip } from "@/src/design-system-v2/components/V2Chip"
import { V2EmptyState } from "@/src/design-system-v2/components/V2EmptyState"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { getSurfacePalette } from "@/src/theme/surface"
import { MetaRow } from "@/src/features/recipe/components/community/MetaRow"
import { SectionBand } from "@/src/features/recipe/components/community/SectionBand"
import { SectionHeader } from "@/src/features/recipe/components/community/SectionHeader"
import {
  TRENDING_ROW_HEIGHT,
  TrendingPostsSection,
} from "@/src/features/recipe/components/community/TrendingPostsSection"
import {
  NEIGHBOR_SUGGESTION_ROW_HEIGHT,
  NeighborSuggestionSection,
} from "@/src/features/recipe/components/community/NeighborSuggestionSection"

import { AA, contrast, lightness, over } from "./helpers/contrast"
import { codeOnly } from "./helpers/codeOnly"

/** 알파 한 벌을 불투명 면에 **두 겹** 얹은 결과. §6 이 층의 깊이를 규칙으로 다시 센다. */
const over2 = (coat: string, bed: string) =>
  blendOver(coat, blendOver(coat, bed))

const THEME = {
  light: resolveTheme("light").colors,
  dark: resolveTheme("dark").colors,
}
type Mode = keyof typeof THEME
const MODES: Mode[] = ["light", "dark"]

/**
 * **각 모드에서 커뮤니티 피드의 바닥이 실제로 무슨 색인가.**
 *
 * 값을 여기 적지 않고 `app/(tabs)/community.tsx` 와 같은 식으로 **계산한다** —
 * 그 화면은 `surface.isDark ? surface.canvas : surface.surface` 로 바닥을 깐다.
 * 상수를 베껴 두면 화면이 바닥을 바꾸는 날 이 감사가 조용히 다른 색을 재게 된다.
 */
const bedOf = (mode: Mode): string => {
  const p = getSurfacePalette(mode === "dark")
  return mode === "dark" ? p.canvas : p.surface
}

/* ── 엘리먼트 트리 읽기 (`communityPrimitives` 와 같은 수법) ───────────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

function flatten(style: unknown): Style {
  if (typeof style === "function") {
    return flatten(
      (style as (s: { pressed: boolean }) => unknown)({ pressed: false }),
    )
  }
  if (Array.isArray(style)) {
    return style.reduce<Style>(
      (acc, item) => ({ ...acc, ...flatten(item) }),
      {},
    )
  }
  if (style && typeof style === "object") return { ...(style as Style) }
  return {}
}

function childrenOf(element: Element): Element[] {
  const raw = element.props.children
  const list = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return list.filter(isElement)
}

function walkDeep(element: Element): Element[] {
  if (typeof element.type === "function") {
    const out = (element.type as (props: unknown) => unknown)(element.props)
    return isElement(out) ? [element, ...walkDeep(out)] : [element]
  }
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walkDeep(child)],
    [element],
  )
}

const findAll = (root: Element, type: unknown): Element[] =>
  walkDeep(root).filter((el) => el.type === type)

function render<P>(component: (props: P) => unknown, props: P): Element {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

/** 한 모드에서 컴포넌트를 그린다. 모드는 테마 훅이 읽는 칸 하나로 정해진다. */
function inMode<T>(mode: Mode, body: () => T): T {
  mockMode = mode
  try {
    return body()
  } finally {
    mockMode = "light"
  }
}

afterEach(() => {
  mockMode = "light"
})

/* ═══════════════════════════ §0 오라클 ═══════════════════════════ */

describe("§0 대비 계산기가 실제로 계산한다", () => {
  /*
    이 절이 없으면 아래 전부가 무의미하다 — 늘 21 을 돌려주는 함수도 §2 를 통과시킨다.
    그래서 **답을 아는 입력**과 **틀리면 답이 달라지는 입력**을 같이 넣는다.
  */
  it("양 끝을 안다: 흰↔검 21, 같은 색 1", () => {
    expect(contrast("#ffffff", "#000000", "#ffffff")).toBeCloseTo(21, 6)
    expect(contrast("#123456", "#123456", "#ffffff")).toBeCloseTo(1, 6)
  })

  it("알파를 **무시하지 않는다** — 50% 검정은 검정이 아니다", () => {
    // 무시하면 21 이 나온다. 실제로 합성하면 흰 바닥 위에서 4.00 이다.
    expect(contrast("#00000080", "#ffffff", "#ffffff")).toBeCloseTo(4.004, 3)
    expect(contrast("#00000080", "#ffffff", "#ffffff")).not.toBeCloseTo(21, 1)
  })

  it("**바닥이 결과를 바꾼다** — 같은 두 색도 캔버스가 다르면 다르다", () => {
    // 같은 인자를 검은 캔버스에 얹으면 반투명 검정이 캔버스에 묻혀 21 로 벌어진다.
    expect(contrast("#00000080", "#ffffff", "#000000")).toBeCloseTo(21, 6)
  })

  it("고친 결함을 재현한다 — `label.assistive` 는 흰 면 위에서 1.68 이다", () => {
    /*
      이 숫자가 이 감사 전체의 출처다. 계산기가 헛돌면 여기가 1.68 이 아니라
      아무 값이나 된다. 토큰에서 읽어 오므로 값이 바뀌면 같이 따라간다.
    */
    expect(
      contrast(THEME.light.label.assistive, "#ffffff", "#ffffff"),
    ).toBeCloseTo(1.68, 2)
    expect(
      contrast(THEME.light.label.assistive, "#ffffff", "#ffffff"),
    ).toBeLessThan(AA.largeText)
  })

  it("L* 는 대비비와 **다른 것**을 잰다 — 흰 100 · 검 0", () => {
    expect(lightness("#ffffff")).toBeCloseTo(100, 6)
    expect(lightness("#000000")).toBeCloseTo(0, 6)
    // over() 가 합성한 값도 잴 수 있어야 §4 가 성립한다.
    expect(over("#ffffff", "#000000")).toEqual([1, 1, 1])
  })
})

/* ═══════════════════════ §1 라이트 label 사다리 ═══════════════════════ */

describe("§1 라이트에서 읽히는 글자단은 `neutral` 까지다", () => {
  /*
    감사의 결론을 사다리 자체에 대고 못 박는다. 아래 §2 의 모든 판단이 여기서 나온다:
    "한 단만 올린다"(assistive → alternative)로는 **아무것도 해결되지 않는다** —
    alternative 도 큰 글자 기준 3:1 밖이다.
  */
  const beds = () => ({
    "흰 면": THEME.light.background.default,
    "앱 바닥": bedOf("light"),
    "섹션 띠": THEME.light.background.lower,
  })

  it("`neutral` 은 라이트의 세 바닥 모두에서 본문 기준을 넘는다", () => {
    for (const [name, bed] of Object.entries(beds())) {
      const ratio = contrast(THEME.light.label.neutral, bed, bed)
      expect({ [name]: ratio >= AA.text }).toEqual({ [name]: true })
    }
  })

  it("`alternative` 는 **큰 글자 기준에도** 못 미친다 — 한 단 올리기로는 안 된다", () => {
    for (const bed of Object.values(beds())) {
      expect(contrast(THEME.light.label.alternative, bed, bed)).toBeLessThan(
        AA.largeText,
      )
    }
  })

  it("`assistive` 는 어떤 바닥 위에서도 2:1 을 못 넘는다 — 글자로 쓸 수 없다", () => {
    for (const bed of Object.values(beds())) {
      expect(contrast(THEME.light.label.assistive, bed, bed)).toBeLessThan(2)
    }
  })

  it("사다리는 단조롭다 — normal > neutral > alternative > assistive > disable", () => {
    const bed = bedOf("light")
    const ladder = (
      ["normal", "neutral", "alternative", "assistive", "disable"] as const
    ).map((rung) => contrast(THEME.light.label[rung], bed, bed))
    expect(ladder).toEqual([...ladder].sort((a, b) => b - a))
  })
})

/* ═══════════════════ §2 고친 자리 — 두 모드 모두 AA ═══════════════════ */

/** 렌더된 `V2Text` 의 색(프롭)과 `Text` 의 색(스타일)을 한 줄로 긁는다. */
function foregroundsOf(root: Element): string[] {
  return walkDeep(root)
    .flatMap((el) => [el.props.color, flatten(el.props.style).color])
    .filter((c): c is string => typeof c === "string" && c.startsWith("#"))
}

describe("§2 사용자가 짚은 세 자리가 두 모드 모두에서 읽힌다", () => {
  it('스토리 빈 레일의 한 줄 — `V2EmptyState tone="quiet"` 의 설명', () => {
    for (const mode of MODES) {
      const bed = bedOf(mode)
      const tree = inMode(mode, () =>
        render(V2EmptyState, {
          surface: "community_story" as const,
          tone: "quiet" as const,
          description: "오늘의 한 끼를 하루 동안 나눠요",
        }),
      )
      const [color] = foregroundsOf(tree)
      expect(typeof color).toBe("string")
      // 15 Medium 은 큰 글자가 아니다 — 본문 기준을 받아야 한다.
      expect({ mode, ok: contrast(color!, bed, bed) >= AA.text }).toEqual({
        mode,
        ok: true,
      })
    }
  })

  it("섹션 머리의 후행 어포던스 — `올리기 ›` 는 **말과 화살표가 같은 색**이다", () => {
    for (const mode of MODES) {
      const bed = bedOf(mode)
      const tree = inMode(mode, () =>
        render(SectionHeader, {
          title: "스토리",
          actionLabel: "올리기",
          onPress: () => {},
        }),
      )
      const label = findAll(tree, V2Text).at(-1)!.props.color as string
      const chevron = findAll(tree, "V2Icon")[0]!.props.color as string
      // 하나의 어포던스를 두 색으로 그리지 않는다 — 그게 원래 결함이었다.
      expect(chevron).toBe(label)
      // 글자는 본문 기준, 화살표는 비텍스트 기준. 둘 다 같은 색이므로 더 센 쪽을 받는다.
      expect({ mode, ok: contrast(label, bed, bed) >= AA.text }).toEqual({
        mode,
        ok: true,
      })
    }
  })

  it("카드의 보조 지표 — `MetaRow` 의 수·시각·글리프가 전부 읽힌다", () => {
    for (const mode of MODES) {
      const bed = bedOf(mode)
      const tree = inMode(mode, () =>
        render(MetaRow, {
          viewCount: 3291,
          likeCount: 541,
          commentCount: 77,
          timeText: "2시간 전",
        }),
      )
      const colors = foregroundsOf(tree)
      // 조회·좋아요·댓글·시각 넷 + 글리프 둘.
      expect(colors.length).toBeGreaterThanOrEqual(6)
      /*
        글리프도 본문 기준으로 받는다. 하트·말풍선은 장식이 아니라 **그 숫자가 무엇인지
        말하는 유일한 표시**이고, 어차피 옆 숫자와 같은 색이라 문턱을 나눌 이유가 없다.
      */
      const worst = Math.min(...colors.map((c) => contrast(c, bed, bed)))
      expect({ mode, ok: worst >= AA.text }).toEqual({ mode, ok: true })
      // 한 지표 = 한 색. 회색이 둘로 갈라져 있던 것이 원래 결함이다.
      expect(new Set(colors).size).toBe(1)
    }
  })
})

/* ═══════════════ §3 라이트를 고치다 다크를 깨지 않았다 ═══════════════ */

describe("§3 다크가 나빠지지 않았다", () => {
  /*
    절대 문턱이 아니라 **방향**을 단언한다. 이 저장소의 다크 label 사다리는 지금 자기
    주석과 어긋나 있어(`colors.ts` 의 `#65676a` 계열 vs 그 위 주석) 절대값이 흔들린다.
    그 판단은 사람 몫으로 남기고, 여기서는 "바꾼 선택이 바꾸기 전보다 **나쁘지 않다**" 만
    본다 — 어느 값이 들어와 있든 참이어야 하는 성질이다.
  */
  it.each(MODES)(
    "%s: `neutral` 은 그 자리에 있던 두 단보다 항상 낫다",
    (mode) => {
      const bed = bedOf(mode)
      const at = (rung: "neutral" | "alternative" | "assistive") =>
        contrast(THEME[mode].label[rung], bed, bed)
      expect(at("neutral")).toBeGreaterThan(at("alternative"))
      expect(at("neutral")).toBeGreaterThan(at("assistive"))
    },
  )

  it("`V2EmptyState` 의 두 톤은 이제 **같은 색**이다 — 다크에서도 갈라지지 않는다", () => {
    for (const mode of MODES) {
      const describeTone = (tone: "loud" | "quiet") =>
        inMode(mode, () =>
          foregroundsOf(
            render(V2EmptyState, {
              surface: "community_story" as const,
              ...(tone === "quiet"
                ? { tone: "quiet" as const }
                : { tone: "loud" as const, title: "제목" }),
              description: "설명",
            }),
          ),
        ).at(-1)
      expect(describeTone("quiet")).toBe(describeTone("loud"))
    }
  })
})

/* ═════════════════ §4 섹션 밴드 — 다크에는 무해하다 ═════════════════ */

describe("§4 `SectionBand` 의 여백에서 색을 뗀 것이 다크에 무해하다", () => {
  it("지운 색은 다크 바닥과 **값이 같다** — 그래서 다크는 한 픽셀도 안 바뀐다", () => {
    /*
      이 단언이 이 변경의 안전 근거 전부다. 지운 것은 `background.default` 였고,
      다크 화면 바닥은 `surface.canvas`(= 같은 토큰)다. 둘이 갈라지는 날 이 변경은
      다크에서 **경계 하나를 지우는 일**이 되므로, 그때 여기가 빨개져야 한다.
    */
    expect(THEME.dark.background.default).toBe(bedOf("dark"))
    // 라이트에서는 갈라진다 — 그래서 라이트에서만 줄무늬가 났다.
    expect(THEME.light.background.default).not.toBe(bedOf("light"))
  })

  it("여백은 자기 배경을 갖지 않는다 (자리 8px 은 두 모드 그대로다)", () => {
    for (const mode of MODES) {
      /*
        ⚠ `walkDeep` 도 **`inMode` 안에서** 돌려야 한다 — 트리를 펼치면서 자식 함수
        컴포넌트(`V2Divider`)를 그때 호출하므로, 밖에서 돌리면 모드가 이미 되돌아가 있다.
      */
      const [wrap, strip] = inMode(mode, () => {
        const root = render(SectionBand, {})
        return [
          root,
          walkDeep(root)
            .filter((el) => el.type === "View")
            .at(-1)!,
        ] as const
      })
      expect(flatten(wrap.props.style).backgroundColor).toBeUndefined()
      // 리듬(16+8+8=32)은 안 바뀐다 — 줄이는 것은 면의 가짓수이지 간격이 아니다.
      expect({ mode, height: flatten(strip.props.style).height }).toEqual({
        mode,
        height: 8,
      })
    }
  })

  it("**띠는 다크에서만 칠해진다** — 재판정 (2026-08-22)", () => {
    /*
      2026-08-21 에는 여백만 손보고 띠는 뒀다. 그 뒤 §6(바닥 −7.25)과 §8((A) 블록이
      자기 면을 가짐)이 들어오면서 라이트에서 **띠 자신이** 줄무늬가 됐다:

          바닥 │ 띠 #f7f7f7 │ 바닥 │ (A) 블록 #ffffff │ 바닥 │ 띠 │ 바닥
              4.5 ┘    4.5 ┘     7.25 ┘        7.25 ┘    4.5 ┘  4.5 ┘

      경계가 여섯인데 필요한 것은 둘이고, `#f7f7f7` 은 그 화면에 없던 다섯째 회색이다.
      다크는 정반대다 — `background.default` 가 곧 바닥이라 블록이 면을 못 갖고,
      띠(#313135 = 그 화면의 카드와 같은 값)가 **유일한 경계**다.

      그래서 모드가 아니라 **관계**로 나눈다. 아래는 그 관계를 다시 계산해 맞춘다 —
      값을 베끼지 않으므로 어느 쪽 토큰이 움직여도 따라간다.
    */
    for (const mode of MODES) {
      const onlyEdge = THEME[mode].background.default === bedOf(mode)
      const strip = inMode(
        mode,
        () =>
          walkDeep(render(SectionBand, {}))
            .filter((el) => el.type === "View")
            .at(-1)!,
      )
      expect({
        mode,
        painted: flatten(strip.props.style).backgroundColor,
      }).toEqual({
        mode,
        painted: onlyEdge ? THEME[mode].background.lower : undefined,
      })
    }
    // 다크는 **한 픽셀도 안 바뀌었다** — 칠해진 값이 예전 그대로다.
    const darkStrip = inMode(
      "dark",
      () =>
        walkDeep(render(SectionBand, {}))
          .filter((el) => el.type === "View")
          .at(-1)!,
    )
    expect(flatten(darkStrip.props.style).backgroundColor).toBe("#313135")
  })

  it("라이트에서 이 컴포넌트가 만드는 경계가 **0** 이다 (넷 → 둘 → 0)", () => {
    /*
      경위: 처음엔 넷이었다(바닥│여백│띠│여백│바닥, 넷 다 ≤3.8 에 방향이 번갈아 —
      줄무늬). 여백에서 색을 떼어 둘로 줄었고(2026-08-21), 바닥이 내려가면서 그 둘이
      4.5 로 커졌다. 이제 띠에서도 색을 떼어 **0** 이다 — 라이트에서 섹션을 가르는 것은
      이 컴포넌트가 아니라 (A) 블록의 면(7.25)이다.

      단언은 값 표가 아니라 **컴포넌트가 실제로 내놓은 색**에 대고 한다. 띠를 되살리는
      변이(조건을 지우고 늘 칠하기)는 여기서 즉시 빨개진다.
    */
    const painted = inMode("light", () =>
      walkDeep(render(SectionBand, {}))
        .map((el) => flatten(el.props.style).backgroundColor)
        .filter((color) => typeof color === "string"),
    )
    expect(painted).toEqual([])

    // 그 자리를 대신 맡은 경계가 실제로 있다 — (A) 블록의 면 ↔ 바닥.
    const blockEdge = Math.abs(
      lightness(THEME.light.background.default) - lightness(bedOf("light")),
    )
    expect(blockEdge).toBeCloseTo(7.25, 1)

    // 다크에는 그 대체 경계가 **없다**(블록이 바닥과 같은 면). 그래서 다크는 띠를 지킨다.
    expect(
      Math.abs(
        lightness(THEME.dark.background.default) - lightness(bedOf("dark")),
      ),
    ).toBe(0)
    const darkEdge = Math.abs(
      lightness(THEME.dark.background.lower) - lightness(bedOf("dark")),
    )
    expect(darkEdge).toBeCloseTo(8.63, 1)
  })
})

/* ═══════════════ §5 못 고친 것 — 측정값으로 박아 둔다 ═══════════════ */

describe("§5 못 고친 것과 되돌아가면 안 되는 것 (보고서 대신 단언으로 남긴다)", () => {
  /*
    아래는 **토큰 값**을 건드리지 않고는 못 고치는 자리들이다. 값은 233개 파일이 보므로
    이번 지시의 범위 밖이다. 지금 상태를 숫자로 박아 두면, 누가 고치는 순간 이 단언이
    빨개지면서 "고쳤으니 여기도 옮겨라" 라고 말한다 — 조용히 낡는 문서보다 낫다.
  */
  it("미선택 칩의 면은 **여전히** 비텍스트 3:1 밖이다 (좋아졌지만 못 넘었다)", () => {
    /*
      ─── 2026-08-21: 이 자리는 §7 로 옮겨 갔다 ───────────────────────────────────
      칩 면은 `fill.normal` → `fill.control` 로 옮겨 ΔL* 3.79 → 5.25 가 됐다(§7).
      그래도 **여기는 여전히 참이다** — 흰색 근처에서 대비비는 압축돼서, 5.25 짜리
      명도차도 비텍스트 문턱(3:1)에는 한참 못 미친다(1.14). 알약 윤곽이 WCAG 의
      비텍스트 기준을 넘으려면 면이 아니라 **테두리**를 그려야 하는데, 앱 전체가
      보더리스이고 그 결정은 이 변경의 범위 밖이다(`V2Chip` 머리말).
      즉 이 절이 지키는 것은 "아직 못 넘었다" 는 사실이고, "얼마나 좋아졌는가" 는 §7 이다.
    */
    const bed = THEME.light.background.default // 칩 레일은 흰 고정헤더 위에 산다
    const tree = inMode("light", () =>
      render(V2Chip, { label: "전체", size: "s" as const }),
    )
    const face = flatten(tree.props.style).backgroundColor as string
    expect(contrast(face, bed, bed)).toBeLessThan(AA.nonText)
    // 다만 **글자**는 읽힌다 — 칩을 못 읽는 것이 아니라 알약 모양이 안 보이는 것이다.
    // 칩 면은 **알파**다 — 캔버스로 넘기면 안 된다. 글자와 면 둘 다 레일이 앉은 흰
    // 바닥 위에 합성해야 실제로 눈에 닿는 값이 나온다(헬퍼 머리말 §알파).
    const label = foregroundsOf(tree).at(-1)!
    expect(contrast(label, face, bed)).toBeGreaterThan(AA.text)
  })

  it("다크 `label` 사다리가 `#65676a` 계열로 **되돌아가지 않는다** (회귀 가드)", () => {
    /*
      이 절의 존재 이유: 이 감사가 커뮤니티의 보조 글자를 전부 `label.neutral` 로 옮겼다.
      그래서 다크 `neutral` 이 무슨 값이냐가 이제 **커뮤니티 화면의 문제**다.

      작업 중 실제로 두 번 되돌아갔던 값이 `#65676a` 계열이다 — 라이트용 어두운 회색이
      다크 칸에 잘못 들어간 것으로, 다크 바닥(#1f1f21) 위에서 본문이 2.18:1 이 된다.
      제목(`normal`)만 밝은 회색이라 **제목만 보이고 본문이 안 보이는** 화면이 된다.
      아래 첫 단언이 그 값을 직접 재서 "왜 안 되는지" 를 숫자로 남긴다 — 주석이 아니라
      계산이라, 값이 바뀌어도 근거가 안 썩는다.
    */
    const bed = bedOf("dark")
    const card = getSurfacePalette(true).card

    // (a) 되돌아갔던 값이 실제로 못 쓸 값이라는 재현.
    expect(contrast("#65676abd", bed, bed)).toBeCloseTo(2.18, 1)
    expect(contrast("#65676abd", bed, bed)).toBeLessThan(AA.text)

    // (b) 지금 값은 그 계열이 아니다.
    for (const rung of ["neutral", "alternative", "assistive"] as const) {
      expect(THEME.dark.label[rung].startsWith("#65676a")).toBe(false)
    }

    // (c) 그리고 실제로 읽힌다 — 본문은 바닥·카드 **양쪽**에서 4.5 를 넘어야 한다.
    //     커뮤니티는 두 면을 다 쓴다(전폭 행은 바닥, `PostListItem` 은 카드).
    for (const face of [bed, card]) {
      expect(
        contrast(THEME.dark.label.neutral, face, face),
      ).toBeGreaterThanOrEqual(AA.text)
    }
    /*
      아래 두 단은 본문이 아니다. 바닥 위 실측은 `alternative` 3.00 · `assistive` 3.57 인데,
      `alternative` 는 정확히는 **2.998** 로 큰 글자 기준(3:1) 바로 아래다 — 문턱을 넘었다고
      적으면 거짓이므로 그렇게 쓰지 않는다. 여기서 지키는 것은 다른 것이다:
      **`#65676a` 계열(1.68 · 1.52)로 무너지지 않는다.** 2.5 는 그 둘을 확실히 가르는 선이다.
    */
    for (const rung of ["alternative", "assistive"] as const) {
      expect(contrast(THEME.dark.label[rung], bed, bed)).toBeGreaterThan(2.5)
    }
    expect(contrast(THEME.dark.label.alternative, bed, bed)).toBeCloseTo(3.0, 2)
    expect(contrast(THEME.dark.label.assistive, bed, bed)).toBeCloseTo(3.57, 2)
  })

  it("스크림은 두 모드가 **같은 값**이다 — 다크만 56% 로 되돌아간 적이 있다", () => {
    /*
      `background.dim` 은 글자 대비가 아니라 **시트 뒤 화면이 얼마나 남는가** 다.
      다크만 `#1717198f`(56%)가 되면 뒤가 사실상 검게 덮여 "무엇 위에 열렸는지"가 사라진다.
    */
    expect(THEME.dark.background.dim).toBe(THEME.light.background.dim)
  })

  it("원시 알파 사다리는 **반올림이 위로**다 — 700·900 만 예외가 되지 않는다", () => {
    /*
      `b2`/`e5`(내림)로 되돌아간 적이 있다. 1/255 라 눈에는 안 보이지만, 같은 70% 를 쓰는
      `semanticLight.label.neutral` 의 합성이 시안 실측 rgb(105,106,109)에서 어긋난다
      (`restaurantDetailDensity`). 사다리 전체를 한 규칙으로 검사한다.
    */
    const expected = Object.fromEntries(
      [10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => [
        String(pct * 10),
        Math.round((pct / 100) * 255)
          .toString(16)
          .padStart(2, "0"),
      ]),
    )
    for (const [family, base] of [
      ["opacityWhite", "ffffff"],
      ["opacityBlack", "000000"],
    ] as const) {
      const table = primitives[family] as Record<string, string>
      for (const [step, alpha] of Object.entries(expected)) {
        expect({ family, step, hex: table[step] }).toEqual({
          family,
          step,
          hex: `#${base}${alpha}`,
        })
      }
    }
  })

  /*
    여기 있던 "라이트의 바닥↔콘텐츠 한 단은 다크의 절반도 안 된다" 는 **고쳐졌다.**
    (3.79 → 7.25, 다크의 84%.) 그 자리는 §6 이 표로 받아 갔다 — 못 고친 것을 적어 두는
    이 절에 남겨 두면 다음 사람이 아직 못 고친 줄 안다.
  */
})

/* ═══════════════ §6 면의 층 — 라이트가 다크와 같은 문법을 갖는다 ═══════════════ */

describe("§6 면의 층 (2026-08-21 · 라이트 바닥을 두 겹으로 내렸다)", () => {
  /*
    ■ 무엇이 문제였나

    라이트의 모든 면이 명도 4 안에 뭉쳐 있었다. 바닥↔카드 **ΔL* 3.79** 인데 다크는
    8.63 이다. 그래서 (1) 흰 고정 헤더가 흰 카드와 같은 평면으로 보이고, (2) 카드 사이
    10pt 틈과 좌우 20pt 인셋의 바닥이 안 잡혀서 **바닥이 통째로 드러나는 유일한 구역**
    (스토리 레일)만 구멍처럼 읽혔다(2026-08-21 사용자 지적).

    ■ 무엇을 고쳤나 — 값이 아니라 **규칙**을 같게 했다

    `theme/surface.ts` 의 우물(`well`)이 두 모드에서 다른 깊이였다: 다크는 `card` 가
    이미 한 겹이라 바닥에서 **두 겹**, 라이트는 `card` 가 바닥과 같은 흰색이라 **한 겹**.
    이제 두 모드 모두 `background.default` 에서 `fill.normal` 두 겹이다.
    다크는 한 바이트도 안 움직이고(아래 스냅숏), 라이트만 내려온다.

    ■ 무엇을 **안** 고쳤나

    v2 라이트 시맨틱은 한 값도 안 바꿨다. `fill.normal` 을 흰 면에 한 겹 얹은 `#f4f4f5`
    는 식당 상세의 시안 실측이고(`restaurantDetailDensity` · `restaurantDetailFlatSurface`),
    커뮤니티 재디자인 스펙도 미선택 칩 면을 그 토큰으로 못 박았다
    (`communityFilterPrimitives` · `communityPrimitives` · `v2CommunityGaps`).
    그래서 **칩 면은 여전히 흰 면 위에서 1.10 이다** — 위 §5 첫 항목이 그 자리를 지킨다.
  */
  const step = (a: string, b: string) => Math.abs(lightness(a) - lightness(b))

  const bedLight = bedOf("light")
  const bedDark = bedOf("dark")
  const cardLight = getSurfacePalette(false).card
  const cardDark = getSurfacePalette(true).card

  it("바닥↔카드: 라이트가 다크의 80% 이상이다 (3.79 → 7.25 · 다크 8.63)", () => {
    /*
      **이 한 줄이 이 변경의 목표다.** 절대값이 아니라 다크 대비 비율로 잡는 이유:
      "적당히 진하게" 를 막으면서도, 다크가 바뀌면(바뀌면 안 되지만) 같이 따라가야
      하기 때문이다. 0.8 은 지금 실측 7.25/8.63 = 0.84 바로 아래다 — 한 겹을 도로
      빼면 3.79/8.63 = 0.44 가 되어 즉시 빨개진다.
    */
    const light = step(bedLight, cardLight)
    const dark = step(bedDark, cardDark)
    expect(dark).toBeCloseTo(8.63, 1)
    expect(light).toBeCloseTo(7.25, 1)
    expect(light / dark).toBeGreaterThanOrEqual(0.8)
  })

  it("고정 헤더는 두 모드 모두 **바닥과 다른 평면**이다", () => {
    /*
      커뮤니티의 고정층(검색 + 칩 레일)은 `colors.background.default` 를 칠한다
      (`FreePostTab.pinnedHeader` · `CategoryChipRail`). 다크에서는 그것이 바닥과 같은
      값이라 층이 0 이고, 대신 **카드가 떠서** 스크롤이 헤더 밑으로 지나는 것이 보인다.
      라이트에서는 반대로 헤더가 흰 카드 평면이고 **바닥이 내려가서** 같은 일이 일어난다.
      두 모드 다 "헤더와 바닥이 다른 평면" 이면 성립한다 — 어느 쪽이 위인지는 다르다.
    */
    const headerLight = THEME.light.background.default
    const headerDark = THEME.dark.background.default
    // 라이트: 헤더는 카드 평면, 바닥이 7.25 아래.
    expect(headerLight).toBe(cardLight)
    expect(step(headerLight, bedLight)).toBeGreaterThanOrEqual(7)
    // 다크: 헤더는 바닥 평면, 카드가 8.63 위.
    expect(headerDark).toBe(bedDark)
    expect(step(headerDark, cardDark)).toBeGreaterThanOrEqual(7)
  })

  it("우물은 **두 모드 모두** 바닥에서 `fill.normal` 두 겹이다 (규칙이 하나다)", () => {
    /*
      값을 베끼지 않고 규칙을 다시 계산해 맞춘다. 어느 한쪽만 한 겹으로 되돌리면
      여기가 빨개진다 — 그게 이 결함의 원래 모양이었다.
    */
    for (const mode of MODES) {
      const twoCoats = over2(
        THEME[mode].fill.normal,
        THEME[mode].background.default,
      )
      expect({
        mode,
        well: getSurfacePalette(mode === "dark").surface,
      }).toEqual({ mode, well: twoCoats })
    }
  })

  it("검색 필드의 면이 흰 고정 헤더 위에서 보인다 (3.79 → 7.25)", () => {
    /*
      `FreePostTab` 의 검색 입구는 `surface.surface` 를 깐다. 그 줄이 앉는 바닥은
      고정층의 면(`background.default`)이지 화면 바닥이 아니다 — 흰 위의 흰 칸이
      되지 않게 하는 것이 그 자리의 전부다.
    */
    expect(
      step(getSurfacePalette(false).surface, THEME.light.background.default),
    ).toBeGreaterThanOrEqual(7)
  })

  it("라이트 바닥은 앱 전체에서 **하나**다 — tamagui `appBg` 도 같은 값", () => {
    /*
      홈 탭 껍데기(`app/(tabs)/home.tsx`)는 tamagui `appBg`, 그 안의 기록 화면
      (`RecordView`)은 `surface.surface` 를 깔았다. 예전엔 #f7f7f7 과 #f4f4f5 로
      **같은 화면에서 두 회색이 만났다.** 바닥이 깊어진 지금 그 어긋남은 눈에 보인다.
    */
    expect(tokens.color.appBg.val).toBe(getSurfacePalette(false).surface)
  })

  it("층 사다리는 라이트에서 단조롭다 — 카드 > 얕은 우물 > 우물 > 눌림", () => {
    const p = getSurfacePalette(false)
    const ladder = [p.card, p.surfaceSunken, p.surface, p.surfacePressed].map(
      lightness,
    )
    expect(ladder).toEqual([...ladder].sort((a, b) => b - a))
    // 다크는 반대 방향이지만 **같은 순서**다(바닥에서 멀어질수록 위층).
    const d = getSurfacePalette(true)
    const darkLadder = [d.card, d.surfaceSunken, d.surface, d.surfacePressed]
      .map(lightness)
      .map((v) => -v)
    expect(darkLadder).toEqual([...darkLadder].sort((a, b) => b - a))
  })

  it("스토리 레일은 **두 모드 모두** 화면 바닥 위에 선다 (자기 면을 갖지 않는다)", () => {
    /*
      ■ (a) 스토리도 흰 면에 올린다 / (b) 바닥 그대로 둔다 — **(b) 를 골랐다.**

      다크에서 스토리 레일은 이미 바닥(`#1f1f21`) 위에 맨 채로 서 있고 카드만 떠 있다.
      사용자가 "자연스럽다" 고 한 화면이 바로 그것이다. 라이트에서 같은 배치가 구멍처럼
      보였던 것은 배치 때문이 아니라 **바닥이 안 보였기 때문**이다 — 카드 사이 10pt
      틈과 좌우 20pt 인셋이 ΔL* 3.79 라 바닥이 그 한 구역에서만 눈에 띄었다.
      바닥이 7.25 로 내려온 지금 틈과 인셋이 같은 회색을 말하므로, 그 구역은 구멍이
      아니라 "바닥" 으로 읽힌다.

      (a) 를 골랐으면 **라이트에만 있는 카드**가 생겨서 두 모드의 층 문법이 갈렸을
      것이다. 게다가 레일은 화면 끝까지 흐르는 가로 스크롤이라 그 면은 전폭 띠일 수밖에
      없고, 그러면 인셋 라운드 카드 옆에 두 번째 콘텐츠 면 모양이 생긴다.

      단언은 코드에 대고 한다 — 레일 루트가 배경을 칠하지 않는다는 것.
    */
    const src = codeOnly(
      readFileSync(
        resolve(__dirname, "../src/features/recipe/components/StoryRail.tsx"),
        "utf8",
      ),
    )
    const section = src.slice(src.indexOf("section: {"))
    expect(section.slice(0, section.indexOf("}"))).not.toContain(
      "backgroundColor",
    )
    // 레일 자신도 면을 세우지 않는다(타일의 스켈레톤 바탕만 모드별로 고른다).
    expect(src).not.toContain("styles.section, { backgroundColor")
  })

  it("**다크는 한 값도 안 바뀌었다** — `semanticDark` 전체 스냅숏", () => {
    /*
      사용자가 만족한다고 한 쪽이다. 라이트를 고치다 다크가 딸려 가는 것이 이 저장소가
      두 번 겪은 사고이므로(§5 의 `#65676a` · `dim`), 여기서는 세 단이 아니라 **표 전체**를
      값으로 못 박는다. 라이트 작업 중 다크 칸을 스치면 어느 칸이든 빨개진다.
    */
    expect(THEME.dark).toEqual({
      primary: {
        primary: "#fe7139",
        primaryWeak: "#282828",
        sub: "#fafbfe",
        subWeak: "#fafbfe52",
      },
      label: {
        normal: "#f9fafb",
        strong: "#ffffff",
        neutral: "#c2c4c8bd",
        alternative: "#aeb0b682",
        assistive: "#6b7684",
        disable: "#70737c33",
      },
      background: {
        default: "#1f1f21",
        lower: "#313135",
        dim: "#17171933",
        floated: "#1f1f21",
      },
      line: {
        normal: "#70737c52",
        neutral: "#70737c47",
        alternative: "#70737c38",
        strong: "#c2c4c885",
      },
      fill: {
        normal: "#70737c38",
        // 2026-08-21 에 **추가된 칸**이다(역할 분리). 값은 `normal` 과 같아서 다크는
        // 한 픽셀도 안 바뀌고, 이 줄은 "같은 값" 이라는 사실 자체를 못 박는다 —
        // 여기가 다른 값이 되면 다크 화면이 움직인 것이다.
        control: "#70737c38",
        background: "#70737c33",
        alternative: "#70737c1f",
        pressed: "#0220471f",
      },
      status: {
        positive: "#15c47e",
        cautionary: "#ffc06e",
        negative: "#ff6363",
      },
      static: { white: "#ffffff", black: "#000000", whiteWeak: "#ffffff00" },
      accentForeground: {
        red: "#ff8c8c",
        redXweak: "#ff63631a",
        redWeak: "#ff636333",
        orange: "#ff9200",
        orangeWeak: "#ff920033",
        yellow: "#ffcd38",
        yellowWeak: "#ffcd3833",
        pink: "#c934a6",
        pinkWeak: "#c934a633",
        blue: "#42bfe9",
        blueWeak: "#42bfe933",
        green: "#03b26c",
        greenWeak: "#03b26c33",
      },
    })
  })

  it("다크에서 **파생된 면들**도 그대로다 — 팔레트 스냅숏", () => {
    // 규칙(`derive`)을 건드렸으므로 값이 아니라 결과도 같이 못 박는다.
    const d = getSurfacePalette(true)
    expect({
      canvas: d.canvas,
      card: d.card,
      surface: d.surface,
      surfaceSunken: d.surfaceSunken,
      surfacePressed: d.surfacePressed,
      band: d.band,
      ctaOffBg: d.ctaOffBg,
    }).toEqual({
      canvas: "#1f1f21",
      card: "#313135",
      surface: "#3f3f45",
      surfaceSunken: "#39393e",
      surfacePressed: "#4a4a51",
      band: "#313135",
      ctaOffBg: "#3f3f45",
    })
  })

  it("라이트에서 바뀐 면은 **셋뿐**이다 — 나머지는 그대로", () => {
    /*
      바뀐 것: `surface`(우물 = 화면 바닥) · `surfacePressed` · `ctaOffBg`(우물과 같은 값).
      안 바뀐 것: 카드(흰색) · 얕은 우물 · 띠 · 브랜드 틴트 · 선 · 글자.
      파생원이 하나(`fill.normal` 겹수)라 이 목록이 곧 영향 범위다.
    */
    const p = getSurfacePalette(false)
    expect({
      surface: p.surface,
      surfacePressed: p.surfacePressed,
      ctaOffBg: p.ctaOffBg,
    }).toEqual({
      surface: "#eaeaec",
      surfacePressed: "#e0e1e3",
      ctaOffBg: "#eaeaec",
    })
    expect({
      canvas: p.canvas,
      card: p.card,
      surfaceSunken: p.surfaceSunken,
      band: p.band,
      border: p.border,
      hairline: p.hairline,
      textStrong: p.textStrong,
      text: p.text,
    }).toEqual({
      canvas: "#ffffff",
      card: "#ffffff",
      surfaceSunken: "#f8f8f8",
      band: "#f7f7f7",
      border: THEME.light.line.normal,
      hairline: THEME.light.line.alternative,
      textStrong: THEME.light.label.normal,
      text: THEME.light.label.neutral,
    })
  })
})

/* ═══════════ §7 컨트롤면을 장식면에서 갈랐다 (2026-08-21 · `fill.control`) ═══════════ */

describe("§7 `fill.control` — 컨트롤면 (역할 분리)", () => {
  /*
    ■ 무엇이 문제였나

    §5 첫 항목이 재던 그 자리다. 미선택 칩·검색 필드의 면이 흰 고정 헤더 위에서
    ΔL* **3.79**(대비 1.10)라 알약도 입력칸도 사실상 안 보였다. 다크에서 같은 면은
    8.63 이다 — §6 이 면에서 고친 그 비대칭이 컨트롤에서는 그대로 남아 있었다.

    ■ 왜 새 토큰인가 — "같은 뜻에 토큰 둘" 이 아니다

    `fill.normal` 은 **두 가지 일을 겸하고 있었다**: 스켈레톤·사진 자리·진행 트랙·태그
    배지 같은 **장식면**과, 미선택 칩·검색 필드 같은 **컨트롤면**. 두 요구는 정반대다 —
    장식은 안 튀어야 하고 컨트롤은 보여야 한다. 한 토큰이 둘 다 만족할 수 없다.
    그래서 값을 바꾼 것이 아니라 **역할을 갈랐다**. `fill.normal` 은 한 바이트도 안
    움직이고(아래), 장식면 소비처는 전부 그대로 남는다 — 그게 시안 오라클 다섯 개
    (`restaurantDetailDensity` · `restaurantDetailFlatSurface` · `communityFilterPrimitives`
    · `communityPrimitives` · `v2CommunityGaps`)가 계속 통과하는 이유이기도 하다.

    ■ 값은 **천장에 부딪혀** 정해졌다 — §6 처럼 0.8 비율에 닿지 못한다

    §6 은 "다크의 80% 이상" 으로 목표를 잡았다. 여기서 같은 목표(6.91 이상)를 쓰면
    칩 **자신의 글자**가 본문 기준 아래로 떨어진다. 아래 두 절이 그 천장을 계산으로
    다시 세운다 — 숫자를 베끼지 않고, 값을 올리는 변이가 반드시 빨개지도록.
  */
  const white = THEME.light.background.default
  const step = (a: string, b: string) => Math.abs(lightness(a) - lightness(b))
  /** 알파 한 벌을 흰 헤더 위에 얹은 결과. 칩·필·검색 필드가 실제로 그리는 면이다. */
  const faceOn = (token: string, bed: string) => blendOver(token, bed)

  it("`fill.normal` 은 **한 바이트도 안 바뀌었다** — 장식면은 그대로다", () => {
    // 이 줄이 깨지면 역할 분리가 아니라 값 변경이 된 것이고, 시안 오라클 다섯이 같이 깨진다.
    expect(THEME.light.fill.normal).toBe("#70737c14")
    expect(THEME.dark.fill.normal).toBe("#70737c38")
    // 그리고 그 값이 시안 실측면(식당 상세 요리종류 칩 rgb(244,244,245))으로 떨어진다.
    expect(faceOn(THEME.light.fill.normal, white)).toBe("#f4f4f5")
  })

  it("라이트 컨트롤면은 장식면보다 확실히 깊다 (3.79 → 5.25)", () => {
    const decor = step(faceOn(THEME.light.fill.normal, white), white)
    const control = step(faceOn(THEME.light.fill.control, white), white)
    expect(decor).toBeCloseTo(3.79, 1)
    expect(control).toBeCloseTo(5.25, 1)
    // 되돌리는 변이(control := normal)는 여기서 즉시 빨개진다.
    expect(control / decor).toBeGreaterThanOrEqual(1.3)
    expect(THEME.light.fill.control).not.toBe(THEME.light.fill.normal)
  })

  it("**천장이 있다** — 칩 라벨이 본문 기준을 넘는 가장 진한 단이 이 값이다", () => {
    /*
      §6 처럼 "다크의 80%"(6.91)를 쓰지 못한 이유를 **계산으로** 남긴다. 이 면 위에
      앉는 최악의 전경은 칩·필·필드 라벨이 쓰는 `label.neutral` 이고, 면이 깊어지는
      만큼 그 글자가 깎인다. 퍼센트 사다리를 직접 훑어 "라벨이 4.5 를 넘는 가장 진한
      단" 을 구하고, 토큰이 정확히 그 단인지 본다 — 값을 베끼지 않으므로 한 단이라도
      올리는 변이(12% · 15%)는 여기서 빨개진다.
    */
    const alphaAt = (pct: number) =>
      `#70737c${Math.round((pct / 100) * 255)
        .toString(16)
        .padStart(2, "0")}`
    const readable = (token: string) =>
      contrast(THEME.light.label.neutral, token, white) > AA.text

    const ladder = Array.from({ length: 21 }, (_, i) => i + 5) // 5%~25%
    const deepest = ladder.filter((pct) => readable(alphaAt(pct))).at(-1)!
    expect(deepest).toBe(11)
    expect(THEME.light.fill.control).toBe(alphaAt(deepest))
    // 바로 다음 단은 못 쓴다 — 그게 "천장" 이라는 말의 내용이다.
    expect(readable(alphaAt(deepest + 1))).toBe(false)
    // 그리고 0.8 비율이 요구하는 단은 그 천장 **밖**이다(그래서 §6 의 목표를 못 쓴다).
    const darkStep = step(
      faceOn(THEME.dark.fill.normal, THEME.dark.background.default),
      THEME.dark.background.default,
    )
    expect(darkStep).toBeCloseTo(8.63, 1)
    const needed = ladder.find(
      (pct) => step(faceOn(alphaAt(pct), white), white) >= 0.8 * darkStep,
    )!
    expect(readable(alphaAt(needed))).toBe(false)
  })

  it("칩 라벨은 **두 모드 모두** 자기 면 위에서 본문 기준을 넘는다", () => {
    for (const mode of MODES) {
      const bed = THEME[mode].background.default // 칩 레일은 고정 헤더 위에 산다
      const tree = inMode(mode, () =>
        render(V2Chip, { label: "전체", size: "s" as const }),
      )
      const face = flatten(tree.props.style).backgroundColor as string
      const label = foregroundsOf(tree).at(-1)!
      expect({ mode, ok: contrast(label, face, bed) >= AA.text }).toEqual({
        mode,
        ok: true,
      })
    }
  })

  it("선택 칩과 미선택 칩은 **여전히 또렷이** 갈린다 (톤마다 방향이 다르다)", () => {
    /*
      이 변경의 실패 모양은 "미선택이 진해져서 레일이 다 골라진 것처럼 보인다" 이다.
      실제로는 반대로 갔다 — 커뮤니티 레일이 쓰는 `brandSoft` 는 **선택 면이 더 밝아서**
      (연한 브랜드 틴트) 미선택이 깊어질수록 둘이 벌어진다. 세 톤을 전부 재서,
      어느 톤에서든 옛 값보다 나빠지면 빨개지게 둔다.
    */
    const chipFace = (props: Record<string, unknown>) =>
      flatten(
        render(V2Chip, { label: "전체", size: "s", ...props } as never).props
          .style,
      ).backgroundColor as string

    const unselected = chipFace({})
    const old = THEME.light.fill.normal // 옮겨 오기 전의 면
    const gap = (tone: string, face: string) =>
      step(
        faceOn(chipFace({ tone, selected: true }), white),
        faceOn(face, white),
      )

    /*
      **방향이 톤마다 다르다.** 선택 면이 미선택보다 밝은 톤(`brandSoft`)은 미선택이
      깊어질수록 벌어지고, 어두운 톤(`brand`·`neutral`)은 그만큼 좁아진다. 둘을 한
      단언으로 뭉뚱그리면 거짓이 되므로 나눠 잡는다 — 실제로 그렇게 적었다가 틀렸다.
    */
    // (a) 가장 아슬아슬했던 톤이자 커뮤니티 레일이 쓰는 톤. 1.84 → 3.31 로 **벌어졌다.**
    expect(gap("brandSoft", unselected)).toBeGreaterThan(gap("brandSoft", old))
    expect(gap("brandSoft", unselected)).toBeGreaterThanOrEqual(3)

    // (b) 나머지 둘은 좁아지지만 원래 자릿수가 다르다 — 1.5 도 못 잃고 25 아래로 안 간다.
    for (const tone of ["brand", "neutral"] as const) {
      const now = gap(tone, unselected)
      const before = gap(tone, old)
      expect({ tone, ok: before - now < 1.5 }).toEqual({ tone, ok: true })
      expect({ tone, ok: now >= 25 }).toEqual({ tone, ok: true })
    }
    // 그리고 선택 면 자체는 한 값도 안 건드렸다.
    expect(chipFace({ tone: "brandSoft", selected: true })).toBe(
      THEME.light.primary.primaryWeak,
    )
    expect(chipFace({ tone: "brand", selected: true })).toBe(
      THEME.light.primary.primary,
    )
  })

  it("다크는 두 칸이 **같은 값**이다 — 그래서 다크 화면은 한 픽셀도 안 움직인다", () => {
    /*
      같은 값인 것이 실수가 아니라 **판정**이다(`semanticDark.fill.control` 머리말):
      다크는 8.63 이라 이미 또렷했고, 사용자가 "자연스럽다" 고 한 화면이다.
      값이 갈라지는 날 여기가 빨개져서 "다크를 건드렸다" 고 말한다.
    */
    expect(THEME.dark.fill.control).toBe(THEME.dark.fill.normal)
    const darkChip = inMode("dark", () =>
      flatten(
        render(V2Chip, { label: "전체", size: "s" as const }).props.style,
      ),
    ).backgroundColor
    expect(darkChip).toBe(THEME.dark.fill.normal)
  })

  it("컨트롤면을 쓰는 곳이 **컨트롤뿐**이다 — 장식면 소비처는 안 따라갔다", () => {
    /*
      과잉 적용이 과소 적용보다 나쁘다 — 다 옮기면 화면이 회색 상자투성이가 된다.
      옮긴 것은 "누르는/입력하는 면", 남긴 것은 "장식·비활성·눌림 피드백" 이다.
      코드에 대고 확인한다(색이 아니라 **어느 칸을 부르는가**가 이 절의 주제다).
    */
    const src = (path: string) =>
      codeOnly(readFileSync(resolve(__dirname, "..", path), "utf8"))

    /*
      "부르기는 한다" 로는 부족하다 — `SelectableChip` 처럼 자리가 둘인 파일은 **한 자리만**
      되돌려도 그 단언이 통과한다(실제로 변이 시험에서 빠져나갔다). 그래서 칩·필드 계보는
      `fill.normal` 이 코드에 **하나도 없다**로 잡는다. 이 파일들의 회색 면은 전부 컨트롤이다.
    */
    for (const path of [
      "src/design-system-v2/components/V2Chip.tsx",
      "src/design-system-v2/components/V2SearchField.tsx",
      "src/features/recipe/components/community/SortDropdown.tsx",
      "src/features/restaurant/components/SelectableChip.tsx",
      "src/features/restaurant/components/detail/DetailFilterChip.tsx",
      "src/features/restaurant/views/RestaurantListScreen.tsx",
      "src/features/recipe/components/detail/RecipeActionRow.tsx",
    ]) {
      const code = src(path)
      expect({ path, uses: code.includes("fill.control") }).toEqual({
        path,
        uses: true,
      })
      expect({ path, leftover: code.includes("fill.normal") }).toEqual({
        path,
        leftover: false,
      })
    }

    /*
      `CommentComposer` 는 **둘 다** 있어야 맞다. 입력칸은 컨트롤면이고, 그 위의
      "누구에게 답하는 중" 띠는 누르는 면이 아니라 표시라 장식면에 남는다 —
      두 면이 같은 값이 되면 답글 문맥이 입력칸의 연장으로 보인다.
    */
    const composer = src(
      "src/features/recipe/components/community/CommentComposer.tsx",
    )
    expect({
      control: composer.includes("fill.control"),
      decor: composer.includes("fill.normal"),
    }).toEqual({ control: true, decor: true })

    // 장식면 셋은 **그대로**다. 여기가 넘어가면 스켈레톤·트랙·태그가 컨트롤처럼 튄다.
    for (const path of [
      "src/design-system-v2/components/V2Skeleton.tsx",
      "src/design-system-v2/components/V2ProgressBar.tsx",
      "src/design-system-v2/components/V2Badge.tsx",
    ]) {
      const code = src(path)
      expect({ path, uses: code.includes("fill.control") }).toEqual({
        path,
        uses: false,
      })
      expect({ path, keeps: code.includes("fill.normal") }).toEqual({
        path,
        keeps: true,
      })
    }
  })
})

/* ══════ §8 머리는 자기 본문과 같은 면에 앉는다 (2026-08-22 · 섹션·상단) ══════ */

describe("§8 섹션 머리의 면 · 상단 고정층", () => {
  /*
    ■ 무엇이 문제였나

    §6 이 라이트 바닥을 `#f4f4f5` → `#eaeaec` 로 내리자(ΔL* 3.79 → 7.25) 그동안 명도 3 안에
    뭉쳐 있어 **안 보이던** 어긋남이 드러났다: 섹션 **머리만** 배경이 없어 화면 바닥에
    앉고, 그 머리가 가리키는 행들은 흰 면이었다(2026-08-22 사용자 지적 — "섹션 내에서도
    헤드랑 본문섹션들이 어색하게 색이 다르다"). 이름표와 이름 붙는 대상이 다른 평면에
    있으면 그 관계가 끊긴다.

    ■ 규칙 (전문은 `SectionHeader` 머리말)

      (A) 본문이 **전폭 블록**이면 머리도 그 블록 안(`background.default`).
      (B) 본문이 **인셋 카드**면 머리는 화면 바닥 위 — 둘 다 바닥이라 어긋나지 않는다.

    커뮤니티 판정: 요즘 이야기 중 (A) · 요즘 글 쓰는 이웃 (A) · 스토리 (B) · 자유글 피드 (B).

    ■ 어떻게 재나 — **상속되는 면**을 들고 트리를 훑는다

    "행이 흰색을 칠한다" 만 보면 머리가 어디 앉았는지는 영영 안 보인다. 그래서 조상에서
    내려오는 면을 인자로 들고 내려가며 각 노드의 **실제 바닥**을 계산한다. 감싸는 면을
    지우는 변이는 머리의 면이 화면 바닥으로 떨어지면서 즉시 빨개진다.
  */
  type Planed = { element: Element; plane: string }

  /** 조상에서 내려온 면(`plane`)을 자기 배경으로 덮어쓰며 훑는다. */
  function walkPlanes(element: Element, plane: string): Planed[] {
    const own = flatten(element.props.style).backgroundColor
    const here = typeof own === "string" ? own : plane
    const self: Planed = { element, plane: here }
    if (typeof element.type === "function") {
      const out = (element.type as (props: unknown) => unknown)(element.props)
      return isElement(out) ? [self, ...walkPlanes(out, here)] : [self]
    }
    return childrenOf(element).reduce<Planed[]>(
      (acc, child) => [...acc, ...walkPlanes(child, here)],
      [self],
    )
  }

  /** 그 문구(모의 `t` 는 키를 그대로 돌려준다)가 앉은 면. */
  const planeOfText = (root: Element, text: string, bed: string): string => {
    const hit = walkPlanes(root, bed).find(({ element }) => {
      const raw = element.props.children
      const joined = (Array.isArray(raw) ? raw : [raw]).join("")
      return typeof joined === "string" && joined === text
    })
    if (!hit) throw new Error(`문구를 못 찾았다: ${text}`)
    return hit.plane
  }

  /** 그 높이의 행(본문 첫 줄 · 스켈레톤 포함)이 앉은 면. */
  const planeOfRow = (root: Element, height: number, bed: string): string => {
    const hit = walkPlanes(root, bed).find(
      ({ element }) => flatten(element.props.style).height === height,
    )
    if (!hit) throw new Error(`행을 못 찾았다: h=${height}`)
    return hit.plane
  }

  const trending = (isLoading: boolean) =>
    render(TrendingPostsSection, {
      posts: isLoading
        ? []
        : [{ id: "1", title: "오늘 저녁 뭐 드셨어요", commentCount: 12 }],
      isLoading,
      onRetry: () => {},
      onPressPost: () => {},
      onPressAll: () => {},
    })

  const neighbors = (isLoading: boolean) =>
    render(NeighborSuggestionSection, {
      authors: isLoading
        ? []
        : [
            {
              id: "a",
              name: "이웃",
              latestPostTitle: "칼륨 낮은 국",
              following: false,
            },
          ],
      isLoading,
      onRetry: () => {},
      onPressAuthor: () => {},
      onToggleFollow: () => {},
    })

  const SECTIONS = [
    {
      name: "요즘 이야기 중",
      make: trending,
      title: "community.trending.title",
      rowHeight: TRENDING_ROW_HEIGHT,
    },
    {
      name: "요즘 글 쓰는 이웃",
      make: neighbors,
      title: "community.neighbors.title",
      rowHeight: NEIGHBOR_SUGGESTION_ROW_HEIGHT,
    },
  ] as const

  it.each(SECTIONS)("$name — 머리와 본문이 **같은 면**이다 (A)", (section) => {
    for (const mode of MODES) {
      const bed = bedOf(mode)
      const tree = inMode(mode, () => section.make(false))
      const head = planeOfText(tree, section.title, bed)
      const body = planeOfRow(tree, section.rowHeight, bed)
      // 이게 이번 결함 그 자체다 — 예전엔 머리가 `bed`, 행이 흰 면이었다.
      expect({ section: section.name, mode, head }).toEqual({
        section: section.name,
        mode,
        head: body,
      })
      // 그리고 그 면은 (A) 가 고른 면이다. 둘 다 바닥으로 떨어지면 (B) 가 되므로 같이 못 박는다.
      expect(head).toBe(THEME[mode].background.default)
    }
  })

  it.each(SECTIONS)("$name — **로딩 중에도** 면이 안 바뀐다", (section) => {
    /*
      행에만 색을 칠하던 예전 방식의 두 번째 증상: 스켈레톤 행은 배경이 없어서 블록이
      로딩 중에는 바닥, 도착하면 흰 면이었다 — 같은 섹션이 면을 한 번 갈아탄다.
      감싸는 면이 그 갈아타기를 없앤다.
    */
    const bed = bedOf("light")
    const tree = section.make(true)
    expect(planeOfText(tree, section.title, bed)).toBe(
      planeOfRow(tree, section.rowHeight, bed),
    )
  })

  it("`SectionHeader` 는 **자기 면을 칠하지 않는다** — (A)/(B) 는 부모가 정한다", () => {
    /*
      머리가 자기 배경을 들면 (B) 섹션(스토리)에서 바닥 위에 흰 띠가 하나 생긴다.
      면을 정하는 것은 언제나 **감싸는 쪽**이라는 것이 이 규칙이 지켜지는 방식이다.
      (스토리 레일이 자기 면을 안 세운다는 것은 §6 의 마지막에서 두 번째 절이 지킨다.)
    */
    const tree = render(SectionHeader, { title: "스토리" })
    expect(flatten(tree.props.style).backgroundColor).toBeUndefined()
  })

  it("라이트에서 그 면은 화면 바닥과 **다른 평면**이다 (7.25)", () => {
    /*
      "전부 흰색으로 칠하면 끝" 을 막는 절이다. 블록의 면(`background.default`)과 화면
      바닥이 같아지는 순간 §6 이 얻은 층이 사라진다 — 평면을 **줄이는** 것이 목적이지
      **없애는** 것이 아니다. 다크는 반대로 둘이 같은 값이고(그래서 다크는 이 변경으로
      한 픽셀도 안 움직인다), 층은 카드 쪽이 만든다.
    */
    const step = Math.abs(
      lightness(THEME.light.background.default) - lightness(bedOf("light")),
    )
    expect(step).toBeGreaterThanOrEqual(7)
    expect(THEME.dark.background.default).toBe(bedOf("dark"))
  })

  it("상단은 **하나의 고정층**이다 — 타이틀 줄이 검색·칩과 같은 면을 칠한다", () => {
    /*
      ■ 판단과 근거 (2026-08-22)

      타이틀 · 검색 · 칩 레일은 셋 다 스크롤하지 않고 목록이 그 밑변에서 잘린다 — 하나의
      고정층이다. 그런데 라이트에서는 타이틀 줄만 바닥(#eaeaec)에, 검색+칩은 흰 면이라
      머리가 두 평면으로 갈려 있었다.

      **어느 면으로 합치나 — 다크가 근거다.** 다크에서는 `background.default` 가 곧 화면
      바닥이라 세 줄이 이미 한 면이고, 층으로 읽히는 것은 색이 아니라 카드가 그 밑으로
      지나간다는 사실이다(사용자가 "자연스럽다" 고 한 상태). 라이트에서 같은 구조를 얻는
      방법은 세 줄을 `background.default` 한 면에 놓는 것이다.

      **반대로 고정층을 바닥색으로 칠할 수는 없다.** 그 위에 앉은 컨트롤이 무너진다 —
      검색 필드의 면은 우물이라 바닥과 **같은 값**이 되어 사라지고(아래 첫 단언),
      미선택 칩의 `fill.control` 은 **흰 헤더 위에서** 라벨이 4.5 를 지키는 가장 진한
      단으로 정해진 값이라(§7) 바닥이 바뀌면 그 계산이 통째로 어긋난다.

      화면 파일은 훅투성이라 여기서 부를 수 없다. **코드에 대고** 두 가지를 본다:
      타이틀 줄이 그 면과 안전영역을 들고 있다는 것, 그리고 화면 바닥은 **여전히 우물**
      이라는 것(이쪽이 "전부 흰색" 변이를 잡는 자리다).
    */
    // 검색 필드의 면이 곧 화면 바닥이다 — 고정층을 바닥색으로 칠하면 이 칸이 사라진다.
    expect(getSurfacePalette(false).surface).toBe(bedOf("light"))

    const src = codeOnly(
      readFileSync(resolve(__dirname, "../app/(tabs)/community.tsx"), "utf8"),
    )
    // (a) 타이틀 줄 = 고정층의 면 + 안전영역. `FreePostTab.pinnedHeader` 와 같은 토큰이다.
    expect(src).toContain("backgroundColor: colors.background.default")
    expect(src).toContain("paddingTop: insets.top + HEADER_PAD_TOP")
    /*
      (b) 화면 바닥은 우물 그대로. 카드(흰색)로 바꾸는 변이가 여기서 빨개진다.
      2026-08-22 에 표현이 바뀌었다 — 화면 8곳이 각자 적던 `isDark ? canvas : surface`
      가 `SurfacePalette.bed` 한 칸으로 접혔다(같은 값, 그 칸 머리말 참고).
    */
    expect(src).toContain("backgroundColor: surface.bed,")
    expect(getSurfacePalette(false).bed).toBe(getSurfacePalette(false).surface)
    expect(src).not.toContain("backgroundColor: surface.card")
  })
})

/* ════════ §9 바닥과 그 위의 면은 같은 값일 수 없다 (일반 가드 · 2026-08-22) ════════ */

describe("§9 우물을 바닥에 깐 화면 위에 우물을 또 놓지 않는다", () => {
  /*
    ■ 무엇이 터졌나 — 통일이 만든 회귀

    `SurfacePalette.surface`(우물)는 **두 가지 일을 겸한다**: 라이트의 **화면 바닥**과,
    입력칸·칩이 앉는 **파인 면**. 앞선 작업이 `tokens.color.appBg` 를 그 우물로 통일하면서
    설정 편집 화면 넷의 페이지 바닥이 우물이 됐고, 그 위에 놓인 `SettingsTextField` 의
    면도 우물이라 **둘이 같은 값이 됐다**(ΔL* 7.25 → 0.00). 테두리가 없는 필드라
    입력칸이 통째로 사라졌다. §8 마지막 절이 커뮤니티 고정층에 대해 미리 적어 둔
    함정("고정층을 바닥색으로 칠하면 검색 필드가 사라진다")이 설정 쪽에서 이미 터져
    있었던 것이다.

    ■ 왜 화면 넷을 하나씩 적지 않나

    화면을 세면 다섯 번째 화면에서 또 터진다. 여기서 묻는 것은 **관계**다:

      바닥을 우물로 까는 화면  ×  자기 면 없이 우물만 칠하는 컴포넌트  =  0

    두 목록 모두 **소스에서 뽑는다.** 새 화면·새 컴포넌트는 자동으로 들어온다.

    ■ "자기 면 없이" 가 이 규칙의 핵심이다

    우물을 칠하는 파일 53개 중 대부분은 **자기 면 위에** 그린다 — `PostListItem` 의
    사진 자리는 흰 카드 안이고, `WaterSheet` 의 트랙은 시트 면 안이다. 그런 파일은
    바닥이 무엇이든 무해하다. 위험한 것은 `SettingsTextField` 처럼 **면을 하나도 세우지
    않는** 파일이다 — 그 우물이 실제로 앉는 곳은 부모가 정하고, 부모가 바닥이면 사라진다.
    그래서 판정은 "이 파일이 카드·캔버스·기본 배경을 어딘가에서 칠하는가" 로 가른다.

    ■ 남은 구멍 (알고 남긴다)

    중첩을 소스만 보고 완전히 알 수는 없다. 한 파일 안에서 카드를 칠하면서 **카드 밖에**
    우물을 놓는 경우는 여기서 안 잡힌다(`ProfileEditScreen` 의 빈 아바타가 실제로 그랬고
    2026-08-22 에 손으로 고쳤다). 한 단계 import 까지만 따라가는 것도 같은 이유의 한계다.
    그래도 이 규칙이 잡는 것은 **실제로 터진 그 모양**이고, 그건 이름이 아니라 관계다.
  */
  const REPO = resolve(__dirname, "..")
  const files = execSync("find app src -name '*.tsx'", {
    cwd: REPO,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
  const sourceOf = (file: string) =>
    codeOnly(readFileSync(resolve(REPO, file), "utf8"))

  /** 우물을 면으로 칠한다(팔레트 경유든 tamagui `appBg` 경유든 같은 값이다). */
  const paintsWell = (src: string) =>
    /backgroundColor:\s*(?:s|surface|palette)\.surface\b/.test(src) ||
    /backgroundColor:\s*tokens\.color\.appBg\.val/.test(src)
  /** 자기 면을 세운다 — 카드·캔버스·기본/뜬/낮은 배경 중 하나라도 칠한다. */
  const ownsPlane = (src: string) =>
    /backgroundColor:[^,\n]*\.(card|canvas)\b/.test(src) ||
    /backgroundColor:[^,\n]*background\.(default|floated|lower)/.test(src)
  /**
   * 화면 바닥을 우물로 깐다. 표현은 둘이다 — 정본 칸(`SurfacePalette.bed`, 라이트에서
   * 우물과 같은 값)과, 아직 남아 있는 tamagui `appBg` 계보.
   */
  const bedIsWell = (src: string) =>
    /(?:backgroundColor:|=)\s*\w+\.bed\b/.test(src) ||
    /appBgDark\.val\s*:\s*tokens\.color\.appBg\.val/.test(src)

  /**
   * **흰 면 안에 있는 것이 확인된 자리.** 이유 없이 늘리지 마라 — 한 줄 늘릴 때마다
   * 위 규칙의 구멍이 한 칸 커진다. 확인 방법은 그 파일에서 이 우물을 감싸는 상자가
   * 카드/시트 면인지 보는 것이다.
   */
  const NESTED: Record<string, string> = {
    "src/features/recipe/components/PostListItem.tsx":
      "사진 자리는 카드 루트(SurfacePressable baseColor=card) 안이다",
    "src/features/consultation/components/ChatMessageBubble.tsx":
      "마크다운 블록 면은 말풍선 안이다",
    "src/features/home/components/record/MealTimeline.tsx":
      "코너 + 칩은 빈 카드(SurfacePressable baseColor=s.card) 안이다",
    "src/features/home/components/record/sheets/WaterSheet.tsx":
      "물잔·트랙은 시트 면 안이다",
    "src/features/home/components/record/sheets/BloodPressureSheet.tsx":
      "입력 칸은 시트 면 안이다",
    "src/features/home/components/record/sheets/BloodGlucoseSheet.tsx":
      "입력 칸은 시트 면 안이다",
    "src/features/home/components/record/sheets/MealPhotoConfirmSheet.tsx":
      "사진 자리는 시트 면 안이다",
  }

  /** 한 단계만 따라간다 — 화면이 **직접** 놓는 것이 이 규칙의 대상이다. */
  const localImportsOf = (file: string) => {
    const out: string[] = []
    for (const m of sourceOf(file).matchAll(
      /from\s+"((?:@\/|\.\/|\.\.\/)[^"]+)"/g,
    )) {
      const base = m[1].startsWith("@/")
        ? m[1].slice(2)
        : join(dirname(file), m[1])
      for (const ext of [".tsx", "/index.tsx"]) {
        if (existsSync(resolve(REPO, base + ext))) {
          out.push(base + ext)
          break
        }
      }
    }
    return out
  }

  it("우물 바닥 화면이 **면 없는 우물 소비자**를 직접 놓지 않는다", () => {
    const bedScreens = files.filter((file) => bedIsWell(sourceOf(file)))
    // 규칙이 헛돌지 않는다는 확인 — 그런 화면이 실제로 여럿 있다.
    expect(bedScreens.length).toBeGreaterThanOrEqual(8)

    const violations: string[] = []
    for (const screen of bedScreens) {
      for (const file of [screen, ...localImportsOf(screen)]) {
        if (NESTED[file]) continue
        const src = sourceOf(file)
        if (paintsWell(src) && !ownsPlane(src)) {
          violations.push(`${screen} → ${file}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it("바닥과 그 위의 면이 **같은 값**이면 규칙이 실제로 잡는다 (오라클)", () => {
    /*
      늘 통과하는 가드가 아닌지 확인한다. `SettingsTextField` 는 회귀 당시 그대로
      **우물만 칠하고 자기 면은 안 세우는** 파일이므로, 규칙에 걸릴 자격이 있다.
      실제로 안 걸리는 이유는 그것을 놓는 화면 넷이 이제 **흰 페이지**라서다.
    */
    const field = sourceOf(
      "src/features/settings/components/SettingsTextField.tsx",
    )
    expect(paintsWell(field)).toBe(true)
    expect(ownsPlane(field)).toBe(false)

    // 그 넷의 바닥은 캔버스(라이트 흰색)이고, 우물과 다른 값이다.
    const p = getSurfacePalette(false)
    for (const screen of [
      "NicknameEditScreen",
      "NameEditScreen",
      "PasswordEditScreen",
      "PhoneNumberEditScreen",
    ]) {
      const src = sourceOf(`src/features/settings/views/${screen}.tsx`)
      expect({ screen, floor: /const pageBg = s\.canvas/.test(src) }).toEqual({
        screen,
        floor: true,
      })
      expect({ screen, bedIsWell: bedIsWell(src) }).toEqual({
        screen,
        bedIsWell: false,
      })
    }
    // 그리고 그 두 값의 간격이 이 화면이 되찾은 것이다(0.00 → 7.25).
    expect(Math.abs(lightness(p.canvas) - lightness(p.surface))).toBeCloseTo(
      7.25,
      1,
    )
  })
})

/* ═════════ §10 층의 정본 — 면의 **개수**와 화면 바닥 (2026-08-22) ═════════ */

describe("§10 라이트가 쓰는 면의 개수와 화면 바닥", () => {
  /*
    ■ 왜 개수를 세나

    §6·§7·§8 은 **경계 하나하나**를 세게 만들었다. 그런데 사용자는 그 뒤에도 다른 자리에서
    "라이트가 어색하다" 를 반복했고, 전수로 세어 보니 원인이 경계의 세기가 아니라 **면의
    가짓수**였다: 라이트에서 실제로 칠해지는 회색 면이 **열 개**이고 그중 넷이 명도 1.0
    안에 겹쳐 있다. 다크는 **일곱 개**이고, 네 토큰(카드 · 띠 · `fill.normal` ·
    `fill.control`)이 **한 값으로 접힌다**. 두 모드의 차이는 취향이 아니라 이 숫자다.

    규칙 전문(넷이 무엇이고 무엇이 층이 아닌지)은 `community/SectionHeader` 머리말
    §층의 정본. 여기서는 그 표가 **썩지 않게** 숫자를 다시 계산해 못 박는다.
  */
  const step = (a: string, b: string) => Math.abs(lightness(a) - lightness(b))

  /** 그 모드에서 실제로 칠해지는 불투명 회색 면 전부(브랜드 틴트는 색이라 뺀다). */
  const greyPlanes = (mode: "light" | "dark") => {
    const p = getSurfacePalette(mode === "dark")
    const v2 = THEME[mode]
    const canvas = v2.background.default
    const values = [
      p.canvas,
      p.bed,
      p.card,
      p.surface,
      p.surfaceSunken,
      p.surfacePressed,
      p.band,
      blendOver(v2.fill.normal, canvas),
      blendOver(v2.fill.control, canvas),
      blendOver(v2.fill.background, canvas),
      blendOver(v2.fill.alternative, canvas),
      blendOver(v2.fill.control, p.bed),
      // 띠 위의 컨트롤면. 라이트에서만 새 값이 되는 자리다(다크는 띠가 카드와 같은 값).
      blendOver(v2.fill.control, p.band),
    ]
    return [...new Set(values)].sort((a, b) => lightness(b) - lightness(a))
  }

  it("라이트는 면이 **열 개**, 다크는 **일곱 개**다 (다크가 넷을 한 값으로 접는다)", () => {
    /*
      이 절이 "면을 하나 더 늘리는" 변이를 잡는 자리다. 새 회색을 만들거나 접혀 있던
      토큰을 갈라 놓으면 개수가 즉시 어긋난다.
    */
    expect(greyPlanes("light")).toHaveLength(10)
    expect(greyPlanes("dark")).toHaveLength(7)

    // 다크가 접는 네 칸이 정확히 어느 것인지도 못 박는다 — 이것이 개수 차이의 전부다.
    const d = getSurfacePalette(true)
    const dark = THEME.dark
    expect([
      d.card,
      d.band,
      blendOver(dark.fill.normal, dark.background.default),
      blendOver(dark.fill.control, dark.background.default),
    ]).toEqual(["#313135", "#313135", "#313135", "#313135"])
    // 라이트에서 그 넷은 **넷 다 다른 값**이다(그래서 라이트가 셋 더 많다).
    const l = getSurfacePalette(false)
    const light = THEME.light
    expect(
      new Set([
        l.card,
        l.band,
        blendOver(light.fill.normal, light.background.default),
        blendOver(light.fill.control, light.background.default),
      ]).size,
    ).toBe(4)
  })

  it("층 사이 간격의 중앙값이 라이트는 다크의 절반도 안 된다 (1.3 vs 3.4)", () => {
    /*
      개수만으로는 "다크가 자연스러운 이유" 의 절반만 말한다. 나머지 절반은 남은 층이
      **서로 멀다**는 것이고, 두 사실은 같은 뿌리다 — 접었기 때문에 벌릴 자리가 생겼다.
    */
    const gaps = (mode: "light" | "dark") => {
      const planes = greyPlanes(mode)
      return planes
        .slice(1)
        .map((hex, index) => step(planes[index], hex))
        .sort((a, b) => a - b)
    }
    const median = (values: number[]) => {
      const middle = values.length / 2
      return values.length % 2
        ? values[Math.floor(middle)]
        : (values[middle - 1] + values[middle]) / 2
    }
    expect(median(gaps("light"))).toBeCloseTo(1.3, 1)
    expect(median(gaps("dark"))).toBeCloseTo(3.4, 1)
    // 가장 좁은 간격도 같이 못 박는다 — 표(머리말)의 셋째 칸이다.
    expect(gaps("light")[0]).toBeCloseTo(0.35, 2)
    expect(gaps("dark")[0]).toBeCloseTo(0.59, 2)
    expect(median(gaps("light"))).toBeLessThan(median(gaps("dark")) / 2)
  })

  it("정본 넷은 값이 아니라 **역할**로 정해진다 — 바닥 · 콘텐츠 · 컨트롤 · 눌림", () => {
    const p = getSurfacePalette(false)
    const white = THEME.light.background.default
    expect({
      bed: p.bed,
      content: p.card,
      control: blendOver(THEME.light.fill.control, white),
      pressed: p.surfacePressed,
    }).toEqual({
      bed: "#eaeaec",
      content: "#ffffff",
      control: "#eff0f1",
      pressed: "#e0e1e3",
    })
    // 넷은 단조롭게 내려간다 — 이 순서가 뒤집히면 층이 뒤집힌 것이다.
    const ladder = [
      p.card,
      blendOver(THEME.light.fill.control, white),
      p.bed,
      p.surfacePressed,
    ].map(lightness)
    expect(ladder).toEqual([...ladder].sort((a, b) => b - a))
  })

  /* ── 화면 바닥 ────────────────────────────────────────────────────────── */

  const REPO10 = resolve(__dirname, "..")
  const screenFiles = execSync("find app src/features -name '*.tsx'", {
    cwd: REPO10,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
  const codeOf = (file: string) =>
    codeOnly(readFileSync(resolve(REPO10, file), "utf8"))

  /** 화면 바닥으로 **허용된** 표현식 → 라이트 값. 여기 없는 표현식은 바닥이 될 수 없다. */
  const FLOOR_LIGHT: Record<string, string> = (() => {
    const p = getSurfacePalette(false)
    return {
      "surface.bed": p.bed,
      "s.bed": p.bed,
      "surface.canvas": p.canvas,
      "s.canvas": p.canvas,
      "colors.background.default": THEME.light.background.default,
      "s.isDark ? tokens.color.appBgDark.val : tokens.color.appBg.val":
        tokens.color.appBg.val,
    }
  })()

  /** 소스에서 화면 바닥 표현식을 뽑는다(안전영역과 같이 주는 자리 · `pageBg`/`screenBg`). */
  const floorsOf = (src: string) => {
    const out = new Set<string>()
    for (const re of [
      /backgroundColor:\s*([^,}\n]+),\s*\n?\s*paddingTop:\s*insets\.top/g,
      /const (?:pageBg|screenBg)\s*=\s*([^\n]+)/g,
      /*
        안전영역을 헤더가 따로 먹는 화면(레시피 상세 등)은 루트에 `insets.top` 이 없다.
        그 자리는 `styles.flex|root|screen|container` 와 같이 오는 배경으로 잡는다.
      */
      /\[\s*styles\.(?:flex|root|screen|container),\s*\{?\s*\n?\s*backgroundColor:\s*([^,}\n]+)/g,
    ]) {
      for (const m of src.matchAll(re)) out.add(m[1].trim())
    }
    return [...out]
  }

  it("라이트 화면 바닥은 **두 값**뿐이다 — `background.lower` 는 바닥이 아니다", () => {
    /*
      셋째 바닥이 생기는 변이(예: 어느 화면이 `colors.background.lower` 를 깐다)가
      여기서 빨개진다. 실제로 레시피 상세가 그 값을 깔고 있었고 2026-08-22 에 우물로
      내려왔다 — 흰 블록과 ΔL* 2.77 이라 "블록이 떠 있다" 가 성립하지 않았다.

      해석되지 않는 표현식(모드별 상수 표 `BG_COLOR[scheme]` 등)은 건너뛴다. 대신
      **몇 개를 실제로 봤는지**를 같이 못 박아, 정규식이 헛돌면 알게 한다.
    */
    const seen = new Map<string, string[]>()
    for (const file of screenFiles) {
      const floors = floorsOf(codeOf(file))
      if (floors.length) seen.set(file, floors)
    }
    expect(seen.size).toBeGreaterThanOrEqual(25)

    const values = new Set<string>()
    const rejected: string[] = []
    for (const [file, floors] of seen) {
      for (const expr of floors) {
        if (!(expr in FLOOR_LIGHT)) {
          // 해석 불가는 통과, **알려진 비-바닥 토큰**은 실패로 잡는다.
          if (/background\.lower|\.band\b|fill\./.test(expr)) {
            rejected.push(`${file}: ${expr}`)
          }
          continue
        }
        values.add(FLOOR_LIGHT[expr])
      }
    }
    expect(rejected).toEqual([])
    const p = getSurfacePalette(false)
    expect([...values].sort()).toEqual([p.bed, p.canvas].sort())
  })

  it("같은 계보의 바닥은 **같다** — 피드 · 인기글 · 검색", () => {
    /*
      **이 한 줄이 이번 변경의 목표다.** 사용자가 짚은 동선이 그대로다: 피드에서
      `전체 ›` 를 눌러 인기글로 가고, 돋보기로 검색으로 간다. 셋 중 하나만 흰 바닥이면
      그 이동에서 바닥색이 바뀐다 — 인기글이 실제로 그랬다(`surface.canvas`).
    */
    for (const file of [
      "app/(tabs)/community.tsx",
      "src/features/recipe/views/CommunityPopularScreen.tsx",
      "src/features/recipe/views/CommunitySearchScreen.tsx",
      "app/community-library.tsx",
    ]) {
      const src = codeOf(file)
      expect({ file, bed: /backgroundColor: \w+\.bed\b/.test(src) }).toEqual({
        file,
        bed: true,
      })
      // 그리고 그 화면 어디에도 흰 바닥이 남아 있지 않다.
      expect({
        file,
        whiteFloor:
          /backgroundColor: \w+\.canvas, paddingTop: insets\.top/.test(src),
      }).toEqual({ file, whiteFloor: false })
    }
  })

  it("인기글의 글 카드는 바닥에서 **뜬다** — 옮긴 바닥이 카드를 지우지 않았다", () => {
    /*
      바닥만 내리고 카드를 안 고치면 카드가 사라진다(브리프의 경고 그대로). 인기글의
      행은 머리카락 선으로 나눈 전폭 행이었다 — 그대로 두면 화면이 다시 흰 한 장이 된다.
      낱개 카드로 바꿨고, 치수는 이 화면 **자신의 스켈레톤**(인셋 20 · 아래 10)과
      피드 카드(r16 · padding 16)에서 가져왔다.
    */
    const src = codeOf("src/features/recipe/views/CommunityPopularScreen.tsx")
    expect(src).toContain("backgroundColor: surface.card")
    // 선은 뺐다 — 카드가 경계를 말하는데 선까지 그으면 표시가 둘이 된다.
    expect(src).not.toContain("borderBottomColor: surface.hairline, opacity")
    const p = getSurfacePalette(false)
    expect(step(p.card, p.bed)).toBeCloseTo(7.25, 1)
  })
})

/* ═══════ §11 (B) 섹션 라벨 — 바닥 위 이름표가 읽힌다 (2026-08-22) ═══════ */

describe("§11 바닥 위 (B) 섹션 라벨", () => {
  /*
    ■ 무엇이 문제였나

    (B) 형태(`SectionHeader` 머리말: 바닥 위 이름표 + 그 아래 흰 카드)의 라벨 —
    마이페이지의 `건강 관리` · `소식·지원` · `신장 프로필`, 의학 정보의 섹션 머리,
    프로필 수정의 그룹 제목 — 이 전부 `textMuted`(= `label.alternative`)였다.
    화면 바닥 위에서 **2.68:1** 이라 본문 기준(4.5)은 물론 **큰 글자 기준(3)에도**
    못 미친다. 13.5/13 SemiBold 는 큰 글자가 아니다(18.66 이상 또는 14 이상 Bold).

    ■ 무엇을 고쳤나 — 값이 아니라 **부르는 쪽**

    `label.alternative` 는 146곳이 보고 식당 상세 시안 실측에 묶여 있다. §1 이 이미
    "읽혀야 하는 글자의 바닥은 `neutral`" 이라고 정해 뒀고, 커뮤니티는 2026-08-21 에
    그 결론을 따라 옮겼다. 같은 이동을 (B) 라벨에도 한다.

    ■ 왜 화면 이름이 아니라 **파일과 스타일 이름**으로 잡나

    이 결함은 화면의 문제가 아니라 **형태의 문제**다. 같은 형태를 쓰는 네 번째 화면이
    생기면 같은 자리에서 또 터지므로, 소스에서 그 스타일을 쓰는 줄을 찾아 색을 읽는다.
  */
  const BED = bedOf("light")
  const LABEL_SITES = [
    ["src/features/settings/views/MyPageScreen.tsx", "styles.sectionHeader"],
    [
      "src/features/settings/views/MedicalReferenceScreen.tsx",
      "styles.sectionHeader",
    ],
    ["src/features/settings/views/ProfileEditScreen.tsx", "styles.groupTitle"],
  ] as const

  it.each(LABEL_SITES)(
    "%s 의 %s 는 `textMuted` 를 부르지 않는다",
    (file, style) => {
      const src = codeOnly(readFileSync(resolve(__dirname, "..", file), "utf8"))
      const lines = src
        .split("\n")
        .filter((line) => line.includes(`[${style}, { color:`))
      // 그 자리가 실제로 있다(정규식이 헛돌면 이 절이 늘 통과한다).
      expect(lines.length).toBeGreaterThanOrEqual(1)
      for (const line of lines) {
        expect({
          line: line.trim(),
          muted: /\.textMuted\b/.test(line),
        }).toEqual({ line: line.trim(), muted: false })
        expect({ line: line.trim(), neutral: /\.text\b/.test(line) }).toEqual({
          line: line.trim(),
          neutral: true,
        })
      }
    },
  )

  it("그 색은 **두 모드 모두** 바닥 위에서 본문 기준을 넘는다 (2.68 → 4.72)", () => {
    for (const mode of MODES) {
      const bed = bedOf(mode)
      const ratio = contrast(THEME[mode].label.neutral, bed, bed)
      expect({ mode, ok: ratio >= AA.text }).toEqual({ mode, ok: true })
    }
    // 옮기기 전 값은 두 모드 모두 밖이었다 — 다크도 같이 고쳐진 것이다.
    expect(contrast(THEME.light.label.alternative, BED, BED)).toBeCloseTo(
      2.68,
      2,
    )
    expect(contrast(THEME.light.label.neutral, BED, BED)).toBeCloseTo(4.72, 2)
    const darkBed = bedOf("dark")
    expect(
      contrast(THEME.dark.label.alternative, darkBed, darkBed),
    ).toBeCloseTo(3.0, 2)
    expect(contrast(THEME.dark.label.neutral, darkBed, darkBed)).toBeCloseTo(
      5.79,
      2,
    )
  })

  it("한 단 올리기로는 안 된다 — `alternative` 는 큰 글자 기준에도 못 미친다", () => {
    /*
      "그럼 폰트를 키우면 되지 않나" 를 막는 절이다. 라이트 바닥 위 2.68 은 큰 글자
      기준(3)에도 못 닿으므로, 크기로 해결되는 문제가 아니다 — 색을 바꿔야 한다.
    */
    expect(contrast(THEME.light.label.alternative, BED, BED)).toBeLessThan(
      AA.largeText,
    )
  })
})
