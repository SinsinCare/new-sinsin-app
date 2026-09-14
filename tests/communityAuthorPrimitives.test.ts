/**
 * 커뮤니티 재디자인의 **작성자 프리미티브** 계약 — `FollowButton`.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.11 · §5.7
 * · 실측 `author-profile.md` · `feed-home.md` · `detail-drag.md`.
 *
 * `AuthorCard` · `AuthorRail` · `AuthorProfileCard` · `NeighborRow` · `ConnectionRow`
 * (§2.12 · §2.13 · §2.14)의 계약도 여기 있었다. 다섯 다 어디서도 import 되지 않는
 * 죽은 파일이라 컴포넌트와 함께 지웠다(2026-09-09) — 피드 삽입분은
 * `NeighborSuggestionSection`, 팔로워/팔로잉 행은 `CommunityConnectionsScreen` 안에 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 소스 문자열이 아니라 컴포넌트를 **호출**하나
 *
 * 이 저장소의 jest 에는 렌더러가 없다. 로직을 테스트에 다시 쓰면 사본을 시험한 것이고,
 * 소스를 grep 하면 주석이 계약을 대신 만족시킨다(`v2CommunityGaps.test.ts` 머리말).
 * 여기서는 함수 컴포넌트를 그대로 불러 **돌려받은 엘리먼트 트리**를 읽는다.
 * 행 높이는 상수 비교가 아니라 **스타일 + 타이포 토큰으로 다시 합산**해서 본다 —
 * 그래야 "숫자는 맞는데 그 숫자를 만드는 항이 틀린" 상태가 잡힌다.
 *
 * ■ 이 파일이 지키는 것 중 가장 중요한 것
 *
 *  1. **§5.7 의 상태→면 매핑.** 시안 4개 프레임이 서로 어긋나 있어서, 다음 사람이 시안을
 *     다시 열면 뒤집힌 프레임을 먼저 볼 확률이 높다. `팔로우`=fill / `팔로잉`=weak.
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

// react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(tests/helpers/reactNativeStub.js).
// 호스트 컴포넌트는 **문자열 태그**다 — 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이 된다.
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
  StyleSheet: { create: <T>(styles: T): T => styles },
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
}))
/*
  2026-09-08 부터 v2 컴포넌트는 `Text` 를 react-native 가 아니라
  `primitives/NativeText`(접근성 확대 상한만 중앙에서 정하는 얇은 래퍼)에서 가져온다.
  스타일은 손대지 않고 그대로 통과시키므로 호스트 태그와 같은 **문자열 태그**로 둔다 —
  안 그러면 위의 `Text: "Text"` 가 라벨에 닿지 않는다(다른 스위트와 같은 처방).
*/
jest.mock("@/src/design-system-v2/primitives/NativeText", () => ({
  Text: "Text",
}))
jest.mock("react-i18next", () => ({
  /*
    키를 그대로 돌려준다 — 여기서 보는 것은 "어느 키를 골랐나" 다. 다만 수를 끼워 넣는
    카피는 **끼워 넣은 값**까지 봐야 한다(`팔로워 1,741` 의 세 자리 끊기가 그 값이다).
  */
  useTranslation: () => ({
    t: (key: string, options?: { replace?: { count?: string } }) =>
      options?.replace?.count === undefined
        ? key
        : `${key}:${options.replace.count}`,
    i18n: { language: "ko" },
  }),
}))
// SVG 를 (전이적으로라도) 들여오면 스위트째로 죽는다 — 아이콘은 태그로 둔다.
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
// `V2Avatar` 의 원격 사진 경로. 여기서는 크기·자리만 본다.
jest.mock("expo-image", () => ({ Image: "Image" }))
/*
  `V2Button` 은 **진짜로 부른다** — 52×32/r8/13 과 335×38/r10/15 가 이 프리미티브의 실측이라
  태그로 바꾸면 그 절반을 못 본다. 대신 그 아래 `V2DotLoader`(reanimated ESM)에서 체인을
  끊는다. `loading` 을 안 쓰므로 이 자리는 그려지지도 않는다.
*/
jest.mock("@/src/design-system-v2/components/V2DotLoader", () => ({
  V2DotLoader: "V2DotLoader",
}))
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))
// `V2Avatar` 의 "실패한 URL" 상태 한 칸. 렌더러가 없으므로 초깃값으로 고정한다.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => [initial, () => {}],
}))

let mockMode: "light" | "dark" = "light"

import { resolveTheme } from "@/src/design-system-v2/theme"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { controlHeight } from "@/src/design-system-v2/tokens/size"
import { typography } from "@/src/design-system-v2/tokens/typography"
import { FollowButton } from "@/src/features/recipe/components/community/FollowButton"

const light = resolveTheme("light").colors

/* ── 엘리먼트 트리 읽기 ──────────────────────────────────────────────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

/** style 배열/함수/중첩을 RN 과 같은 순서(뒤가 이김)로 편다. falsy 는 무시. */
function flatten(style: unknown, pressed = false): Style {
  if (typeof style === "function") {
    return flatten(
      (style as (s: { pressed: boolean }) => unknown)({ pressed }),
      pressed,
    )
  }
  if (Array.isArray(style)) {
    return style.reduce<Style>(
      (acc, item) => ({ ...acc, ...flatten(item, pressed) }),
      {},
    )
  }
  if (style && typeof style === "object") return { ...(style as Style) }
  return {}
}

const styleOf = (element: Element, pressed = false): Style =>
  flatten(element.props.style, pressed)

function childrenOf(element: Element): Element[] {
  const raw = element.props.children
  const list = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return list.filter(isElement)
}

/** 자기 자신 + 자손(프롭 children 을 따라가는 얕은 순회). */
function walk(element: Element): Element[] {
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walk(child)],
    [element],
  )
}

const byTag = (root: Element, tag: string): Element[] =>
  walk(root).filter((el) => el.type === tag)

/** 컴포넌트를 호출해 트리 뿌리를 받는다. 렌더러가 아니라 함수 호출이다. */
const render = <P>(component: (props: P) => unknown, props: P): Element => {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

/** 함수 컴포넌트 **엘리먼트**를 그 자리에서 펼친다(자식 컴포넌트의 실제 스타일을 보려고). */
function expand(element: Element): Element {
  if (typeof element.type !== "function")
    throw new Error("함수 컴포넌트가 아니다")
  return render(element.type as (props: unknown) => unknown, element.props)
}

const noop = () => {}

afterEach(() => {
  mockMode = "light"
})

/* ══ FollowButton — §2.11 · §5.7 ═════════════════════════════════════════ */

const follow = (overrides: Record<string, unknown> = {}) =>
  render(FollowButton, {
    following: false,
    onPress: noop,
    ...overrides,
  } as never)

describe("FollowButton — §5.7 상태 → 면 매핑 (시안이 자기모순이라 여기서 못 박는다)", () => {
  it("`팔로우`(아직) = 브랜드 fill · `팔로잉`(이미) = weak", () => {
    const notFollowing = expand(follow())
    const following = expand(follow({ following: true }))

    expect(styleOf(notFollowing).backgroundColor).toBe(light.primary.primary)
    expect(styleOf(following).backgroundColor).toBe(light.primary.primaryWeak)
    // 글자색까지 뒤집힌다 — 면만 보면 라벨이 안 읽히는 조합을 놓친다.
    expect(textStyleOf(notFollowing).color).toBe(light.static.white)
    expect(textStyleOf(following).color).toBe(light.primary.primary)
  })

  it("카피는 기존 i18n 두 키에서 온다 (`follow` / `unfollow`)", () => {
    expect(follow().props.children).toBe("community.author.follow")
    expect(follow({ following: true }).props.children).toBe(
      "community.author.unfollow",
    )
  })

  it("스크린리더에 상태를 말한다 — 카피만으로는 지금/누르면 을 못 가른다", () => {
    expect(follow({ following: true }).props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    })
  })
})

/** 버튼 라벨의 실제 텍스트 스타일(`V2Button` 이 고른 것). */
function textStyleOf(button: Element): Style {
  const [text] = byTag(button, "Text")
  if (!text) throw new Error("라벨이 없다")
  return flatten(text.props.style)
}

describe("FollowButton — 두 크기 (§2.11)", () => {
  it("행/카드: 32 · r8 · 13 SemiBold — 폭은 박지 않는다", () => {
    const button = expand(follow())
    const box = styleOf(button)

    expect(box.minHeight).toBe(controlHeight.sm)
    expect(controlHeight.sm).toBe(32)
    expect(box.borderRadius).toBe(radius.sm)
    expect(textStyleOf(button).fontSize).toBe(typography.label.xSmall.fontSize)
    expect(textStyleOf(button).fontFamily).toBe(
      typography.label.xSmall.fontFamily,
    )
    // 52 / 54 는 카피 폭의 결과다 — 상수로 박으면 en 에서 잘린다.
    expect(box.width).toBeUndefined()
  })

  it("프로필 블록: 38 · r10 · 15 SemiBold · 전폭(335 는 거터가 만든다)", () => {
    const button = expand(follow({ size: "block" }))
    const box = styleOf(button)

    expect(box.minHeight).toBe(controlHeight.md)
    expect(controlHeight.md).toBe(38)
    expect(box.borderRadius).toBe(radius.md)
    expect(textStyleOf(button).fontSize).toBe(typography.label.small.fontSize)
    expect(box.alignSelf).toBe("stretch")
  })

  it("`pending` 은 누름만 막는다 — 점 로더로 폭이 흔들리지 않는다", () => {
    const button = follow({ pending: true })
    expect(button.props.disabled).toBe(true)
    expect(button.props.loading).toBeUndefined()
    expect(byTag(expand(button), "V2DotLoader")).toEqual([])
  })
})
