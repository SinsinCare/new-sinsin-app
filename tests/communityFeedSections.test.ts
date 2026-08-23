/**
 * 피드의 두 섹션 계약 — `지금 이야기 중`(D23) · `요즘 글 쓰는 이웃`(D24·D28).
 * 스펙: `docs/design/community-redesign/01-DECISIONS.md` D23 · D24(형태는 승인된 재디자인이
 * 대체했고 **상태 규칙은 그대로**) · `00-MASTER.md` §2.0 · §2.1 · §2.7.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 어떻게 보나
 *
 * 이 저장소의 jest 에는 렌더러가 없다. 그래서 **함수 컴포넌트를 그대로 호출해 돌려받은
 * 엘리먼트 트리를 읽는다**(선례: `communityPrimitives.test.ts` · `v2Menu.test.ts`).
 * 소스를 grep 하지 않는다 — "쓰여 있다" 가 "그려진다" 를 뜻하지 않고, 주석이 계약을
 * 대신 만족시킨다. 치수·색은 토큰에서 읽어 비교하므로 토큰이 바뀌면 같이 따라간다.
 *
 * ■ 이 파일이 지키는 것 (전부 변이 테스트로 검산했다)
 *
 *  1. **세로다.** 승인된 재디자인이 뒤집은 바로 그 축이라, 가로 스크롤러가 다시 들어오면
 *     여기가 깨진다. `horizontal` 프롭도 `ScrollView` 도 트리에 없어야 한다.
 *  2. **행 수는 3 / 2 로 잘린다.** 더 주면 자르고, 스켈레톤도 같은 수를 그린다.
 *  3. **랭크는 브랜드 토큰**(면 `primary.primaryWeak` / 숫자 `primary.primary`)이고
 *     §2.1 의 랭크 원 그대로다 — 두 번째 랭크 언어를 만들지 않는다.
 *  4. **메타는 댓글 하나뿐.** `MetaRow`(조회·좋아요·댓글)가 트리에 있으면 안 된다.
 *  5. **팔로우는 행을 안 옮긴다.** `following` 이 참으로 바뀌어도 같은 자리·같은 순서다.
 *  6. **빈 상태는 접고(null) 오류는 한 줄로 말한다.** 둘은 다른 사실이다.
 *  7. **스켈레톤은 행과 같은 리듬**(높이·거터·간격)을 쓴다. 링 스피너는 없다.
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

/*
  react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(tests/helpers/reactNativeStub.js).
  호스트 컴포넌트는 **문자열 태그**다 — 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이 된다.
  `StyleSheet.flatten` 만 진짜로 구현한다(`V2Text` 가 face 변환에 쓴다).
  `ScrollView` 를 **일부러 넣어 둔다**: 없으면 가로 레일로 되돌린 코드가 `undefined` 태그로
  조용히 돌아 "가로 스크롤러가 없다" 는 단언이 헛돌 수 있다.
*/
jest.mock("react-native", () => {
  const flatten = (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) {
      return style.reduce<Record<string, unknown>>(
        (acc, item) => ({ ...acc, ...flatten(item) }),
        {},
      )
    }
    if (style && typeof style === "object")
      return { ...(style as Record<string, unknown>) }
    return {}
  }
  return {
    Platform: {
      OS: "ios",
      select: (spec: Record<string, unknown>) => spec.ios,
    },
    StyleSheet: { create: <T>(styles: T): T => styles, flatten },
    View: "View",
    Text: "Text",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    FlatList: "FlatList",
    ActivityIndicator: "ActivityIndicator",
  }
})
// SVG 를 (전이적으로라도) 들여오면 스위트째로 죽는다 — 아이콘은 태그로 두고 이름만 본다.
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
// `V2Avatar` 의 원격 사진 경로. 여기서 보는 것은 크기와 자리다.
jest.mock("expo-image", () => ({ Image: "Image" }))
/*
  `V2Skeleton` 은 reanimated·expo-linear-gradient 를 끌고 온다. 스켈레톤에서 보는 것은
  "어떤 자리에 어떤 크기의 막대를 놓았나" 라 프롭이면 충분하다.
*/
jest.mock("@/src/design-system-v2/components/V2Skeleton", () => ({
  V2Skeleton: "V2Skeleton",
  V2SkeletonGroup: "V2SkeletonGroup",
}))
/*
  `V2Button` 은 **진짜로 부른다** — 재시도 버튼과 `FollowButton` 의 면(fill/weak)이 계약이다.
  대신 그 아래 `V2DotLoader`(reanimated ESM)에서 체인을 끊는다.
*/
jest.mock("@/src/design-system-v2/components/V2DotLoader", () => ({
  V2DotLoader: "V2DotLoader",
}))
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))
/*
  번역은 **앱의 진짜 리소스**로 돌린다. 표를 테스트에 베껴 두면 카피가 바뀌어도 초록이다.
  네임스페이스를 실제로 갈라 준다 — 섹션 카피는 `common`, 순위 접근성 문구는 `recipe` 다.
*/
jest.mock("react-i18next", () => ({
  useTranslation: (namespace?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const template = mockLeaf(namespace, key) ?? key
      const data = (options?.replace ?? options ?? {}) as Record<
        string,
        unknown
      >
      return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
        String(data[name] ?? ""),
      )
    },
    i18n: { language: mockLanguage },
  }),
}))
// `V2Avatar` 의 "실패한 URL" 한 칸. 렌더러가 없으므로 초깃값으로 고정한다.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => [initial, () => {}],
}))
/*
  `useLoadingVisible` 은 타이머 두 개(delay 180 / minDuration 420)로 가시성을 늦추는 DS 훅이다.
  그 문턱은 **그 파일의 계약**이고 여기서 볼 것이 아니다 — 여기서 보는 것은 (1) 어느 자리로
  대기를 세는가 (2) "보이기로 했을 때" 무엇을 그리는가, 둘이다. 그래서 인자를 기록하고
  `isLoading` 을 그대로 통과시킨다.
*/
jest.mock("@/src/design-system-v2/hooks/useLoadingVisible", () => ({
  useLoadingVisible: (
    isLoading: boolean,
    options: { surface: string },
  ): boolean => {
    mockLoadingCalls.push({ isLoading, surface: options.surface })
    return isLoading
  },
}))

let mockMode: "light" | "dark" = "light"
let mockLanguage = "ko"
let mockLoadingCalls: { isLoading: boolean; surface: string }[] = []

import koCommon from "@/src/i18n/locales/ko/common.json"
import koRecipe from "@/src/i18n/locales/ko/recipe.json"

/** `"community.trending.title"` → 그 네임스페이스 리소스의 잎 값. 없으면 undefined. */
function mockLeaf(namespace: string | undefined, key: string) {
  const root: unknown = namespace === "recipe" ? koRecipe : koCommon
  const found = key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      root,
    )
  return typeof found === "string" ? found : undefined
}

import { resolveTheme } from "@/src/design-system-v2/theme"
import type { V2AvatarSize } from "@/src/design-system-v2/components/V2Avatar"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { radius } from "@/src/design-system-v2/tokens/radius"
import {
  controlHeight,
  iconSize,
  touchTarget,
} from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"

import {
  CHIP_GAP,
  COMMUNITY_GUTTER,
  POST_ROW_RANK_SIZE,
  ROW,
} from "@/src/features/recipe/components/community/communityLayout"
import { MetaRow } from "@/src/features/recipe/components/community/MetaRow"
import { MicroPill } from "@/src/features/recipe/components/community/MicroPill"
import { SectionBand } from "@/src/features/recipe/components/community/SectionBand"
import { SectionHeader } from "@/src/features/recipe/components/community/SectionHeader"
import { SectionErrorLine } from "@/src/features/recipe/components/community/SectionErrorLine"
import { FollowButton } from "@/src/features/recipe/components/community/FollowButton"
import {
  TRENDING_POST_COUNT,
  TRENDING_ROW_HEIGHT,
  TRENDING_SURFACE,
  TrendingPostsSection,
  type TrendingPost,
} from "@/src/features/recipe/components/community/TrendingPostsSection"
import {
  NEIGHBOR_SUGGESTION_AVATAR,
  NEIGHBOR_SUGGESTION_BADGE_MAX,
  NEIGHBOR_SUGGESTION_COUNT,
  NEIGHBOR_SUGGESTION_ROW_HEIGHT,
  NEIGHBOR_SUGGESTION_SURFACE,
  NeighborSuggestionSection,
  type NeighborSuggestion,
} from "@/src/features/recipe/components/community/NeighborSuggestionSection"

const light = resolveTheme("light").colors

/* ── 엘리먼트 트리 읽기 (communityPrimitives.test.ts 와 같은 도구) ──────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

/** style 배열/함수/중첩을 RN 과 같은 순서(뒤가 이김)로 편다. falsy 는 무시. */
function flatten(style: unknown): Style {
  if (typeof style === "function") {
    // Pressable 의 style 은 ({pressed}) => … 다. 안 눌린 상태를 본다.
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

const styleOf = (element: Element): Style => flatten(element.props.style)

function childrenOf(element: Element): Element[] {
  const raw = element.props.children
  const list = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return list.filter(isElement)
}

/**
 * 트리 전체(자기 자신 포함)를 훑는다. **함수 컴포넌트를 만나면 본문을 호출해 펼친다** —
 * 그래야 `FollowButton` 안의 `V2Button` 안의 `Pressable` 까지 사정거리에 들어온다.
 * (`forwardRef` 로 만든 `V2Text` 는 함수가 아니라 객체라 여기서 멈춘다 — 프롭으로 읽는다.)
 */
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

/** 컴포넌트를 호출해 트리 뿌리를 받는다. 렌더러가 아니라 함수 호출이다. */
function render<P>(component: (props: P) => unknown, props: P): Element {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

/** 렌더된 `<V2Text>` 안의 문자열을 이어 붙인다. */
function textOf(element: Element): string {
  const raw = element.props.children
  return (Array.isArray(raw) ? raw : [raw]).map(String).join("")
}

/** 트리 안의 모든 텍스트(V2Text · 호스트 Text). */
function allText(root: Element): string[] {
  return walkDeep(root)
    .filter((el) => el.type === V2Text || el.type === "Text")
    .map(textOf)
}

/** `height` 로 행을 집는다 — 행과 스켈레톤 행이 같은 스타일 객체를 쓰는지 보는 도구. */
const rowsOf = (root: Element, height: number, type: unknown): Element[] =>
  walkDeep(root).filter(
    (el) => el.type === type && styleOf(el).height === height,
  )

const noop = () => {}

afterEach(() => {
  mockMode = "light"
  mockLanguage = "ko"
  mockLoadingCalls = []
})

/* ── 픽스처 ─────────────────────────────────────────────────────────────── */

const trendingPost = (n: number): TrendingPost => ({
  id: `p${n}`,
  title: `저염식 ${n}번째 이야기 — 오늘 뭐 드셨어요?`,
  commentCount: n * 7,
})

const trendingPosts = (count: number): TrendingPost[] =>
  Array.from({ length: count }, (_unused, i) => trendingPost(i + 1))

const trendingProps = (over: Record<string, unknown> = {}) => ({
  posts: trendingPosts(5),
  onRetry: noop,
  onPressPost: noop,
  onPressAll: noop,
  ...over,
})

const neighbor = (n: number, over: Partial<NeighborSuggestion> = {}) => ({
  id: `a${n}`,
  name: `이웃${n}`,
  avatarUri: `https://example.test/${n}.jpg`,
  badges: ["CKD 3단계", "식단 인증", "저염식"],
  latestPostTitle: `${n}번째 이웃의 최근 글 — 칼륨 낮춘 반찬 세 가지`,
  following: false,
  ...over,
})

/**
 * `V2Avatar` 의 크기 사다리. 타입에는 값이 없어서 여기 적되, **빠진 칸이 있으면
 * 컴파일이 깨지게** 묶어 둔다 — DS 에 36 이 생기는 날 이 자리가 먼저 말해야 한다
 * (그 날이 `NEIGHBOR_SUGGESTION_AVATAR` 를 다시 판단하는 날이다).
 */
const AVATAR_LADDER = [
  24, 28, 40, 48, 56, 60,
] as const satisfies readonly V2AvatarSize[]
const AVATAR_LADDER_IS_COMPLETE: Exclude<
  V2AvatarSize,
  (typeof AVATAR_LADDER)[number]
> extends never
  ? true
  : never = true

/** 승인된 형태가 지정한 아바타 한 변. 사다리에 없어서 스냅해야 하는 값이다. */
const APPROVED_AVATAR = 36

const neighborProps = (over: Record<string, unknown> = {}) => ({
  authors: [neighbor(1), neighbor(2), neighbor(3), neighbor(4)],
  reason: { stage: "CKD 3단계", topic: "식단 인증" },
  onRetry: noop,
  onPressAuthor: noop,
  onToggleFollow: noop,
  ...over,
})

/* ══ 1 · 지금 이야기 중 — D23 ═════════════════════════════════════════════ */

describe("TrendingPostsSection — 세로 랭킹 3행", () => {
  it("행이 **세로로** 쌓인다 — 가로 스크롤러가 트리에 없다", () => {
    const root = render(TrendingPostsSection, trendingProps())
    const tree = walkDeep(root)

    /*
      승인된 재디자인이 뒤집은 축이다. 세 갈래로 막는다:
      태그(ScrollView/FlatList)·프롭(horizontal)·스타일(목록 컨테이너의 flexDirection).
    */
    expect(tree.some((el) => el.type === "ScrollView")).toBe(false)
    expect(tree.some((el) => el.type === "FlatList")).toBe(false)
    expect(tree.every((el) => el.props.horizontal === undefined)).toBe(true)
    // 뿌리(섹션 컨테이너)는 열 방향이다 — `row` 를 주면 세 행이 옆으로 눕는다.
    expect(styleOf(root).flexDirection).toBeUndefined()
  })

  it("5개를 줘도 **정확히 3행**만 그린다", () => {
    const root = render(TrendingPostsSection, trendingProps())
    const rows = rowsOf(root, TRENDING_ROW_HEIGHT, "Pressable")

    expect(TRENDING_POST_COUNT).toBe(3)
    expect(rows).toHaveLength(TRENDING_POST_COUNT)
    /*
      높이는 **그려진 값**에서 읽어 토큰과 맞춘다 — 상수끼리 비교하면 상수를 바꾼 순간
      둘이 같이 움직여 아무것도 안 지킨다. 44 는 §3.2 의 실측 랭킹 행이자 최소 터치 타겟이다.
    */
    rows.forEach((row) => {
      expect(styleOf(row).height).toBe(touchTarget.min)
    })
  })

  it("랭크는 §2.1 의 **랭크 원**이고 숫자가 브랜드 토큰이다", () => {
    const root = render(TrendingPostsSection, trendingProps())
    const rows = rowsOf(root, TRENDING_ROW_HEIGHT, "Pressable")

    const circles = rows.map((row) => {
      const [circle] = walkDeep(row).filter(
        (el) => el.type === "View" && styleOf(el).borderRadius === radius.full,
      )
      return circle
    })

    circles.forEach((circle) => {
      const s = styleOf(circle)
      expect(s.width).toBe(POST_ROW_RANK_SIZE)
      expect(s.height).toBe(POST_ROW_RANK_SIZE)
      // 2자리(10위 이상)에서 원이 찌그러지지 않게 — §2.1 `minWidth 24`.
      expect(s.minWidth).toBe(POST_ROW_RANK_SIZE)
      expect(s.backgroundColor).toBe(light.primary.primaryWeak)
    })

    const numerals = circles.map((circle) => {
      const [text] = walkDeep(circle).filter((el) => el.type === V2Text)
      return text
    })

    // 숫자는 브랜드색이고 1·2·3 순서다. 색이 회색으로 바뀌면 순위가 장식이 된다.
    numerals.forEach((numeral) => {
      expect(numeral.props.color).toBe(light.primary.primary)
      expect(numeral.props.token).toBe("label.xSmall")
    })
    expect(numerals.map(textOf)).toEqual(["1", "2", "3"])
  })

  it("메타는 **댓글 수 하나뿐**이다 — 조회·좋아요가 없다", () => {
    const root = render(TrendingPostsSection, trendingProps())
    const rows = rowsOf(root, TRENDING_ROW_HEIGHT, "Pressable")
    /*
      **행이 없으면 아래 `forEach` 는 아무것도 안 본다.** 그 상태로도 남은 두 단언은
      초록이라, 개수를 먼저 못박지 않으면 이 테스트는 스스로 비어 버린다.
    */
    expect(rows).toHaveLength(TRENDING_POST_COUNT)

    rows.forEach((row, index) => {
      const icons = walkDeep(row).filter((el) => el.type === "V2Icon")
      expect(icons.map((icon) => icon.props.name)).toEqual(["chatOutline"])
      expect(icons[0].props.size).toBe("xs")

      // 행 안의 숫자는 랭크와 댓글 수, 둘뿐이다(조회 N·좋아요 N 이 끼면 넷이 된다).
      const numbers = allText(row).filter((text) => /^\d[\d,]*$/.test(text))
      expect(numbers).toEqual([
        String(index + 1),
        String(trendingPost(index + 1).commentCount),
      ])
    })

    // `MetaRow`(조회·좋아요·댓글 한 줄)를 쓰면 위 단언이 무너진다 — 통째로 금지한다.
    expect(findAll(root, MetaRow)).toHaveLength(0)
    expect(allText(root).some((text) => text.includes("조회"))).toBe(false)
  })

  it("제목은 한 줄 말줄임이고 남는 폭을 전부 갖는다", () => {
    const root = render(TrendingPostsSection, trendingProps())
    const [row] = rowsOf(root, TRENDING_ROW_HEIGHT, "Pressable")

    const [title] = walkDeep(row).filter(
      (el) => el.type === V2Text && el.props.token === "subtext.largeStrong",
    )
    expect(title.props.numberOfLines).toBe(1)
    expect(styleOf(title).flex).toBe(1)
    expect(textOf(title)).toBe(trendingPost(1).title)
  })

  it("헤더 카피는 `요즘 이야기 중` 이고 `실시간 인기글` 이 아니다", () => {
    const root = render(TrendingPostsSection, trendingProps())
    const texts = allText(root)

    expect(texts).toContain(koCommon.community.trending.title)
    /*
      `"지금 이야기 중"` 을 기대하던 줄이었다. 리소스는 `요즘 이야기 중` 인데 아무도 이
      줄을 같이 옮기지 않아 **이 작업 전부터 빨간 상태로 남아 있었다.** 카피를 여기서
      다시 정하지 않고 리소스가 말하는 것을 못 박는다 — 지켜야 할 것은 철자가 아니라
      **"인기글" 이라는 약속을 안 한다** 는 아래 단언이다.
    */
    expect(koCommon.community.trending.title).toBe("요즘 이야기 중")
    /*
      "인기글" 은 리더보드를 약속하고 세 줄은 그 약속을 못 지킨다. 그 이름은 목적지
      화면(S3)이 계속 갖는다 — 두 카피가 같아지면 이 판정이 조용히 되돌려진 것이다.
    */
    expect(texts).not.toContain(koCommon.community.search.realtimePopular)
  })

  it("머리는 **`SectionHeader` 한 벌**이다 — 손으로 다시 그린 사본이 아니다", () => {
    /*
      이 섹션은 같은 높이·같은 산술(47 · marginTop 8)의 헤더를 통째로 베껴 쓰고 있었다.
      이유는 `SectionHeader` 에 **후행 라벨 슬롯이 없어서**였다. 사본을 지운 방법은
      그 슬롯을 판 것이다(`actionLabel`) — 컴포넌트를 안 쓰고 돌아가면 여기가 깨진다.
    */
    const root = render(TrendingPostsSection, trendingProps())
    const [header] = findAll(root, SectionHeader)
    expect(header).toBeDefined()
    expect(header.props.title).toBe(koCommon.community.trending.title)
    expect(header.props.actionLabel).toBe(koCommon.community.trending.all)
    expect(header.props.accessibilityLabel).toBe(
      koCommon.community.trending.allAccessibility,
    )
  })

  it("헤더의 `전체` + chevron 이 인기글 화면으로 보낸다", () => {
    const pressed: string[] = []
    const root = render(
      TrendingPostsSection,
      trendingProps({ onPressAll: () => pressed.push("all") }),
    )

    const [header] = walkDeep(root).filter(
      (el) =>
        el.type === "Pressable" && styleOf(el).height === ROW.sectionHeader,
    )
    expect(allText(header)).toContain(koCommon.community.trending.all)
    expect(
      walkDeep(header).some(
        (el) => el.type === "V2Icon" && el.props.name === "chevronRight",
      ),
    ).toBe(true)
    ;(header.props.onPress as () => void)()
    expect(pressed).toEqual(["all"])
  })

  it("행을 누르면 글과 **순위**를 같이 넘긴다", () => {
    const calls: { id: string; rank: number }[] = []
    const root = render(
      TrendingPostsSection,
      trendingProps({
        onPressPost: (post: TrendingPost, rank: number) =>
          calls.push({ id: post.id, rank }),
      }),
    )

    rowsOf(root, TRENDING_ROW_HEIGHT, "Pressable").forEach((row) => {
      ;(row.props.onPress as () => void)()
    })
    expect(calls).toEqual([
      { id: "p1", rank: 1 },
      { id: "p2", rank: 2 },
      { id: "p3", rank: 3 },
    ])
    // 순위를 읽어 준다(D23 접근성) — 현행 `post.popularAccessibility` 키 그대로.
    const [first] = rowsOf(root, TRENDING_ROW_HEIGHT, "Pressable")
    expect(first.props.accessibilityLabel).toBe(
      `인기글 1위 ${trendingPost(1).title}`,
    )
  })

  it("**빈 상태는 섹션째로 접는다** — 밴드도 안 남는다", () => {
    expect(
      TrendingPostsSection(trendingProps({ posts: [] }) as never),
    ).toBeNull()
    /*
      밴드만 남으면 접은 것이 아니다 — 섹션이 밴드를 들고 있다는 계약. **둘**인 것은
      이 섹션이 이제 피드 한가운데(세 번째 글 다음)에 끼어들기 때문이다: 위만 끊으면
      마지막 순위 행이 다음 글로 흘러든다. 접을 때 둘 다 같이 사라져야 하므로 둘 다
      이 컴포넌트의 것이다.
    */
    const filled = render(TrendingPostsSection, trendingProps())
    expect(findAll(filled, SectionBand)).toHaveLength(2)
  })

  it("**오류는 한 줄로 말한다** — 접지 않고, 재시도는 `retryable` 일 때만", () => {
    const retried: string[] = []
    const root = render(
      TrendingPostsSection,
      trendingProps({
        posts: [],
        failure: { title: "인기글을 불러오지 못했어요", retryable: true },
        onRetry: () => retried.push("retry"),
      }),
    )

    // 빈 상태와 달리 접히지 않는다(오류는 말하고 빈 상태는 접는다).
    const [line] = findAll(root, SectionErrorLine)
    expect(line).toBeDefined()
    expect(allText(root)).toContain("인기글을 불러오지 못했어요")

    const retry = walkDeep(root).filter(
      (el) => el.type === "Text" && textOf(el) === koCommon.action.retry,
    )
    expect(retry).toHaveLength(1)
    ;(
      walkDeep(root).find(
        (el) =>
          el.type === "Pressable" &&
          el.props.accessibilityRole === "button" &&
          allText(el).includes(koCommon.action.retry),
      )?.props.onPress as () => void
    )()
    expect(retried).toEqual(["retry"])
  })

  it("재시도해도 안 되는 오류에는 버튼을 안 그린다", () => {
    const root = render(
      TrendingPostsSection,
      trendingProps({
        posts: [],
        failure: { title: "차단된 사용자예요", retryable: false },
      }),
    )
    expect(allText(root)).not.toContain(koCommon.action.retry)
  })

  it("대기는 **인기글 판**으로 세어진다 — 피드와 한 칸에 안 섞는다", () => {
    render(TrendingPostsSection, trendingProps({ posts: [], isLoading: true }))

    /*
      D15: 가시성을 `useLoadingVisible(..., { surface })` 에서 받아야만 `wait_perceived`
      가 나간다. 직접 `isLoading` 을 보고 스켈레톤을 그리면 화면은 멀쩡한데 대기가
      아무 데도 안 세어진다 — 그 통로가 실제로 연결돼 있는지를 여기서 본다.
    */
    expect(mockLoadingCalls).toEqual([
      { isLoading: true, surface: TRENDING_SURFACE },
    ])
    /*
      `community_feed` 가 아니다: 화면은 모든 행에 실리는 `screen_name` 이 말하고,
      `surface` 는 따로 로드되고 따로 실패하는 판을 말한다(`events.ts` 머리말).
    */
    expect(TRENDING_SURFACE).toBe("community_popular")
  })

  it("스켈레톤은 행과 **같은 리듬**이고 링 스피너가 아니다", () => {
    const loading = render(
      TrendingPostsSection,
      trendingProps({ posts: [], isLoading: true }),
    )
    const filled = render(TrendingPostsSection, trendingProps())

    const skeletonRows = rowsOf(loading, TRENDING_ROW_HEIGHT, "View")
    const realRows = rowsOf(filled, TRENDING_ROW_HEIGHT, "Pressable")
    expect(skeletonRows).toHaveLength(TRENDING_POST_COUNT)

    // 높이만 같은 게 아니라 거터·간격·정렬이 같아야 도착 순간 레이아웃이 안 튄다.
    const rhythm = (el: Element) => {
      const s = styleOf(el)
      return {
        height: s.height,
        flexDirection: s.flexDirection,
        alignItems: s.alignItems,
        paddingHorizontal: s.paddingHorizontal,
        gap: s.gap,
      }
    }
    expect(rhythm(skeletonRows[0])).toEqual(rhythm(realRows[0]))
    expect(rhythm(realRows[0]).paddingHorizontal).toBe(COMMUNITY_GUTTER)

    // 랭크 원 자리도 같은 지름으로 잡는다.
    const [rankBar] = walkDeep(skeletonRows[0]).filter(
      (el) => el.type === "V2Skeleton" && el.props.radius === "full",
    )
    expect(rankBar.props.width).toBe(POST_ROW_RANK_SIZE)
    expect(rankBar.props.height).toBe(POST_ROW_RANK_SIZE)

    // 댓글 수 자리(아이콘 16 + 간격 2 + 두 자리)를 미리 비워 둔다.
    const bars = walkDeep(skeletonRows[0]).filter(
      (el) => el.type === "V2Skeleton",
    )
    expect(bars[bars.length - 1].props.width).toBe(
      iconSize.xs + spacing[2] + 14,
    )

    // 링 스피너 금지(전역 §0.2).
    expect(
      walkDeep(loading).some(
        (el) => el.type === "ActivityIndicator" || el.type === "V2DotLoader",
      ),
    ).toBe(false)
    // 스크린리더에는 "불러오는 중" 을 한 번만 — 묶음은 목록을 만드는 쪽이 씌운다.
    expect(
      walkDeep(loading).filter((el) => el.type === "V2SkeletonGroup"),
    ).toHaveLength(1)
  })

  it("이미 받아 둔 글이 있으면 다시 불러오는 동안에도 글을 계속 그린다", () => {
    const root = render(
      TrendingPostsSection,
      trendingProps({ isLoading: true }),
    )
    expect(rowsOf(root, TRENDING_ROW_HEIGHT, "Pressable")).toHaveLength(
      TRENDING_POST_COUNT,
    )
    expect(walkDeep(root).some((el) => el.type === "V2Skeleton")).toBe(false)
  })

  it("다크 모드에서도 토큰을 따라간다 — 리터럴 색이 아니다", () => {
    mockMode = "dark"
    const dark = resolveTheme("dark").colors
    const root = render(TrendingPostsSection, trendingProps())
    const [row] = rowsOf(root, TRENDING_ROW_HEIGHT, "Pressable")
    const [circle] = walkDeep(row).filter(
      (el) => el.type === "View" && styleOf(el).borderRadius === radius.full,
    )
    expect(styleOf(circle).backgroundColor).toBe(dark.primary.primaryWeak)
  })
})

/* ══ 2 · 요즘 글 쓰는 이웃 — D24·D28 ═════════════════════════════════════════ */

describe("NeighborSuggestionSection — 세로 2행", () => {
  it("행이 **세로로** 쌓인다 — 가로 카드 레일이 아니다", () => {
    const root = render(NeighborSuggestionSection, neighborProps())
    const tree = walkDeep(root)

    expect(tree.some((el) => el.type === "ScrollView")).toBe(false)
    expect(tree.some((el) => el.type === "FlatList")).toBe(false)
    expect(tree.every((el) => el.props.horizontal === undefined)).toBe(true)
    expect(styleOf(root).flexDirection).toBeUndefined()
  })

  it("4명을 줘도 **정확히 2행**만 그린다", () => {
    const root = render(NeighborSuggestionSection, neighborProps())
    const rows = rowsOf(root, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "Pressable")

    expect(NEIGHBOR_SUGGESTION_COUNT).toBe(2)
    expect(rows).toHaveLength(NEIGHBOR_SUGGESTION_COUNT)
  })

  it("행마다 **최근 글 제목 한 줄**이 있다 — 이 섹션의 존재 이유", () => {
    const root = render(NeighborSuggestionSection, neighborProps())
    const rows = rowsOf(root, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "Pressable")
    // 행이 없으면 아래 `forEach` 가 아무것도 안 본다 — 개수를 먼저 못박는다.
    expect(rows).toHaveLength(NEIGHBOR_SUGGESTION_COUNT)

    rows.forEach((row, index) => {
      const expected = neighbor(index + 1).latestPostTitle
      const [line] = walkDeep(row).filter(
        (el) =>
          el.type === V2Text &&
          el.props.numberOfLines === 1 &&
          textOf(el).includes(expected),
      )
      // 시안의 카드에는 없던 줄이다. 없으면 팔로우 결정에 근거가 없다.
      expect(line).toBeDefined()
      // 라벨이 없으면 이 줄이 자기소개인지 글 제목인지 모른다(D28).
      expect(textOf(line)).toContain(koCommon.community.neighbors.latestPostLabel)
      expect(textOf(line)).toContain(" · ")
    })
  })

  it("아바타·닉네임·배지 0~2개·팔로우 버튼이 한 행에 있다", () => {
    const root = render(NeighborSuggestionSection, neighborProps())
    const [row] = rowsOf(root, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "Pressable")

    const [avatar] = walkDeep(row).filter(
      (el) => el.type === "View" && styleOf(el).borderRadius === radius.full,
    )
    /*
      상수와 비교하면 상수를 바꾼 순간 둘이 같이 움직여 아무것도 안 지킨다(변이 N06 이
      그렇게 살아남았다). **승인된 36 에서 사다리 최근접 칸**이라는 규칙 자체를 잰다.
    */
    expect(AVATAR_LADDER_IS_COMPLETE).toBe(true)
    const nearest = AVATAR_LADDER.reduce((best, step) =>
      Math.abs(step - APPROVED_AVATAR) < Math.abs(best - APPROVED_AVATAR)
        ? step
        : best,
    )
    expect(nearest).toBe(40)
    expect(NEIGHBOR_SUGGESTION_AVATAR).toBe(nearest)
    expect(styleOf(avatar).width).toBe(nearest)
    expect(styleOf(avatar).height).toBe(nearest)

    const [name] = walkDeep(row).filter(
      (el) => el.type === V2Text && el.props.token === "label.small",
    )
    expect(textOf(name)).toBe("이웃1")

    // 배지는 셋을 줘도 둘까지 — 세 개째는 닉네임을 밀어낸다.
    const pills = findAll(row, MicroPill)
    expect(pills).toHaveLength(NEIGHBOR_SUGGESTION_BADGE_MAX)
    expect(pills.map((pill) => pill.props.label)).toEqual([
      "CKD 3단계",
      "식단 인증",
    ])

    expect(findAll(row, FollowButton)).toHaveLength(1)
    // 배지 줄의 높이 21 이 행 높이의 항이다(위 상수 머리말).
    const [nameRow] = walkDeep(row).filter(
      (el) => el.type === "View" && styleOf(el).gap === CHIP_GAP,
    )
    expect(styleOf(nameRow).height).toBe(ROW.microPill)
  })

  it("**팔로우해도 행이 사라지거나 자리를 바꾸지 않는다**", () => {
    const before = render(NeighborSuggestionSection, neighborProps())
    const after = render(
      NeighborSuggestionSection,
      neighborProps({
        // 낙관적 토글이 지나간 뒤 — 1번이 `팔로잉` 이 됐다.
        authors: [
          neighbor(1, { following: true }),
          neighbor(2),
          neighbor(3),
          neighbor(4),
        ],
      }),
    )

    const names = (root: Element) =>
      rowsOf(root, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "Pressable").map(
        (row) => row.props.accessibilityLabel,
      )

    // 같은 두 행이 같은 순서로 남는다. 거르거나 뒤로 미는 순간 이 단언이 깨진다.
    expect(names(after)).toEqual(names(before))
    expect(names(after)).toEqual([
      "이웃1님의 프로필 보기",
      "이웃2님의 프로필 보기",
    ])

    // 바뀌는 것은 버튼의 면과 카피뿐이다(§5.7 — `팔로잉`=weak).
    const buttonOf = (root: Element, index: number) => {
      const row = rowsOf(root, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "Pressable")[
        index
      ]
      const [button] = walkDeep(row).filter(
        (el) =>
          el.type === "Pressable" && styleOf(el).minHeight === controlHeight.sm,
      )
      return button
    }
    expect(styleOf(buttonOf(before, 0)).backgroundColor).toBe(
      light.primary.primary,
    )
    expect(styleOf(buttonOf(after, 0)).backgroundColor).toBe(
      light.primary.primaryWeak,
    )
    expect(allText(buttonOf(after, 0))).toContain(
      koCommon.community.author.unfollow,
    )
  })

  it("행 탭은 프로필로, 버튼 탭은 토글로 간다", () => {
    const opened: string[] = []
    const toggled: string[] = []
    const root = render(
      NeighborSuggestionSection,
      neighborProps({
        onPressAuthor: (author: NeighborSuggestion) => opened.push(author.id),
        onToggleFollow: (author: NeighborSuggestion) => toggled.push(author.id),
      }),
    )

    const [row] = rowsOf(root, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "Pressable")
    ;(row.props.onPress as () => void)()
    expect(opened).toEqual(["a1"])

    const [button] = findAll(row, FollowButton)
    ;(button.props.onPress as () => void)()
    expect(toggled).toEqual(["a1"])
    // 행 탭은 한 번뿐이다 — 버튼 탭이 행까지 켜면 프로필로 튄다.
    expect(opened).toEqual(["a1"])
  })

  it("헤더가 **왜 이 사람들이 떴는지**를 한 줄로 말한다", () => {
    const root = render(NeighborSuggestionSection, neighborProps())
    const texts = allText(root)

    expect(texts).toContain(koCommon.community.neighbors.title)
    // D28: 정렬이 단계를 안 보므로 "비슷한 단계" 는 거짓이었다. 알고리즘이 고르는 건
    // "최근 90일 안에 글 쓴 사람" 이고, 제목은 그것만 주장한다.
    expect(koCommon.community.neighbors.title).toBe("요즘 글 쓰는 이웃")
    // 단계 · 주제가 실제로 문장에 박힌다. 설명 없는 추천은 신뢰를 못 얻는다.
    expect(texts.some((text) => text.includes("CKD 3단계 · 식단 인증"))).toBe(
      true,
    )
  })

  it("이유를 모르면 **아는 척하지 않는다** — 부제를 안 그린다", () => {
    const root = render(
      NeighborSuggestionSection,
      neighborProps({ reason: undefined }),
    )
    const texts = allText(root)
    expect(texts).toContain(koCommon.community.neighbors.title)
    // 가운뎃점만 남은 문장이나 빈 자리 문장이 새지 않는다.
    expect(texts.some((text) => text.includes("이웃이에요"))).toBe(false)

    // 한 조각만 알면 그 하나로 말한다(구분자가 안 붙는다).
    const half = render(
      NeighborSuggestionSection,
      neighborProps({ reason: { stage: "CKD 3단계" } }),
    )
    expect(
      allText(half).some(
        (text) => text.includes("CKD 3단계") && !text.includes("·"),
      ),
    ).toBe(true)
  })

  it("**빈 상태는 섹션째로 접는다**", () => {
    expect(
      NeighborSuggestionSection(neighborProps({ authors: [] }) as never),
    ).toBeNull()
    // 위아래 둘 — 이유는 `TrendingPostsSection` 의 같은 단언 주석.
    const filled = render(NeighborSuggestionSection, neighborProps())
    expect(findAll(filled, SectionBand)).toHaveLength(2)
  })

  it("오류는 한 줄 + 재시도다 — 접지 않고 말한다", () => {
    const root = render(
      NeighborSuggestionSection,
      neighborProps({
        authors: [],
        failure: { title: "이웃을 불러오지 못했어요", retryable: true },
      }),
    )

    expect(findAll(root, SectionErrorLine)).toHaveLength(1)
    expect(allText(root)).toContain("이웃을 불러오지 못했어요")
    expect(allText(root)).toContain(koCommon.action.retry)
  })

  it("대기는 **이웃 판**으로 세어진다", () => {
    render(
      NeighborSuggestionSection,
      neighborProps({ authors: [], isLoading: true }),
    )
    expect(mockLoadingCalls).toEqual([
      { isLoading: true, surface: NEIGHBOR_SUGGESTION_SURFACE },
    ])
    expect(NEIGHBOR_SUGGESTION_SURFACE).toBe("community_neighbors")
  })

  it("스켈레톤은 행과 **같은 리듬**이고 2행이다", () => {
    const loading = render(
      NeighborSuggestionSection,
      neighborProps({ authors: [], isLoading: true }),
    )
    const filled = render(NeighborSuggestionSection, neighborProps())

    const skeletonRows = rowsOf(loading, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "View")
    const realRows = rowsOf(filled, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "Pressable")
    expect(skeletonRows).toHaveLength(NEIGHBOR_SUGGESTION_COUNT)

    const rhythm = (el: Element) => {
      const s = styleOf(el)
      return {
        height: s.height,
        flexDirection: s.flexDirection,
        alignItems: s.alignItems,
        paddingHorizontal: s.paddingHorizontal,
        gap: s.gap,
      }
    }
    expect(rhythm(skeletonRows[0])).toEqual(rhythm(realRows[0]))
    expect(rhythm(realRows[0]).paddingHorizontal).toBe(COMMUNITY_GUTTER)

    // 아바타 자리와 버튼 자리를 실제 크기로 비워 둔다.
    const bars = walkDeep(skeletonRows[0]).filter(
      (el) => el.type === "V2Skeleton",
    )
    expect(bars[0].props.width).toBe(NEIGHBOR_SUGGESTION_AVATAR)
    expect(bars[0].props.radius).toBe("full")
    expect(bars[bars.length - 1].props.height).toBe(controlHeight.sm)

    expect(
      walkDeep(loading).some(
        (el) => el.type === "ActivityIndicator" || el.type === "V2DotLoader",
      ),
    ).toBe(false)
  })

  it("행 높이는 아바타와 두 줄 중 **큰 쪽**에서 나온다 — 리터럴이 아니다", () => {
    /*
      65 를 여기 베껴 두면 그 숫자를 만드는 항이 틀려도 초록이다. **그려진 높이**를
      토큰에서 다시 합산해 본다: 12 + max(아바타 40, 이름줄 21 + 2 + 제목줄 18) + 12.
      (`communityAuthorPrimitives.test.ts` 가 101·81 에 쓰는 것과 같은 수법.)
    */
    const root = render(NeighborSuggestionSection, neighborProps())
    const [row] = rowsOf(root, NEIGHBOR_SUGGESTION_ROW_HEIGHT, "Pressable")

    expect(styleOf(row).height).toBe(
      spacing[12] +
        Math.max(
          NEIGHBOR_SUGGESTION_AVATAR,
          ROW.microPill + spacing[2] + typography.subtext.medium.lineHeight,
        ) +
        spacing[12],
    )
  })
})
