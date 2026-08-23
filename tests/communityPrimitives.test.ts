/**
 * 커뮤니티 재디자인 **공유 프리미티브**(WBS 1.1 · 1.2 · 1.3 · 1.4)의 계약.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.1 · §2.2 · §2.3 · §2.4 · §2.7,
 * 판정: `01-DECISIONS.md` D10.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 소스 문자열이 아니라 컴포넌트를 **호출**하나
 *
 * 이 저장소의 jest 에는 렌더러가 없다. 그래서 흔히 쓰던 두 수법이 아무것도 보증하지 못했다
 * (`v2CommunityGaps.test.ts` 머리말): 같은 로직을 테스트에 다시 쓰기(사본을 시험한 것),
 * 소스에 문자열이 있는지 훑기(주석이 계약을 대신 만족시킨다).
 *
 * 여기서는 **함수 컴포넌트를 그대로 호출해 돌려받은 엘리먼트 트리를 읽는다.** 열 개 전부
 * 상태가 없고 훅은 테마·번역 둘뿐이라, 렌더러 없이 본문 전체가 실제로 돈다 —
 * 스타일 계산은 컴포넌트 자신의 것이다. `walkDeep` 은 중첩된 함수 컴포넌트를 만나면
 * **그 본문도 호출**한다(흉내 낸 구현이 아니라 진짜 코드다). 색·치수·타이포는 토큰에서
 * 읽어와 비교하므로 토큰이 바뀌면 같이 따라간다.
 *
 * ■ 이 파일이 지키는 것 중 가장 중요한 셋
 *
 *  1. **행 높이 6종**(176/147/118/106/179/138) — `PostRow` 를 하나로 만들 수 있는 유일한
 *     근거다. 여기서는 `postRowHeight()` 의 산수가 아니라 **컴포넌트가 실제로 그 값을
 *     `height` 로 내놓는지**를 본다. 공식이 맞아도 컴포넌트가 안 쓰면 소용없다.
 *  2. **21 vs 23** (D10) — `V2Badge` 의 pill 은 23 이다. `MicroPill` 이 그걸 21 로 못박지
 *     못하면 행마다 최대 4px 어긋나고, 어긋난 뒤에는 어느 숫자가 맞았는지 아무도 모른다.
 *  3. **구분선이 full-bleed 로 남는가** — 좌우 여백이 바깥 상자로 올라가는 순간 Yoga 는
 *     절대 배치 자식을 패딩 안쪽에 놓고, 선이 조용히 20px 인셋된다.
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

/*
  react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(tests/helpers/reactNativeStub.js).
  전역 스텁은 `Platform` 만 갖고 있어 컴포넌트를 못 들여온다 — 이 파일에서만 넓힌다.
  호스트 컴포넌트는 **문자열 태그**다. 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이 된다.
  `StyleSheet.flatten` 만 진짜로 구현한다 — `V2Text` 가 face 변환에 그걸 쓰기 때문이고,
  RN 의 규칙(배열은 평탄화, 뒤가 이김, falsy 무시)이 그게 전부다.
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
    StyleSheet: {
      create: <T>(styles: T): T => styles,
      flatten,
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
  }
})
jest.mock("expo-image", () => ({ Image: "Image" }))
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
/*
  `V2Skeleton` 만 스텁이다 — reanimated·expo-linear-gradient 를 끌고 오고 `useState` 를 쓴다.
  스켈레톤 테스트가 보는 것은 "어떤 자리에 어떤 크기의 막대를 놓았나" 라 그 프롭이면 충분하다.
*/
jest.mock("@/src/design-system-v2/components/V2Skeleton", () => ({
  V2Skeleton: "V2Skeleton",
}))
// `formatTimeAgo` 는 `@/src/i18n` 인스턴스를 통째로 들여온다. 여기서 보는 것은
// **행이 무엇을 넘기는가** 이므로 인자를 기록하고 고정 문자열을 돌려준다.
jest.mock("@/src/features/recipe/utils/timeAgo", () => ({
  formatTimeAgo: (date: Date, language: string) => {
    mockTimeAgoCalls.push({ date, language })
    return "2시간 전"
  },
}))
// 테마는 이 파일이 정한다(모드별 단언이 있다). 훅 본체는 스토어를 보므로 그 한 칸만 바꾼다.
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))
/*
  번역은 **앱의 진짜 ko 리소스**로 돌린다. 표를 테스트에 베껴 두면 리소스가 바뀌어도 초록이다.
  보간 규칙은 i18next 그대로다: `replace` 가 있으면 보간 데이터를 그쪽에서만 읽는다
  (i18next `translator.js`: `data = options.replace && !isString(options.replace) ? options.replace : options`).
  복수형 선택은 그 전에 `count` 로 끝나므로 둘을 같이 넘기는 것이 유효하다.
*/
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const template = mockKoLeaf(key) ?? key
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

let mockMode: "light" | "dark" = "light"
let mockLanguage = "ko"
let mockTimeAgoCalls: { date: Date; language: string }[] = []

import koRecipe from "@/src/i18n/locales/ko/recipe.json"

/** `"post.viewCount"` → ko 리소스의 잎 값. 없으면 undefined. */
function mockKoLeaf(key: string): string | undefined {
  const found = key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      koRecipe,
    )
  return typeof found === "string" ? found : undefined
}

import { resolveTheme } from "@/src/design-system-v2/theme"
import { V2Badge } from "@/src/design-system-v2/components/V2Badge"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import {
  borderWidth,
  controlHeight,
  iconSize,
} from "@/src/design-system-v2/tokens/size"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"

import {
  COMMUNITY_GUTTER,
  POST_ROW_HEADER_GAP,
  POST_ROW_PAD_V,
  POST_ROW_RANK_SIZE,
  POST_ROW_TAG_GAP,
  ROW,
  SECTION_BAND,
  postRowHeight,
} from "@/src/features/recipe/components/community/communityLayout"
import {
  MicroPill,
  type MicroPillFace,
} from "@/src/features/recipe/components/community/MicroPill"
import { MetaRow } from "@/src/features/recipe/components/community/MetaRow"
import {
  PostRow,
  POST_ROW_MAX_TAGS,
  type PostRowPost,
} from "@/src/features/recipe/components/community/PostRow"
import { PostRowSkeleton } from "@/src/features/recipe/components/community/PostRowSkeleton"
import {
  CompactPostRow,
  ImageCountBadge,
  IMAGE_COUNT_BADGE_SIZE,
  type CompactPostRowPost,
} from "@/src/features/recipe/components/community/CompactPostRow"
import { SectionHeader } from "@/src/features/recipe/components/community/SectionHeader"
import { SectionBand } from "@/src/features/recipe/components/community/SectionBand"
import { MorePill } from "@/src/features/recipe/components/community/MorePill"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

/* ── 엘리먼트 트리 읽기 ──────────────────────────────────────────────────── */

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
 * 그래야 `MicroPill` 안의 `V2Badge` 안의 `View` 까지가 이 테스트의 사정거리에 들어온다.
 * (`forwardRef` 로 만든 `V2Text` 는 함수가 아니라 객체라 여기서 멈춘다 — 그건 프롭으로 읽는다.)
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

function findOne(root: Element, type: unknown): Element {
  const [first, ...rest] = findAll(root, type)
  if (!first) throw new Error(`트리에 ${String(type)} 가 없다`)
  if (rest.length > 0) throw new Error(`${String(type)} 가 여러 개다`)
  return first
}

/** 컴포넌트를 호출해 트리 뿌리를 받는다. 렌더러가 아니라 함수 호출이다. */
function render<P>(component: (props: P) => unknown, props: P): Element {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

/** `"subtext.medium"` → 그 타이포 토큰. */
function tokenOf(element: Element): Style {
  const path = String(element.props.token)
  const [group, name] = path.split(".")
  return (typography as unknown as Record<string, Record<string, Style>>)[
    group
  ][name]
}

/** 렌더된 `<V2Text>` 안의 문자열을 이어 붙인다. */
function textOf(element: Element): string {
  const raw = element.props.children
  return (Array.isArray(raw) ? raw : [raw]).map(String).join("")
}

afterEach(() => {
  mockMode = "light"
  mockLanguage = "ko"
  mockTimeAgoCalls = []
})

/* ── 픽스처 ─────────────────────────────────────────────────────────────── */

const basePost: PostRowPost = {
  title: "오늘의 점심 식단 저염식으로 만든 든든한 한끼 식단 공유해요~",
  description:
    "칼륨 수치가 높아 식단 조절 중인데, 오늘은 저염식 위주로 구성해봤어용.",
  category: "질문·상담",
  tags: ["CKD 정보", "식단 인증", "저염식", "칼륨 낮은 식단"],
  imageUri: "https://example.test/thumb.jpg",
  likes: 541,
  comments: 77,
  views: 3291,
  createdAt: new Date("2026-07-28T00:00:00.000Z"),
}

const post = (over: Partial<PostRowPost> = {}): PostRowPost => ({
  ...basePost,
  ...over,
})

const compactPost = (
  over: Partial<CompactPostRowPost> = {},
): CompactPostRowPost => ({
  title: "오늘의 점심 식단 저염식으로 만든 든든한 한끼",
  imageUri: "https://example.test/thumb.jpg",
  imageUris: ["https://example.test/thumb.jpg", "https://example.test/2.jpg"],
  likes: 541,
  comments: 77,
  views: 3291,
  ...over,
})

const noop = () => {}

/* ══ 1.1 · MicroPill — §2.2 · D10 ═════════════════════════════════════════ */

describe("MicroPill — 21 이지 23 이 아니다 (D10)", () => {
  const pillView = (face?: MicroPillFace) => {
    const root = render(MicroPill, { label: "질문·상담", face })
    // MicroPill → V2Badge → View. 배지 본문이 실제로 돈다.
    return render(V2Badge, root.props as never)
  }

  it("**바탕 그대로의 `V2Badge` 는 23 이다** — 이 테스트가 지키려는 차이의 크기", () => {
    /*
      §4-G2 는 `xs` + `shape="pill"` 로 21 이 나온다고 적었지만 4 + 15 + 4 = 23 이다.
      이 단언이 깨지면(예: 누가 `caption.xSmall` 의 lineHeight 를 13 으로 낮추면)
      아래의 명시 높이는 더 이상 필요 없는 우회가 된다 — 그때 다시 판단하라는 표시다.
    */
    const badge = render(V2Badge, {
      size: "xs",
      shape: "pill",
      children: "질문·상담",
    })
    const s = styleOf(badge)
    expect(s.paddingVertical).toBe(spacing[4])
    expect(
      (s.paddingVertical as number) * 2 + typography.caption.xSmall.lineHeight,
    ).toBe(23)
    expect(ROW.microPill).toBe(21)
  })

  it("칠해지는 면 자체가 21 이다 — 세로 여백을 0 으로 덮는다", () => {
    const s = styleOf(pillView())
    expect(s.height).toBe(ROW.microPill)
    expect(s.height).toBe(21)
    // 높이만 주고 여백을 안 지우면 라인박스 15 가 내용상자 13 위에 놓인다(같은 그림, 못 읽는 산수).
    expect(s.paddingVertical).toBe(0)
    // 라벨 15 가 (21−15)/2 = 3 으로 중앙에 놓이는 것은 배지의 center 정렬이 한다.
    expect(s.alignItems).toBe("center")
    expect(s.justifyContent).toBe("center")
  })

  it("알약 모양·가로 여백은 배지 것을 그대로 쓴다", () => {
    const s = styleOf(pillView())
    expect(s.borderRadius).toBe(radius.full)
    expect(s.paddingHorizontal).toBe(spacing[8])
  })

  it("가로 줄에서 **세로 중앙**이다 — D10 의 나머지 절반", () => {
    /*
      `V2Badge` 의 바탕값은 `alignSelf: "flex-start"` 다. 세로 컨테이너에서 폭이 안 늘어나게
      하려는 값인데, 배지가 실제로 놓이는 자리는 전부 **가로 줄**이라 거기서는 세로 위치를
      정한다 — 그대로 두면 21 짜리 알약이 줄 위쪽에 붙는다. D10 은 "명시 높이 21 + **세로
      중앙정렬**" 이라고 적었고, `popular.md` §2.5 도 카테고리 배지가 랭크 원(24)에
      "vertically centred" 라고 실측했다.
    */
    expect(styleOf(pillView()).alignSelf).toBe("center")
    // `center` 는 `flex-start` 와 똑같이 **안 늘어난다**(늘리는 건 `stretch` 뿐) — 폭 hug 는 그대로다.
    expect(styleOf(pillView()).alignSelf).not.toBe("stretch")

    // 실제 자리에서 확인: 랭크가 있는 헤더행은 24 인데 배지는 21 이다.
    const header = childrenOf(
      childrenOf(
        render(PostRow, { post: basePost, rank: 1, onPress: noop }),
      )[0],
    )[0]
    expect(styleOf(header).height).toBe(POST_ROW_RANK_SIZE)
    expect(styleOf(header).alignItems).toBe("center")
    const badge = findAll(header, MicroPill)[0]
    expect(badge.props.face).toBe("ink")
    // 부모가 center 라도 자식의 alignSelf 가 이긴다 — 그래서 배지 쪽에 한 줄이 필요하다.
    // MicroPill → V2Badge → View 로 두 걸음 펴서 **그 자리에 실제로 그려지는 면**을 본다.
    const painted = render(
      V2Badge,
      render(MicroPill, badge.props as never).props as never,
    )
    expect(styleOf(painted).height).toBe(ROW.microPill)
    expect(styleOf(painted).alignSelf).toBe("center")
    expect(POST_ROW_RANK_SIZE - ROW.microPill).toBe(3)
  })

  it("라벨은 10 SemiBold(`caption.xSmall`) — 굵기는 face 로만 말한다", () => {
    const label = findOne(pillView(), "Text")
    const s = flatten(label.props.style)
    expect(s.fontSize).toBe(typography.caption.xSmall.fontSize)
    expect(s.lineHeight).toBe(typography.caption.xSmall.lineHeight)
    expect(s.fontFamily).toBe(typography.caption.xSmall.fontFamily)
    expect(s.letterSpacing).toBe(0)
    expect(s.fontWeight).toBeUndefined()
  })

  it("기본 face 는 `neutral`(태그 칩) — 목록에서 가장 많이 쓰는 면", () => {
    // 기본이 `ink` 로 뒤집히면 face 를 안 넘긴 자리가 전부 잉크 배지가 된다.
    const s = styleOf(pillView())
    expect(s.backgroundColor).toBe(light.fill.normal)
    expect(s.backgroundColor).toBe(styleOf(pillView("neutral")).backgroundColor)
    expect(s.backgroundColor).not.toBe(styleOf(pillView("ink")).backgroundColor)
  })

  it("네 면이 §2.2 표의 토큰으로 간다", () => {
    const seen = (["ink", "neutral", "brandWeak", "onMedia"] as const).map(
      (face) => {
        const view = pillView(face)
        return {
          face,
          bg: styleOf(view).backgroundColor,
          fg: flatten(findOne(view, "Text").props.style).color,
        }
      },
    )
    expect(seen).toEqual([
      // 카테고리 배지 — 잉크 면 + 뒤집힌 글자(다크에서 흰 글자가 되지 않게 background.default)
      { face: "ink", bg: light.label.neutral, fg: light.background.default },
      // 태그 칩 — `fill.normal` 면
      { face: "neutral", bg: light.fill.normal, fg: light.label.neutral },
      // 댓글 `작성자` 배지
      {
        face: "brandWeak",
        bg: light.primary.primaryWeak,
        fg: light.primary.primary,
      },
      // 스토리 `저염식` — 사진 위
      { face: "onMedia", bg: light.static.white, fg: light.primary.primary },
    ])
  })

  it("태그 면은 `fill.normal` 이지 `label.disable`(neutral/weak)이 아니다", () => {
    // `neutral/weak` 칸은 앱의 다른 화면 3곳이 이미 쓴다 — 거기로 가면 그 셋이 같이 변한다.
    const tag = styleOf(pillView("neutral")).backgroundColor
    expect(tag).toBe(light.fill.normal)
    expect(tag).not.toBe(light.label.disable)
  })

  it("다크에서도 토큰을 따라간다 — 리터럴 색이 없다", () => {
    mockMode = "dark"
    expect(styleOf(pillView("ink")).backgroundColor).toBe(dark.label.neutral)
  })
})

/* ══ 1.1 · MetaRow — §2.3 · §4-G21 ═══════════════════════════════════════ */

describe("MetaRow — 조회/좋아요/댓글 + 시각", () => {
  const meta = (over: Record<string, unknown> = {}) =>
    render(MetaRow, {
      viewCount: 3291,
      likeCount: 541,
      commentCount: 77,
      ...over,
    } as never)

  it("지표끼리 12, 아이콘↔숫자는 2 — 16 박스가 이미 여백을 들고 온다 (§4-G21)", () => {
    const root = meta()
    expect(styleOf(root).gap).toBe(spacing[12])

    const stats = childrenOf(root).filter((el) => el.type === "View")
    expect(stats).toHaveLength(2) // 하트 · 말풍선
    for (const stat of stats) expect(styleOf(stat).gap).toBe(spacing[2])
    // 실측 4 를 그대로 주면 16 박스의 여유(1.5)가 얹혀 6~7 로 보인다.
    expect(styleOf(stats[0]).gap).not.toBe(spacing[4])
  })

  it("아이콘은 `xs`(16) — 14 토큰을 새로 만들지 않았다 · 색은 숫자와 같다", () => {
    const icons = findAll(meta(), "V2Icon")
    expect(icons.map((i) => i.props.name)).toEqual([
      "heartFilled",
      "chatOutline",
    ])
    for (const icon of icons) {
      expect(icon.props.size).toBe("xs")
      /*
        시안값은 `label.assistive` 였다. 그 값은 **라이트의 어떤 면 위에서도 1.7:1**
        이라(흰 면 1.68 · 앱 바닥 1.66) 글리프가 사실상 안 그려졌고, 그러면 남는 것은
        `541  77  2시간 전` 이다 — 하트·말풍선은 장식이 아니라 **그 숫자가 무엇인지
        말하는 유일한 표시**라, 지우면 수가 뜻을 잃는다(비텍스트 기준 3:1 대상).
        옆의 숫자와 **같은 회색**으로 올린다: 한 지표 = 한 색, 두 색으로 그릴 이유가 없다.
        계산은 `tests/lightContrastAudit.test.ts` 가 못 박는다(2026-08-21 사용자 지적).
      */
      expect(icon.props.color).toBe(light.label.neutral)
    }
    expect(iconSize.xs).toBe(16)
    expect(Object.values(iconSize)).not.toContain(14)
  })

  it("`조회 N` 은 앱 리소스로 만들고 천 단위로 끊는다", () => {
    const first = findAll(meta(), V2Text)[0]
    expect(textOf(first)).toBe("조회 3,291")
    // 언어를 바꾸면 표기가 그 언어를 따른다(기기 로케일이 아니다).
    expect(textOf(findAll(meta({ likeCount: 12345 }), V2Text)[1])).toBe(
      "12,345",
    )
  })

  it("`viewCount == null` 이면 조회 런이 통째로 없다. **0 은 그린다**", () => {
    const missing = findAll(meta({ viewCount: null }), V2Text)
    expect(missing).toHaveLength(2) // 좋아요 · 댓글 숫자만
    expect(textOf(findAll(meta({ viewCount: 0 }), V2Text)[0])).toBe("조회 0")
  })

  it("좋아요·댓글은 0 도 그린다 (댓글 행 규칙)", () => {
    const zeros = findAll(meta({ likeCount: 0, commentCount: 0 }), V2Text)
    expect([textOf(zeros[1]), textOf(zeros[2])]).toEqual(["0", "0"])
  })

  it("수치는 13 Regular(`subtext.medium`) — 색은 읽히는 가장 옅은 단", () => {
    for (const text of findAll(meta(), V2Text)) {
      expect(tokenOf(text)).toEqual(typography.subtext.medium)
      /*
        시안값 `label.alternative` 는 라이트에서 **2.8:1** 이다 — 본문 4.5:1 은 물론
        큰 글자 기준 3:1 에도 못 미친다. 조회수·좋아요·시각은 읽으라고 그리는 수라
        읽히는 가장 옅은 단(`label.neutral`)으로 올린다. 크기(13)는 그대로이므로
        제목(17 Bold `label.normal`, 14.1:1)과의 위계는 안 무너진다.
      */
      expect(text.props.color).toBe(light.label.neutral)
    }
  })

  it("시각: 목록은 12(`subtext.small`), 상세는 13 — 그리고 **우측 정렬**(§5.4 · §5.21-9)", () => {
    const list = findAll(meta({ timeText: "2시간 전" }), V2Text).at(-1)!
    expect(tokenOf(list)).toEqual(typography.subtext.small)
    expect(typography.subtext.small.fontSize).toBe(12)
    // 시안이 337 고정폭으로 그린 건 오류다 — 실제 컬럼 우변에 붙어야 한다.
    expect(flatten(list.props.style).marginLeft).toBe("auto")

    const detail = findAll(
      meta({ timeText: "2026.07.28", timeVariant: "detail" }),
      V2Text,
    ).at(-1)!
    expect(tokenOf(detail)).toEqual(typography.subtext.medium)
  })

  it("시각을 안 주면 안 그린다 — `CompactPostRow` 는 시각이 없다", () => {
    expect(findAll(meta(), V2Text)).toHaveLength(3)
  })

  it("하트는 기본이 채움, `outline` 이면 윤곽", () => {
    expect(findAll(meta({ heart: "outline" }), "V2Icon")[0].props.name).toBe(
      "heartOutline",
    )
  })

  it("아이콘 옆 숫자는 **이름을 갖는다** — 스크린리더에 맥락 없는 수만 읽히지 않게", () => {
    const stats = childrenOf(meta()).filter((el) => el.type === "View")
    expect(stats.map((s) => s.props.accessibilityLabel)).toEqual([
      "좋아요 541",
      "댓글 77",
    ])
  })
})

/* ══ 1.2 · PostRow — §2.1 ════════════════════════════════════════════════ */

describe("PostRow — 실측 6종 높이를 컴포넌트가 실제로 내놓는다", () => {
  const row = (props: Partial<Record<string, unknown>> = {}) =>
    render(PostRow, { post: basePost, onPress: noop, ...props } as never)

  const heightOf = (props: Record<string, unknown>) =>
    styleOf(row(props)).height

  it("176 · 147 · 118 · 106 · 179 · 138", () => {
    /*
      §2.1 검증표 그대로다. 공식(`postRowHeight`)이 맞아도 컴포넌트가 그 값을 안 쓰면
      아무 소용이 없다 — 그래서 여기서는 **렌더된 컨테이너의 height** 를 본다.
    */
    // 배지 + 태그 + 썸
    expect(heightOf({})).toBe(176)
    // 태그 + 썸 (카테고리 끔)
    expect(heightOf({ showCategory: false })).toBe(147)
    // 썸만
    expect(heightOf({ post: post({ tags: [] }), showCategory: false })).toBe(
      118,
    )
    // 썸 없음
    expect(
      heightOf({
        post: post({ tags: [], imageUri: null }),
        showCategory: false,
      }),
    ).toBe(106)
    // 랭크 + 배지 + 태그 + 썸 (랭크와 배지는 같은 줄 — 큰 쪽 24 가 줄 높이다)
    expect(heightOf({ rank: 1 })).toBe(179)
    // 랭크만
    expect(
      heightOf({
        rank: 3,
        post: post({ tags: [], imageUri: null }),
        showCategory: false,
      }),
    ).toBe(138)
  })

  it("높이는 `postRowHeight()` 에서 온다 — 숫자를 두 벌 갖지 않는다", () => {
    expect(heightOf({})).toBe(
      postRowHeight({ hasCategory: true, hasTags: true, hasThumbnail: true }),
    )
    expect(heightOf({ rank: 1 })).toBe(
      postRowHeight({
        hasRank: true,
        hasCategory: true,
        hasTags: true,
        hasThumbnail: true,
      }),
    )
  })

  it("빈 카테고리 문자열은 배지가 아니다 — 미분류 글(D1)이 21 을 더 먹지 않게", () => {
    expect(heightOf({ post: post({ category: "   " }) })).toBe(147)
  })
})

describe("PostRow — 카드가 아니라 행이다 (§2.1)", () => {
  const root = () => render(PostRow, { post: basePost, onPress: noop })

  it("좌우 20 · 상하 16 은 **안쪽** 상자가 갖는다", () => {
    const outer = styleOf(root())
    expect(outer.paddingHorizontal).toBeUndefined()
    expect(outer.borderRadius).toBeUndefined() // 카드 아님
    expect(outer.backgroundColor).toBe(light.background.default)

    const inner = styleOf(childrenOf(root())[0])
    expect(inner.paddingHorizontal).toBe(COMMUNITY_GUTTER)
    expect(inner.paddingVertical).toBe(POST_ROW_PAD_V)
    expect(COMMUNITY_GUTTER).toBe(20)
    expect(POST_ROW_PAD_V).toBe(16)
  })

  it("하단 구분선은 **full-bleed** 다 — 절대 배치 + left/right 0 + `line.alternative`", () => {
    /*
      Yoga 는 절대 배치 자식을 부모의 **패딩 안쪽** 기준으로 놓는다. 좌우 여백이 바깥
      상자에 있으면 이 선은 조용히 20px 인셋된다. 그래서 여백이 안쪽에 있는 것이다.
    */
    const divider = childrenOf(root())[1]
    // V2Divider 를 펼치면 [hairline 래퍼, 1px 선] 이다.
    const [wrapEl, lineEl] = findAll(divider, "View")
    const wrap = flatten(wrapEl.props.style)
    expect(wrap.position).toBe("absolute")
    expect(wrap.left).toBe(0)
    expect(wrap.right).toBe(0)
    expect(wrap.bottom).toBe(0)
    expect(wrap.paddingLeft).toBe(0) // inset 0 — 좌측 인셋이 붙으면 full-bleed 가 아니다

    const line = flatten(lineEl.props.style)
    expect(line.backgroundColor).toBe(light.line.alternative)
    expect(line.height).toBe(borderWidth.thin)
  })

  it("제목·요약은 각각 **한 줄**이고 §2.1 의 토큰을 쓴다", () => {
    /*
      네 구역이 전부 1줄 말줄임이다. 2줄로 늘리면 텍스트열이 74 → 94 가 되어
      실측 6종이 통째로 어긋난다(74 = 20 + 4 + 20 + 12 + 18).
    */
    const [title, summary] = findAll(root(), V2Text)
    expect(title.props.numberOfLines).toBe(1)
    expect(tokenOf(title)).toEqual(typography.subtext.largeStrong)
    expect(typography.subtext.largeStrong.lineHeight).toBe(20)
    expect(title.props.color).toBe(light.label.normal)

    expect(summary.props.numberOfLines).toBe(1)
    expect(tokenOf(summary)).toEqual(typography.body.xSmall)
    expect(summary.props.color).toBe(light.label.neutral)
    expect(flatten(summary.props.style).marginTop).toBe(spacing[4])
  })

  it("텍스트열 = 제목 20 + 4 + 요약 20 + 12 + 메타 18 = 74", () => {
    const metaEl = findOne(root(), MetaRow)
    expect(flatten(metaEl.props.style).marginTop).toBe(spacing[12])
    expect(
      typography.subtext.largeStrong.lineHeight +
        spacing[4] +
        typography.body.xSmall.lineHeight +
        spacing[12] +
        typography.subtext.medium.lineHeight,
    ).toBe(ROW.postTextColumn)
  })

  it("썸네일이 콘텐츠 블록 높이를 정하고 텍스트열은 그 안에서 세로 중앙", () => {
    const inner = childrenOf(
      render(PostRow, { post: basePost, onPress: noop }),
    )[0]
    const content = childrenOf(inner).at(-1)!
    const s = styleOf(content)
    expect(s.flexDirection).toBe("row")
    expect(s.alignItems).toBe("center") // (86 − 74) / 2 = 6
    expect(s.gap).toBe(spacing[12])

    const image = findOne(inner, "Image")
    const img = flatten(image.props.style)
    expect(img.width).toBe(ROW.thumbLarge)
    expect(img.height).toBe(ROW.thumbLarge)
    expect(img.borderRadius).toBe(radius.sm)
    expect(image.props.contentFit).toBe("cover")
  })

  it("메타에 넘기는 값은 게시글의 것이고, 시각은 앱 언어로 만든다", () => {
    mockLanguage = "en-US"
    const metaEl = findOne(
      render(PostRow, { post: basePost, onPress: noop }),
      MetaRow,
    )
    expect(metaEl.props.viewCount).toBe(3291)
    expect(metaEl.props.likeCount).toBe(541)
    expect(metaEl.props.commentCount).toBe(77)
    expect(metaEl.props.timeText).toBe("2시간 전")
    expect(mockTimeAgoCalls).toEqual([
      { date: basePost.createdAt, language: "en-US" },
    ])
  })
})

describe("PostRow — 헤더행(랭크·카테고리)과 태그 레일 (§2.1)", () => {
  it("랭크 원은 24 원 · `primaryWeak` 면 · 13 SemiBold 브랜드 숫자", () => {
    const root = render(PostRow, { post: basePost, rank: 12, onPress: noop })
    const header = childrenOf(childrenOf(root)[0])[0]
    // 랭크가 있으면 헤더행 높이는 24 다(배지 21 이 아니다).
    expect(styleOf(header).height).toBe(POST_ROW_RANK_SIZE)
    expect(POST_ROW_RANK_SIZE).toBe(24)
    expect(styleOf(header).gap).toBe(spacing[6]) // 랭크↔배지 6

    const circle = childrenOf(header)[0]
    const s = styleOf(circle)
    expect(s.width).toBe(24)
    expect(s.height).toBe(24)
    expect(s.minWidth).toBe(24) // 2자리 대비
    expect(s.borderRadius).toBe(radius.full)
    expect(s.backgroundColor).toBe(light.primary.primaryWeak)

    const digit = findAll(circle, V2Text)[0]
    expect(tokenOf(digit)).toEqual(typography.label.xSmall)
    expect(digit.props.color).toBe(light.primary.primary)
    expect(textOf(digit)).toBe("12")
  })

  it("랭크가 없으면 헤더행은 배지 높이 21 이다", () => {
    const root = render(PostRow, { post: basePost, onPress: noop })
    expect(styleOf(childrenOf(childrenOf(root)[0])[0]).height).toBe(
      ROW.microPill,
    )
  })

  it("카테고리 배지는 `ink`, 태그는 `neutral` — 최대 4개(§2.1)", () => {
    const many = post({
      tags: ["가", "나", "다", "라", "마", "바"],
    })
    const pills = findAll(
      render(PostRow, { post: many, onPress: noop }),
      MicroPill,
    )
    expect(pills[0].props).toMatchObject({ face: "ink", label: "질문·상담" })
    expect(pills.slice(1).map((p) => p.props.label)).toEqual([
      "가",
      "나",
      "다",
      "라",
    ])
    for (const tag of pills.slice(1)) expect(tag.props.face).toBe("neutral")
    expect(POST_ROW_MAX_TAGS).toBe(4)
  })

  it("태그 레일은 높이 21 · 간격 6 · 한 줄", () => {
    const inner = childrenOf(
      render(PostRow, { post: basePost, onPress: noop }),
    )[0]
    const rail = childrenOf(inner)[1]
    const s = styleOf(rail)
    expect(s.height).toBe(ROW.microPill)
    expect(s.gap).toBe(spacing[6])
    expect(s.flexDirection).toBe("row")
    expect(s.flexWrap).toBeUndefined() // 줄바꿈은 높이 공식을 깬다
  })

  it("헤더행·태그 레일이 **아래로 벌리는 값이 공식의 그 항과 같다**", () => {
    /*
      행 높이는 `postRowHeight()` 가 정해서 바깥 상자에 **고정**된다. 그 식은 헤더행 뒤 8,
      태그 레일 뒤 8 을 항으로 갖는다(`POST_ROW_HEADER_GAP` · `POST_ROW_TAG_GAP`).
      여기 margin 이 그 상수에서 떨어져 나가면 **높이는 그대로인데 내용만 넘친다** —
      `flex:1` 인 콘텐츠 블록이 대신 눌려서 썸네일 86 이 조용히 찌그러진다.
      높이 단언만으로는 절대 안 잡히는 종류라(공식은 여전히 176 을 내놓는다) 따로 못박는다.
    */
    const inner = childrenOf(
      render(PostRow, { post: basePost, rank: 1, onPress: noop }),
    )[0]
    const [header, rail] = childrenOf(inner)
    expect(styleOf(header).marginBottom).toBe(POST_ROW_HEADER_GAP)
    expect(styleOf(rail).marginBottom).toBe(POST_ROW_TAG_GAP)
    expect(POST_ROW_HEADER_GAP).toBe(8)
    expect(POST_ROW_TAG_GAP).toBe(8)

    // 실측 대조(popular.md §2.5, 랭크 있는 179 행): 16 → 랭크 40 → 태그 48..69 →
    // 콘텐츠 블록 77 → 163. 아래 합이 그 77 이다.
    expect(
      POST_ROW_PAD_V +
        POST_ROW_RANK_SIZE +
        POST_ROW_HEADER_GAP +
        ROW.microPill +
        POST_ROW_TAG_GAP,
    ).toBe(77)
  })

  it("`onPressTag` 를 안 주면 태그는 **누를 수 없다** — 아무 일도 안 하는 버튼을 만들지 않는다", () => {
    const withHandler = render(PostRow, {
      post: basePost,
      onPress: noop,
      onPressTag: noop,
    })
    const without = render(PostRow, { post: basePost, onPress: noop })
    // 바깥 행 Pressable 1개 + 태그 4개
    expect(findAll(withHandler, "Pressable")).toHaveLength(5)
    expect(findAll(without, "Pressable")).toHaveLength(1)

    const tagButton = findAll(withHandler, "Pressable")[1]
    expect(tagButton.props.accessibilityLabel).toBe("CKD 정보 태그 검색")
  })

  it("케밥(§6.1 보존)은 헤더행이 있을 때만 그린다", () => {
    const withHeader = render(PostRow, {
      post: basePost,
      onPress: noop,
      onPressMore: noop,
    })
    const more = findAll(withHeader, "V2Icon").find(
      (i) => i.props.name === "more",
    )
    expect(more).toBeDefined()
    /*
      `⋯` 는 라벨이 없다 — 이 행에 할 수 있는 일이 더 있다는 것을 **혼자 말하는**
      표시라 비텍스트 기준 3:1 을 받아야 한다. 시안값 `label.alternative` 는
      라이트에서 2.8:1 이라 그 밖이다(`lightContrastAudit`).
    */
    expect(more!.props.color).toBe(light.label.neutral)

    /*
      헤더행이 없는 행(실측 118·147·106)에는 시안이 정한 자리가 없다. 없는 자리에 얹으면
      썸네일이나 태그 레일 위에 겹치고, 헤더행을 만들어 주면 행 높이가 실측에서 벗어난다.
      → 안 그린다. 그 화면은 `showCategory` 로 자리를 만들거나 다른 진입점을 쓴다(D5).
    */
    const headless = render(PostRow, {
      post: basePost,
      onPress: noop,
      showCategory: false,
      onPressMore: noop,
    })
    expect(
      findAll(headless, "V2Icon").some((i) => i.props.name === "more"),
    ).toBe(false)
    expect(styleOf(headless).height).toBe(147) // 케밥이 높이를 건드리지 않았다
  })

  it("행 전체가 제목으로 이름 붙은 버튼이다", () => {
    const root = render(PostRow, { post: basePost, onPress: noop })
    expect(root.props.accessibilityRole).toBe("button")
    expect(root.props.accessibilityLabel).toBe(basePost.title)
  })

  it("다크에서 면이 토큰을 따라간다 — 흰색을 박아 두지 않았다", () => {
    mockMode = "dark"
    const root = render(PostRow, { post: basePost, onPress: noop })
    expect(styleOf(root).backgroundColor).toBe(dark.background.default)
    expect(styleOf(root).backgroundColor).not.toBe(light.background.default)
  })

  it("모든 텍스트가 face 로만 굵기를 말하고 letterSpacing 은 0 이다 (§0.2)", () => {
    const root = render(PostRow, {
      post: basePost,
      rank: 1,
      onPress: noop,
      onPressTag: noop,
    })
    for (const text of findAll(root, V2Text)) {
      const token = tokenOf(text)
      expect(token.letterSpacing).toBe(0)
      expect(String(token.fontFamily)).toMatch(/^Pretendard-/)
      expect(token.fontWeight).toBeUndefined()
      expect(flatten(text.props.style).fontWeight).toBeUndefined()
    }
  })
})

/* ══ 1.2 · PostRowSkeleton ═══════════════════════════════════════════════ */

describe("PostRowSkeleton — 진짜 행과 같은 리듬 (§2.18)", () => {
  it("같은 모양이면 **같은 높이**다 — 도착 순간 목록이 안 튄다", () => {
    const shapes = [
      { hasCategory: true, hasTags: true, hasThumbnail: true },
      { hasTags: true, hasThumbnail: true },
      { hasThumbnail: true },
      {},
      { hasRank: true, hasCategory: true, hasTags: true, hasThumbnail: true },
      { hasRank: true },
    ]
    expect(
      shapes.map((shape) => styleOf(render(PostRowSkeleton, { shape })).height),
    ).toEqual([176, 147, 118, 106, 179, 138])
  })

  it("기본 모양은 실측 176 이다 (피드 첫 화면에서 가장 흔한 행)", () => {
    expect(styleOf(render(PostRowSkeleton, {})).height).toBe(176)
  })

  it("막대 높이가 실제 라인박스·썸네일과 같다 — 숫자를 새로 적지 않았다", () => {
    const bars = findAll(render(PostRowSkeleton, {}), "V2Skeleton")
    expect(bars.map((b) => b.props.height)).toEqual([
      ROW.microPill, // 카테고리 배지
      ROW.microPill,
      ROW.microPill,
      ROW.microPill, // 태그 3개
      typography.subtext.largeStrong.lineHeight, // 제목 20
      typography.body.xSmall.lineHeight, // 요약 20
      typography.subtext.medium.lineHeight, // 메타 18
      ROW.thumbLarge, // 썸네일 86
    ])
    expect(bars.at(-1)!.props.radius).toBe("sm")
    expect(bars[0].props.radius).toBe("full")
  })

  it("모양을 따라 부품이 늘고 준다", () => {
    const bare = findAll(render(PostRowSkeleton, { shape: {} }), "V2Skeleton")
    expect(bare).toHaveLength(3) // 제목 · 요약 · 메타
    const ranked = findAll(
      render(PostRowSkeleton, { shape: { hasRank: true } }),
      "V2Skeleton",
    )
    expect(ranked[0].props.width).toBe(POST_ROW_RANK_SIZE)
  })

  it("구분선까지 같다 — 스켈레톤만 선이 없으면 목록이 도착할 때 줄이 생긴다", () => {
    const divider = childrenOf(render(PostRowSkeleton, {}))[1]
    expect(styleOf(divider).position).toBe("absolute")
  })

  it("**격자가 통째로 같다** — 여백·간격을 스켈레톤에 다시 적지 않았다", () => {
    /*
      높이만 맞으면 "안 튄다" 가 아니다. 높이는 둘 다 `postRowHeight()` 에서 오므로
      스켈레톤의 좌우 여백이 16 이 되거나 태그 간격이 12 가 돼도 **높이 단언은 초록이다**
      (돌연변이로 확인했다). 그러면 회색 막대가 20 에서 시작했다가 도착 순간 글자가
      16 으로 옮겨 앉는다 — 목록 전체가 한 번 흔들린다.

      그래서 여기서는 두 트리의 **같은 자리 스타일을 같은 열쇠로 뽑아 통째로 비교**한다.
      한쪽만 고치면 값이 갈려서 깨진다. 사람이 옮겨 적은 숫자가 두 벌 있는 한, 이 단언이
      그 두 벌이 같다는 유일한 근거다.
    */
    const shape = {
      hasRank: true,
      hasCategory: true,
      hasTags: true,
      hasThumbnail: true,
    }

    /** 같은 열쇠만 남긴다 — 색·배경처럼 성격이 다른 값은 비교 대상이 아니다. */
    const pick = (style: Style, keys: string[]) =>
      Object.fromEntries(keys.map((key) => [key, style[key]]))

    /** 행 하나의 세로 격자 지문. 두 컴포넌트가 같은 구조를 갖는다는 전제도 함께 검사한다. */
    function rhythm(root: Element) {
      const [inner, divider] = childrenOf(root)
      const [header, rail, content] = childrenOf(inner)
      const [column] = childrenOf(content)
      return {
        height: styleOf(root).height,
        inner: pick(styleOf(inner), [
          "flex",
          "paddingHorizontal",
          "paddingVertical",
        ]),
        header: pick(styleOf(header), [
          "height",
          "gap",
          "marginBottom",
          "flexDirection",
          "alignItems",
        ]),
        rail: pick(styleOf(rail), [
          "height",
          "gap",
          "marginBottom",
          "flexDirection",
          "alignItems",
          "overflow",
        ]),
        content: pick(styleOf(content), [
          "flex",
          "flexDirection",
          "alignItems",
          "gap",
        ]),
        column: pick(styleOf(column), ["flex"]),
        // 제목 · 요약 · 메타가 서로를 얼마나 밀어내는가.
        lines: childrenOf(column).map(
          (line) => flatten(line.props.style).marginTop,
        ),
        divider: pick(styleOf(divider), [
          "position",
          "left",
          "right",
          "bottom",
        ]),
      }
    }

    const real = rhythm(
      render(PostRow, { post: basePost, rank: 1, onPress: noop }),
    )
    expect(rhythm(render(PostRowSkeleton, { shape }))).toEqual(real)

    // 지문이 텅 비어 있으면 위 비교는 `{}` 두 개를 견준 것이다. 실제 값이 들었는지 확인한다.
    expect(real.inner.paddingHorizontal).toBe(COMMUNITY_GUTTER)
    expect(real.rail.gap).toBe(spacing[6])
    expect(real.lines).toEqual([undefined, spacing[4], spacing[12]])
    expect(real.height).toBe(179)
  })

  it("썸네일 자리도 같은 크기다 — 86 이 60 이 되면 텍스트열 폭이 달라진다", () => {
    const image = flatten(
      findOne(render(PostRow, { post: basePost, onPress: noop }), "Image").props
        .style,
    )
    const bar = findAll(render(PostRowSkeleton, {}), "V2Skeleton").at(-1)!
    expect([bar.props.width, bar.props.height]).toEqual([
      image.width,
      image.height,
    ])
    expect(bar.props.radius).toBe("sm")
    expect(image.borderRadius).toBe(radius.sm)
  })
})

/* ══ 1.3 · CompactPostRow — §2.4 ═════════════════════════════════════════ */

describe("CompactPostRow — 76px 목록 행", () => {
  const row = (over: Partial<CompactPostRowPost> = {}) =>
    render(CompactPostRow, { post: compactPost(over), onPress: noop })

  it("높이 76 · 썸네일 60 이 세로 중앙((76−60)/2 = 8)", () => {
    expect(styleOf(row()).height).toBe(ROW.compactRow)
    expect(ROW.compactRow).toBe(76)

    const inner = childrenOf(row())[0]
    expect(styleOf(inner).alignItems).toBe("center")
    expect(styleOf(inner).paddingHorizontal).toBe(COMMUNITY_GUTTER)
    expect(styleOf(inner).gap).toBe(spacing[12])

    const img = flatten(findOne(row(), "Image").props.style)
    expect(img.width).toBe(ROW.thumbSmall)
    expect(img.height).toBe(ROW.thumbSmall)
    expect(img.borderRadius).toBe(radius.sm)
    expect((ROW.compactRow - ROW.thumbSmall) / 2).toBe(8)
  })

  it("제목은 15 Medium / lh **19**(`label.smallWeak`) — `PostRow` 의 lh 20 과 다르다", () => {
    const title = findAll(row(), V2Text)[0]
    expect(tokenOf(title)).toEqual(typography.label.smallWeak)
    expect(typography.label.smallWeak.lineHeight).toBe(19)
    expect(typography.label.smallWeak.lineHeight).not.toBe(
      typography.subtext.largeStrong.lineHeight,
    )
    expect(title.props.numberOfLines).toBe(1)
    expect(title.props.color).toBe(light.label.normal)
  })

  it("제목↔메타 6, 그리고 **시각이 없다**", () => {
    const metaEl = findOne(row(), MetaRow)
    expect(flatten(metaEl.props.style).marginTop).toBe(spacing[6])
    expect(metaEl.props.timeText).toBeUndefined()
    expect(metaEl.props.viewCount).toBe(3291)
  })

  it("하단 구분선은 full-bleed — 섹션 첫 행 위에는 선이 안 생긴다", () => {
    const divider = childrenOf(row())[1]
    const wrap = styleOf(divider)
    expect(wrap.position).toBe("absolute")
    expect(wrap.left).toBe(0)
    expect(wrap.right).toBe(0)
    expect(wrap.bottom).toBe(0)
    // 선이 아래에만 있으니 "첫 행 위엔 없음" 이 저절로 성립한다(위쪽 선을 그리지 않았다).
    expect(wrap.top).toBeUndefined()
  })
})

describe("CompactPostRow — 이미지 개수 배지 (§2.4)", () => {
  const badgeOf = (over: Partial<CompactPostRowPost>) =>
    findAll(
      render(CompactPostRow, { post: compactPost(over), onPress: noop }),
      ImageCountBadge,
    )

  it("2장부터 그린다. 1장·0장에는 없다", () => {
    expect(badgeOf({}).at(0)?.props.count).toBe(2)
    expect(badgeOf({ imageUris: ["a", "b", "c"] })[0].props.count).toBe(3)
    expect(badgeOf({ imageUris: ["a"] })).toHaveLength(0)
    expect(badgeOf({ imageUris: [], imageUri: null })).toHaveLength(0)
  })

  it("`imageUris` 가 비고 `imageUri` 만 있는 옛 응답은 **1장**으로 접는다", () => {
    // 모르는 것을 2 로 지어내면 배지가 거짓말을 한다.
    expect(badgeOf({ imageUris: [] })).toHaveLength(0)
  })

  it("썸네일이 없으면 배지도 없다", () => {
    expect(badgeOf({ imageUri: null })).toHaveLength(0)
  })

  it("20×20 원 · `label.alternative` 면 · 13 SemiBold 흰 글자 · 우·하 8", () => {
    const view = render(ImageCountBadge, { count: 2 })
    const s = styleOf(view)
    expect(s.width).toBe(IMAGE_COUNT_BADGE_SIZE)
    expect(s.height).toBe(IMAGE_COUNT_BADGE_SIZE)
    expect(IMAGE_COUNT_BADGE_SIZE).toBe(20)
    expect(s.borderRadius).toBe(radius.full)
    expect(s.backgroundColor).toBe(light.label.alternative)
    expect(s.position).toBe("absolute")
    expect(s.right).toBe(spacing[8])
    expect(s.bottom).toBe(spacing[8])

    const digit = findAll(view, V2Text)[0]
    expect(tokenOf(digit)).toEqual(typography.label.xSmall)
    expect(digit.props.color).toBe(light.static.white)
  })
})

/* ══ 1.4 · SectionHeader / SectionBand / MorePill — §2.7 ═════════════════ */

describe("SectionHeader — 47 (§2.7 · detail-drag §4.4)", () => {
  it("높이 47 · 좌 20 · 하단 구분선 없음", () => {
    const s = styleOf(render(SectionHeader, { title: "게시글" }))
    expect(s.height).toBe(ROW.sectionHeader)
    expect(ROW.sectionHeader).toBe(47)
    expect(s.paddingHorizontal).toBe(COMMUNITY_GUTTER)
    expect(s.borderBottomWidth).toBeUndefined()
  })

  it("제목은 17 Bold(`title.xSmall`), 내분은 **16 / 8** 이다", () => {
    /*
      마스터 §2.7 은 "padV 12" 라고 적었지만 원본 측정 둘이 그걸 부정한다:
      feed-home 은 `pad-top 16 / pad-bottom 8`, detail-drag §4.4 는 baseline = 행 +31.6.
      padV 12 면 baseline 이 ~4px 위에 뜬다. 총합 47 만 같다.
      `alignItems:"center"` 는 **마진 상자**를 중앙에 놓으므로 (47 − (23+8))/2 = 8,
      거기에 marginTop 8 → 글자 상자 top 16. chevron(24)은 (47−24)/2 = 11.5 로 행 중앙.
    */
    const header = render(SectionHeader, { title: "게시글" })
    const title = findOne(header, V2Text)
    expect(tokenOf(title)).toEqual(typography.title.xSmall)
    expect(typography.title.xSmall.lineHeight).toBe(23)
    expect(flatten(title.props.style).marginTop).toBe(spacing[8])
    expect(
      spacing[8] + typography.title.xSmall.lineHeight + spacing[8] + spacing[8],
    ).toBe(ROW.sectionHeader)
    expect(title.props.color).toBe(light.label.normal)

    /*
      16/8 을 실제로 만드는 것은 **`alignItems:"center"` + marginTop 8** 이라는 조합이다.
      정렬이 `flex-start` 로 바뀌면 marginTop 8 은 그대로인데 글자 상자 top 이 16 이 아니라
      8 로 내려앉고(4px 위로 뜬다 — 바로 §2.7 의 padV 12 가 틀린 그 방향이다) chevron 은
      행 중앙 11.5 가 아니라 0 에 붙는다. 마진 상자를 중앙에 놓는 성질이 이 산수의 절반이다.
    */
    expect(styleOf(header).alignItems).toBe("center")
    // (47 − (23 + 8)) / 2 = 8 → 글자 상자 top = 8 + 8 = 16 (feed-home 실측)
    expect(
      (ROW.sectionHeader - (typography.title.xSmall.lineHeight + spacing[8])) /
        2 +
        spacing[8],
    ).toBe(16)
    // chevron 24 는 마진이 없으므로 그냥 행 중앙 — detail-drag §4.4 와 같다.
    expect((ROW.sectionHeader - iconSize.md) / 2).toBe(11.5)
  })

  it("`onPress` 가 없으면 chevron 도 없고 누를 수도 없다", () => {
    const plain = render(SectionHeader, { title: "추천 게시글" })
    expect(plain.type).toBe("View")
    expect(findAll(plain, "V2Icon")).toHaveLength(0)
  })

  it("`onPress` 가 있으면 chevron 24 + 버튼이 된다 — 색은 라벨과 같다", () => {
    const linked = render(SectionHeader, {
      title: "신신마스터의 다른글",
      onPress: noop,
    })
    expect(linked.type).toBe("Pressable")
    expect(linked.props.accessibilityRole).toBe("button")
    const chevron = findOne(linked, "V2Icon")
    expect(chevron.props.name).toBe("chevronRight")
    expect(chevron.props.size).toBe("md")
    expect(iconSize.md).toBe(24)
    /*
      `actionLabel` 이 없는 이 갈래에서 chevron 은 **어포던스를 혼자 진다**(라벨이 없다).
      시안값 `label.assistive` 는 라이트에서 1.7:1 이라 화살표가 안 보였고, 그래서
      `올리기 ›` 같은 갈래에서는 말만 떠 있고 눌린다는 신호가 사라졌다(사용자 지적).
      라벨과 **같은** `label.neutral` 로 둔다 — 한 덩어리는 한 색이다.
    */
    expect(chevron.props.color).toBe(light.label.neutral)
    // 라벨을 안 주면 후행에 **말은 없다** — 예전 소비자의 모양이 그대로다.
    expect(findAll(linked, V2Text)).toHaveLength(1)
  })

  /* ── 후행 어포던스 슬롯(2026-08-21) ─────────────────────────────────────
     피드의 두 섹션이 서로 다른 머리를 갖고 있었고, 그중 하나(`요즘 이야기 중`)는
     **이 슬롯이 없어서** 같은 산술의 헤더를 통째로 베껴 쓰고 있었다. 사본을 지우는
     방법은 없던 슬롯을 여기 파는 것이다.                                        */

  it("`actionLabel` 은 chevron **앞에** 말을 붙인다 — 화살표만으로는 어디로 가는지 모른다", () => {
    const linked = render(SectionHeader, {
      title: "요즘 이야기 중",
      actionLabel: "전체",
      onPress: noop,
    })

    const texts = findAll(linked, V2Text)
    expect(texts.map(textOf)).toEqual(["요즘 이야기 중", "전체"])

    /*
      **말이 화살표보다 앞이다.** 위 줄만으로는 못 잡는다 — `findAll` 은 트리 순서를
      돌려주는데 제목·라벨의 상대 순서는 chevron 을 앞으로 옮겨도 그대로다.
      순서를 지키려면 후행 상자의 **자식 순서**를 봐야 한다(변이 테스트에서 살아남은 줄).
    */
    const trailing = findOne(linked, "View")
    expect(childrenOf(trailing).map((child) => child.type)).toEqual([
      V2Text,
      "V2Icon",
    ])
    // 제목은 17 Bold, 후행 라벨은 13 Medium `label.neutral` — 위계가 뒤집히면 안 된다.
    expect(tokenOf(texts[0])).toEqual(typography.title.xSmall)
    expect(tokenOf(texts[1])).toEqual(typography.label.xSmallWeak)
    expect(texts[1].props.color).toBe(light.label.neutral)

    // 라벨↔chevron 4 — `MorePill`(§2.7)의 간격 그대로.
    expect(styleOf(trailing).gap).toBe(spacing[4])
    expect(styleOf(trailing).flexDirection).toBe("row")
    // chevron 은 그대로 남는다(라벨이 대체하는 것이 아니라 **앞에 붙는다**).
    expect(findOne(linked, "V2Icon").props.name).toBe("chevronRight")
  })

  it("`actionLabel` 만 있고 `onPress` 가 없으면 아무것도 안 그린다", () => {
    /*
      아무 데도 안 가는 말은 화살표만 그려 놓는 것보다 나쁘다(머리말 §chevron).
      여기가 열리면 "전체" 를 눌러도 안 되는 섹션이 생긴다.
    */
    const plain = render(SectionHeader, {
      title: "게시글",
      actionLabel: "전체",
    })
    expect(plain.type).toBe("View")
    expect(findAll(plain, V2Text).map(textOf)).toEqual(["게시글"])
    expect(findAll(plain, "V2Icon")).toHaveLength(0)
  })

  it("눌리는 행이 읽는 문구는 `accessibilityLabel` 이고, 없으면 제목이다", () => {
    const spoken = render(SectionHeader, {
      title: "요즘 이야기 중",
      actionLabel: "전체",
      accessibilityLabel: "인기글 전체 보기",
      onPress: noop,
    })
    // `요즘 이야기 중, 전체` 로 읽히면 어디로 가는 버튼인지 말하지 않는다.
    expect(spoken.props.accessibilityLabel).toBe("인기글 전체 보기")

    const fallback = render(SectionHeader, {
      title: "신신마스터의 다른글",
      onPress: noop,
    })
    expect(fallback.props.accessibilityLabel).toBe("신신마스터의 다른글")
  })
})

describe("SectionBand — 8px 띠 (§2.7 · §4-G4)", () => {
  it("자리는 두 모드 모두 8 이다 — v2 `thick` 의 기본 16 이 아니다", () => {
    /*
      **높이는 모드와 무관하다.** 2026-08-22 에 이 컴포넌트는 색을 조건부로 바꿨지만
      (아래 절) 리듬은 안 바꿨다 — 라이트에서 간격까지 줄이면 섹션이 서로 붙는다.
    */
    for (const mode of ["light", "dark"] as const) {
      mockMode = mode
      const thick = findAll(render(SectionBand, {}), "View").at(-1)!
      expect({ mode, height: flatten(thick.props.style).height }).toEqual({
        mode,
        height: SECTION_BAND,
      })
    }
    mockMode = "light"
    expect(SECTION_BAND).toBe(8)
  })

  it("띠는 **다크에서만** 색을 갖는다 — 라이트에선 (A) 블록이 경계를 긋는다", () => {
    /*
      ■ 재판정 (2026-08-22). 전문은 `SectionBand` 머리말 §재판정.

      다크의 `background.default` 는 곧 화면 바닥이라 (A) 블록이 자기 면을 못 갖는다 —
      섹션 경계를 그리는 것은 이 띠 하나뿐이다(#313135, 바닥과 ΔL* 8.6). 라이트는 반대로
      블록이 흰 면이라 바닥과 ΔL* 7.25 로 이미 갈리는데, 그 위에 띠까지 그으면 경계가
      여섯이 되고 `#f7f7f7` 이라는 **그 화면에 없던 다섯째 회색**이 생긴다.

      판정은 모드가 아니라 **관계**로 한다: "콘텐츠 면이 바닥과 같은 평면인가".
      그래서 여기서도 모드를 보고 값을 베끼지 않고, 그 관계를 다시 계산해 맞춘다.
    */
    for (const mode of ["light", "dark"] as const) {
      mockMode = mode
      const colors = resolveTheme(mode).colors
      const bed = resolveTheme(mode).surface.bed
      const thick = findAll(render(SectionBand, {}), "View").at(-1)!
      const painted = flatten(thick.props.style).backgroundColor
      expect({ mode, painted }).toEqual({
        mode,
        painted:
          colors.background.default === bed
            ? colors.background.lower
            : undefined,
      })
    }
    mockMode = "light"
    // 그리고 그 관계가 실제로 두 모드에서 갈린다(둘 다 같으면 위 절이 헛돈다).
    expect(resolveTheme("dark").colors.background.default).toBe(
      resolveTheme("dark").surface.bed,
    )
    expect(resolveTheme("light").colors.background.default).not.toBe(
      resolveTheme("light").surface.bed,
    )
  })

  it("위 16 / 아래 8 — 여백은 **자기 색을 갖지 않는다**(§5.21-10 정규화 + 2026-08-21)", () => {
    const s = styleOf(render(SectionBand, {}))
    expect(s.paddingTop).toBe(spacing[16])
    expect(s.paddingBottom).toBe(spacing[8])
    /*
      여기 있던 것은 `background.default` 였다. 근거는 "이 밴드는 흰 면 사이에 들어간다"
      였는데 커뮤니티 피드에서 그 전제가 거짓이다 — 라이트 바닥은 `surface.surface`
      (당시 #f4f4f5, 2026-08-21 부터 #eaeaec)다. 그래서 이 컴포넌트가 경계를 하나가 아니라
      **넷**(바닥│여백│띠│여백│바닥) 만들었고, 넷 다 ΔL* 3.8 이하에 방향이 번갈아 뒤집혀
      **줄무늬**로 읽혔다.
      색을 떼면 바닥이 이어져 바깥쪽 둘만 남는다. 다크는 바닥이 곧 `background.default`
      라 한 픽셀도 안 바뀐다 — 그 값 동일성은 `lightContrastAudit` 이 계산으로 잡는다.
    */
    expect(s.backgroundColor).toBeUndefined()
  })
})

describe("MorePill — `더보기` 필 (§2.7)", () => {
  const pill = () => render(MorePill, { label: "게시글 더보기", onPress: noop })

  it("높이 32 · pill · 1px `line.normal` · 흰 면", () => {
    const button = findOne(pill(), "Pressable")
    const s = styleOf(button)
    expect(s.height).toBe(controlHeight.sm)
    expect(controlHeight.sm).toBe(32)
    expect(s.borderRadius).toBe(radius.full)
    expect(s.borderWidth).toBe(borderWidth.thin)
    expect(s.borderColor).toBe(light.line.normal)
    expect(s.backgroundColor).toBe(light.background.default)
  })

  it("라벨 13 Medium `label.neutral` + trailing chevron 16 — 둘이 같은 색이다", () => {
    const label = findOne(pill(), V2Text)
    expect(tokenOf(label)).toEqual(typography.label.xSmallWeak)
    expect(label.props.color).toBe(light.label.neutral)

    const chevron = findOne(pill(), "V2Icon")
    expect(chevron.props.name).toBe("chevronRight")
    expect(chevron.props.size).toBe("xs")
    // 라벨과 화살표는 한 덩어리다 — 시안의 두 단(neutral/alternative)은 라이트에서
    // 5.1:1 과 2.8:1 이라 위계가 아니라 "읽히는 것과 안 읽히는 것"이었다.
    expect(chevron.props.color).toBe(light.label.neutral)
  })

  it("폭을 박지 않는다 — 카피(en 포함) 길이가 폭을 정한다", () => {
    const s = styleOf(findOne(pill(), "Pressable"))
    expect(s.width).toBeUndefined()
    expect(s.paddingHorizontal).toBe(spacing[12])
    expect(s.gap).toBe(spacing[4])
  })

  it("가운데 정렬 + 위아래 16 을 **이 컴포넌트가** 갖는다", () => {
    const s = styleOf(pill())
    expect(s.alignItems).toBe("center")
    expect(s.marginVertical).toBe(spacing[16])
  })
})
