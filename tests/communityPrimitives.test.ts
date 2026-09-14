/**
 * 커뮤니티 재디자인 **공유 프리미티브**(WBS 1.1 · 1.4)의 계약 — `MicroPill` · `MetaRow`
 * · `SectionHeader` · `SectionBand` · `MorePill`.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.2 · §2.3 · §2.7,
 * 판정: `01-DECISIONS.md` D10.
 *
 * WBS 1.2 · 1.3 의 `PostRow` · `PostRowSkeleton` · `CompactPostRow`(§2.1 · §2.4) 계약도
 * 여기 있었다. 셋 다 어디서도 import 되지 않는 죽은 파일이라 컴포넌트와 함께 지웠다
 * (2026-09-09) — 살아 있는 피드 행은 `PostListItem` 이다.
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
 * ■ 이 파일이 지키는 것 중 가장 중요한 둘
 *
 *  1. **21 vs 23** (D10) — `V2Badge` 의 pill 은 23 이다. `MicroPill` 이 그걸 21 로 못박지
 *     못하면 행마다 최대 4px 어긋나고, 어긋난 뒤에는 어느 숫자가 맞았는지 아무도 모른다.
 *  2. **섹션 머리·띠의 치수** — §2.7 의 47 / 8 이 토큰에서 나온다.
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
/*
  2026-09-08 부터 v2 컴포넌트는 `Text` 를 react-native 가 아니라
  `primitives/NativeText`(접근성 확대 상한만 중앙에서 정하는 얇은 래퍼)에서 가져온다.
  스타일은 손대지 않고 그대로 통과시키므로 호스트 태그와 같은 **문자열 태그**로 둔다 —
  안 그러면 위의 `Text: "Text"` 가 라벨에 닿지 않는다(다른 스위트와 같은 처방).
*/
jest.mock("@/src/design-system-v2/primitives/NativeText", () => ({
  Text: "Text",
}))
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
  POST_ROW_RANK_SIZE,
  ROW,
  SECTION_BAND,
} from "@/src/features/recipe/components/community/communityLayout"
import {
  MicroPill,
  type MicroPillFace,
} from "@/src/features/recipe/components/community/MicroPill"
import { MetaRow } from "@/src/features/recipe/components/community/MetaRow"
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

    /*
      "실제 자리에서 확인" — 랭크 헤더행(24) 안의 배지(21) — 은 `PostRow` 를 그려 보던
      단언이었다. 그 행은 어디서도 import 되지 않는 죽은 파일이라 지웠다(2026-09-09).
      부모가 center 라도 자식의 alignSelf 가 이기므로, 배지 쪽의 한 줄은 그대로
      MicroPill → V2Badge → View 로 두 걸음 펴서 **실제로 그려지는 면**에서 본다.
    */
    const painted = render(
      V2Badge,
      render(MicroPill, { label: "CKD 3", face: "ink" } as never)
        .props as never,
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

  it("시각을 안 주면 안 그린다 — 시각이 없는 행(§2.4)이 있다", () => {
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

  it("평평한 피드에서 두 모드 모두 섹션 경계를 유지한다", () => {
    for (const mode of ["light", "dark"] as const) {
      mockMode = mode
      const colors = resolveTheme(mode).colors
      const thick = findAll(render(SectionBand, {}), "View").at(-1)!
      expect(flatten(thick.props.style).backgroundColor).toBe(
        colors.background.lower,
      )
      expect(flatten(thick.props.style).backgroundColor).not.toBe(
        colors.background.default,
      )
    }
    mockMode = "light"
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
