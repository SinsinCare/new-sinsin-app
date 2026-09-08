/**
 * 커뮤니티 재디자인의 **작성자 프리미티브** 계약 — `FollowButton` · `AuthorCard` ·
 * `AuthorRail` · `AuthorProfileCard` · `NeighborRow` · `ConnectionRow`.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.11 · §2.12 · §2.13 · §2.14 · §5.7
 * · 실측 `author-profile.md` · `feed-home.md` · `detail-drag.md`.
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
 * ■ 이 파일이 지키는 것 중 가장 중요한 넷
 *
 *  1. **§5.7 의 상태→면 매핑.** 시안 4개 프레임이 서로 어긋나 있어서, 다음 사람이 시안을
 *     다시 열면 뒤집힌 프레임을 먼저 볼 확률이 높다. `팔로우`=fill / `팔로잉`=weak.
 *  2. **행 높이 101 · 81 · 146 · 165 가 하단 1px 을 포함한다.** Yoga 는 테두리를 상자
 *     높이에 넣으므로(D13·D17) 패딩으로 쌓으면 목록 전체가 행마다 1px 씩 밀린다.
 *  3. **텍스트열의 세로 중앙.** 태그가 있고 없고에 따라 두/세 줄이 아바타에 대해 다시
 *     중앙에 와야 하고, **행 높이는 그대로 101** 이어야 한다(§2.14 가 못 박았다).
 *  4. **프로필 블록의 버튼은 아래에서 잰다.** 위에서 더해 96 을 맞추려면 사다리에 없는
 *     22 가 필요하고, 닉네임 타이포가 바뀌면 조용히 어긋난다.
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
import { V2Avatar } from "@/src/design-system-v2/components/V2Avatar"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { elevation } from "@/src/design-system-v2/tokens/elevation"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { borderWidth, controlHeight } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"
import {
  CHIP_GAP,
  COMMUNITY_GUTTER,
  RAIL_INSET,
  ROW,
} from "@/src/features/recipe/components/community/communityLayout"
import { FollowButton } from "@/src/features/recipe/components/community/FollowButton"
import { MicroPill } from "@/src/features/recipe/components/community/MicroPill"
import { MorePill } from "@/src/features/recipe/components/community/MorePill"
import {
  AUTHOR_CARD,
  AuthorCard,
} from "@/src/features/recipe/components/community/AuthorCard"
import {
  AUTHOR_RAIL_GAP,
  AUTHOR_RAIL_PAD_V,
  AuthorRail,
} from "@/src/features/recipe/components/community/AuthorRail"
import {
  AUTHOR_PROFILE_CARD_HEIGHT,
  AUTHOR_PROFILE_STATS_WIDTH,
  AuthorProfileCard,
} from "@/src/features/recipe/components/community/AuthorProfileCard"
import { NeighborRow } from "@/src/features/recipe/components/community/NeighborRow"
import { ConnectionRow } from "@/src/features/recipe/components/community/ConnectionRow"

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

const findAll = (root: Element, type: unknown): Element[] =>
  walk(root).filter((el) => el.type === type)

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

/** `V2Text` 의 자식 문자열. */
const textsOf = (root: Element): string[] =>
  findAll(root, V2Text).map((el) => String(el.props.children))

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

/* ══ AuthorCard / AuthorRail — §2.12 ═════════════════════════════════════ */

const card = (overrides: Record<string, unknown> = {}) =>
  render(AuthorCard, {
    name: "신신마스터",
    badges: ["CKD 정보", "식단 인증"],
    following: false,
    onToggleFollow: noop,
    onPress: noop,
    ...overrides,
  } as never)

describe("AuthorCard — 137×165 (§2.12)", () => {
  it("카드 바깥 치수 · r8 · 테두리 없음 · `elevation[2]` 정확 일치", () => {
    const box = styleOf(card())

    expect(box.width).toBe(AUTHOR_CARD.width)
    expect(box.height).toBe(AUTHOR_CARD.height)
    expect([box.width, box.height]).toEqual([137, 165])
    expect(box.borderRadius).toBe(radius.sm)
    expect(box.borderWidth).toBeUndefined()
    // 실측 `dy1 / blur3 / rgba(0,27,55,0.10)` 이 이 토큰이다 — 손으로 적으면 다크가 갈린다.
    expect(box).toMatchObject(elevation[2])
    expect(box.backgroundColor).toBe(light.background.default)
  })

  it("세로 리듬의 항들이 실측 앵커(배지줄 +87 · 버튼 +116..148)를 만든다", () => {
    const root = card()
    const box = styleOf(root)
    const [avatar] = findAll(root, V2Avatar)
    const badges = byTag(root, "View")[0] as Element
    const [button] = findAll(root, FollowButton)

    const nameTop =
      (box.paddingTop as number) +
      (avatar?.props.size as number) +
      (flatten(nameOf(root).props.style).marginTop as number)
    const badgeTop =
      nameTop +
      typography.label.small.lineHeight +
      (flatten(badges.props.style).marginTop as number)
    const buttonTop =
      badgeTop +
      (flatten(badges.props.style).height as number) +
      (flatten(button?.props.style).marginTop as number)

    expect(badgeTop).toBe(87)
    expect(buttonTop).toBe(116)
    expect(buttonTop + controlHeight.sm).toBe(148)
    // 남는 17 이 카드 아래 여백이다 — 버튼이 카드 밖으로 나가면 여기서 잡힌다.
    expect(buttonTop + controlHeight.sm).toBeLessThan(AUTHOR_CARD.height)
  })

  it("배지 줄은 **비어도** 21 을 지킨다(그래야 버튼 자리가 안 움직인다)", () => {
    const withBadges = flatten(
      (byTag(card(), "View")[0] as Element).props.style,
    )
    const without = flatten(
      (byTag(card({ badges: undefined }), "View")[0] as Element).props.style,
    )

    expect(withBadges.height).toBe(ROW.microPill)
    expect(without.height).toBe(withBadges.height)
    expect(ROW.microPill).toBe(21)
    expect(withBadges.gap).toBe(CHIP_GAP)
  })

  it("배지는 두 개까지만 그린다(137 폭에 세 개는 안 들어간다)", () => {
    const root = card({ badges: ["가", "나", "다"] })
    expect(findAll(root, MicroPill)).toHaveLength(2)
    expect(findAll(root, MicroPill).map((p) => p.props.face)).toEqual([
      "neutral",
      "neutral",
    ])
  })

  it("아바타 48 · 카드 자체가 프로필로 가는 버튼이다", () => {
    const opened: string[] = []
    const root = card({ onPress: () => opened.push("profile") })

    expect(findAll(root, V2Avatar)[0]?.props.size).toBe(48)
    expect(root.props.accessibilityRole).toBe("button")
    ;(root.props.onPress as () => void)()
    expect(opened).toEqual(["profile"])
  })
})

/** 카드/행의 이름 `V2Text`. */
function nameOf(root: Element): Element {
  const [name] = findAll(root, V2Text)
  if (!name) throw new Error("이름이 없다")
  return name
}

describe("AuthorRail — 181 = 8 + 165 + 8 (§2.12)", () => {
  const rail = (overrides: Record<string, unknown> = {}) =>
    render(AuthorRail, {
      authors: [
        {
          id: "1",
          name: "가",
          following: false,
          onToggleFollow: noop,
          onPress: noop,
        },
        {
          id: "2",
          name: "나",
          following: true,
          onToggleFollow: noop,
          onPress: noop,
        },
      ],
      ...overrides,
    } as never)

  it("위·아래 8 이 카드 165 를 감싸 실측 블록 181 이 된다", () => {
    const content = flatten(rail().props.contentContainerStyle)

    expect(content.paddingVertical).toBe(AUTHOR_RAIL_PAD_V)
    expect(AUTHOR_RAIL_PAD_V * 2 + AUTHOR_CARD.height).toBe(181)
  })

  it("인셋 20 · 카드 사이 8 은 `contentContainerStyle` 에만 (컨테이너 금지)", () => {
    const root = rail()
    const content = flatten(root.props.contentContainerStyle)

    expect(content.paddingHorizontal).toBe(RAIL_INSET)
    expect(content.gap).toBe(AUTHOR_RAIL_GAP)
    expect(AUTHOR_RAIL_GAP).toBe(8)
    // 컨테이너 padding 이면 오른쪽이 스크롤 끝에서 잘린다.
    expect(styleOf(root).paddingHorizontal).toBeUndefined()
  })

  it("A안(카드 레일) + B안(`더보기` 필)을 합친다 — 필은 카드들 **뒤**에 온다", () => {
    const root = rail({ more: { label: "more", onPress: noop } })
    const kids = childrenOf(root)

    expect(findAll(root, AuthorCard)).toHaveLength(2)
    expect(kids[kids.length - 1]?.type).toBe(MorePill)
  })

  it("`더보기` 를 안 주면 필이 없다", () => {
    expect(findAll(rail(), MorePill)).toEqual([])
  })
})

/* ══ AuthorProfileCard — §2.13 ═══════════════════════════════════════════ */

const profile = (overrides: Record<string, unknown> = {}) =>
  render(AuthorProfileCard, {
    name: "신신마스터",
    stats: { reviews: 30, followers: 1741, following: 0 },
    following: false,
    onToggleFollow: noop,
    ...overrides,
  } as never)

describe("AuthorProfileCard — 146 블록 (§2.13)", () => {
  it("하단 1px 이 있든 없든 총 높이는 146 이다", () => {
    const plain = styleOf(profile())
    const bordered = styleOf(profile({ divider: true }))

    expect(plain.height).toBe(AUTHOR_PROFILE_CARD_HEIGHT)
    expect(AUTHOR_PROFILE_CARD_HEIGHT).toBe(146)
    expect(plain.borderBottomWidth).toBe(0)
    expect(bordered.borderBottomWidth).toBe(borderWidth.thin)
    // 선이 아래 패딩을 먹는다 — 그래야 버튼도 같은 자리에 남는다.
    expect(bordered.paddingBottom).toBe(
      (plain.paddingBottom as number) - borderWidth.thin,
    )
    expect(bordered.borderBottomColor).toBe(light.line.normal)
  })

  it("버튼은 **아래에서** 잰다 → 실측 top +96 / bottom +134", () => {
    for (const divider of [false, true]) {
      const box = styleOf(profile({ divider }))
      const [button] = findAll(profile({ divider }), FollowButton)

      expect(flatten(button?.props.style).marginTop).toBe("auto")

      const bottomInset =
        (box.paddingBottom as number) + (box.borderBottomWidth as number)
      const buttonTop =
        AUTHOR_PROFILE_CARD_HEIGHT - bottomInset - controlHeight.md

      expect(buttonTop).toBe(96)
      expect(buttonTop + controlHeight.md).toBe(134)
    }
  })

  it("아바타는 거터 20 · 텍스트 시작선은 실측 104 그대로", () => {
    const root = profile()
    const box = styleOf(root)
    const head = flatten(headOf(root).props.style)

    expect(box.paddingHorizontal).toBe(COMMUNITY_GUTTER)
    expect(box.paddingTop).toBe(spacing[16])
    expect(findAll(root, V2Avatar)[0]?.props.size).toBe(56)
    // 20(거터) + 56(아바타) + 28(간격) = 104 — 스탯 3열의 실측 x 가 여기 매달려 있다.
    expect(COMMUNITY_GUTTER + 56 + (head.gap as number)).toBe(104)
  })

  it("스탯 3열은 폭 210 의 `space-between` 이고 숫자↔라벨 사이는 0 이다", () => {
    const stats = flatten(statsOf(profile()).props.style)

    expect(stats.width).toBe(AUTHOR_PROFILE_STATS_WIDTH)
    expect(AUTHOR_PROFILE_STATS_WIDTH).toBe(210)
    expect(stats.justifyContent).toBe("space-between")
    expect(stats.marginTop).toBe(spacing[2])
    // 간격을 2 만 줘도 라벨 베이스라인(실측 C+71.1)이 밀린다.
    expect(stats.gap).toBeUndefined()
    // 이름 19 + 2 + 숫자 19 + 라벨 18 = 58 (아바타 56 보다 크다 → 줄 높이를 텍스트가 정한다)
    const column =
      typography.label.smallStrong.lineHeight +
      (stats.marginTop as number) +
      typography.label.smallStrong.lineHeight +
      typography.subtext.medium.lineHeight
    expect(column).toBe(58)
  })

  it("수는 세 자리로 끊고, 팔로워/팔로잉 열만 눌린다(후기는 갈 곳이 없다)", () => {
    const opened: string[] = []
    const columns = childrenOf(
      statsOf(
        profile({
          onPressFollowers: () => opened.push("followers"),
          onPressFollowing: () => opened.push("following"),
        }),
      ),
    ).map(expand)

    // 열마다 숫자(15 Bold) 위 · 라벨(13 Regular) 아래.
    expect(textsOf(columns[1] as Element)).toEqual([
      "1,741",
      "community.author.followers",
    ])
    expect(textsOf(columns[0] as Element)).toEqual([
      "30",
      "community.author.reviews",
    ])

    // 후기 열은 갈 곳이 없어 눌리지 않는다 — 눌리는 척하면 예측 가능한 UX 가 깨진다.
    expect(columns[0]?.type).toBe("View")
    expect(columns[1]?.type).toBe("Pressable")
    expect(columns[2]?.type).toBe("Pressable")
    ;(columns[1]?.props.onPress as () => void)()
    ;(columns[2]?.props.onPress as () => void)()
    expect(opened).toEqual(["followers", "following"])
  })
})

/** 프로필 블록의 상단 행(아바타 + 텍스트열)과 스탯 3열 컨테이너. */
function headOf(root: Element): Element {
  const head = childrenOf(root)[0]
  if (!head) throw new Error("상단 행이 없다")
  return head
}
function statsOf(root: Element): Element {
  const column = childrenOf(headOf(root))[1]
  const stats = column ? childrenOf(column)[1] : undefined
  if (!stats) throw new Error("스탯 3열이 없다")
  return stats
}

/* ══ NeighborRow(101) / ConnectionRow(81) — §2.14 ════════════════════════ */

const neighbor = (overrides: Record<string, unknown> = {}) =>
  render(NeighborRow, {
    name: "신신마스터",
    followerCount: 1741,
    postCount: 83,
    tags: ["CKD3", "식단 인증"],
    following: true,
    onToggleFollow: noop,
    onPress: noop,
    ...overrides,
  } as never)

const connection = (overrides: Record<string, unknown> = {}) =>
  render(ConnectionRow, {
    name: "신신마스터",
    followerCount: 1741,
    postCount: 83,
    onPress: noop,
    ...overrides,
  } as never)

/** 행 안쪽(테두리를 뺀) 높이 — 세로 중앙이 여기서 결정된다. */
function innerHeightOf(row: Element): number {
  const box = styleOf(row)
  return (box.height as number) - (box.borderBottomWidth as number)
}

describe("NeighborRow — 101 은 하단 1px 을 포함한다 (§2.14)", () => {
  it("행 높이 · 아바타 60 이 안쪽 100 의 중앙(T+20) 에 온다", () => {
    const row = neighbor()
    const box = styleOf(row)

    expect(box.height).toBe(ROW.directoryRow)
    expect(ROW.directoryRow).toBe(101)
    expect(box.borderBottomWidth).toBe(borderWidth.thin)
    expect(box.alignItems).toBe("center")

    expect(findAll(row, V2Avatar)[0]?.props.size).toBe(60)
    expect((innerHeightOf(row) - 60) / 2).toBe(20)
  })

  it("텍스트열은 태그가 있든 없든 세로 중앙 — 행 높이는 101 그대로", () => {
    const withTags = neighbor()
    const without = neighbor({ tags: undefined })

    const nameLine = typography.label.small.lineHeight
    const metaLine = typography.subtext.medium.lineHeight
    const metaGap = flatten(metaStyleOf(withTags)).marginTop as number
    const tagsGap = flatten(tagsStyleOf(withTags)).marginTop as number

    const tallColumn = nameLine + metaGap + metaLine + tagsGap + ROW.microPill
    const shortColumn = nameLine + metaGap + metaLine

    expect(tallColumn).toBe(64)
    expect(shortColumn).toBe(39)
    // (100−64)/2 = 18 · (100−39)/2 = 30.5 — 실측(잉크 18.7 / 31.2)과 각각 1px 안.
    expect((innerHeightOf(withTags) - tallColumn) / 2).toBe(18)
    expect((innerHeightOf(without) - shortColumn) / 2).toBe(30.5)
    expect(styleOf(without).height).toBe(ROW.directoryRow)
  })

  it("태그가 없으면 태그 줄 자체가 없다(빈 줄이 중앙을 흔들지 않게)", () => {
    expect(findAll(neighbor({ tags: undefined }), MicroPill)).toEqual([])
    expect(findAll(neighbor(), MicroPill)).toHaveLength(2)
    // 빈 `View` 만 남겨도 그 줄의 marginTop 4 가 텍스트열을 아래로 민다.
    expect(byTag(neighbor({ tags: undefined }), "View")).toHaveLength(2)
    expect(byTag(neighbor(), "View")).toHaveLength(3)
    expect(
      findAll(neighbor({ tags: ["가", "나", "다"] }), MicroPill),
    ).toHaveLength(2)
  })

  it("텍스트 시작선 92 = 20 + 60 + 12", () => {
    const column = flatten(
      (byTag(neighbor(), "View")[0] as Element).props.style,
    )
    expect(styleOf(neighbor()).paddingHorizontal).toBe(COMMUNITY_GUTTER)
    expect(COMMUNITY_GUTTER + 60 + (column.marginLeft as number)).toBe(92)
    // 긴 닉네임이 팔로우 버튼을 밀어내면 안 된다.
    expect(column.flex).toBe(1)
  })

  it("팔로우 버튼은 세로 중앙이 아니라 위에서 16 (§2.14 실측)", () => {
    const [button] = findAll(neighbor(), FollowButton)
    const style = flatten(button?.props.style)

    expect(style.alignSelf).toBe("flex-start")
    expect(style.marginTop).toBe(spacing[16])
    // 중앙이었다면 (100−32)/2 = 34 다 — 실측은 16 이다.
    expect(style.marginTop).not.toBe((innerHeightOf(neighbor()) - 32) / 2)
  })
})

/** 메타 줄 / 태그 줄의 스타일(행 안쪽 두·세 번째 `View`). */
function metaStyleOf(row: Element): unknown {
  return (byTag(row, "View")[1] as Element).props.style
}
function tagsStyleOf(row: Element): unknown {
  return (byTag(row, "View")[2] as Element).props.style
}

describe("ConnectionRow — 81 (§2.14)", () => {
  it("행 높이는 하단 1px 을 포함하고 아바타 48 이 안쪽 80 의 중앙(T+16)", () => {
    const row = connection()
    const box = styleOf(row)

    expect(box.height).toBe(ROW.connectionRow)
    expect(ROW.connectionRow).toBe(81)
    expect(box.borderBottomWidth).toBe(borderWidth.thin)
    expect(findAll(row, V2Avatar)[0]?.props.size).toBe(48)
    expect((innerHeightOf(row) - 48) / 2).toBe(16)
  })

  it("두 줄이 안쪽 80 의 중앙(T+20.5) — 실측 잉크 24.6/45.2 와 1px 안", () => {
    const row = connection()
    const metaGap = flatten(metaStyleOf(row)).marginTop as number
    const column =
      typography.label.small.lineHeight +
      metaGap +
      typography.subtext.medium.lineHeight

    expect(metaGap).toBe(spacing[2])
    expect(column).toBe(39)
    expect((innerHeightOf(row) - column) / 2).toBe(20.5)
  })

  it("시작선 80 = 20 + 48 + 12 이고 구분선은 full-bleed", () => {
    const row = connection()
    const column = flatten((byTag(row, "View")[0] as Element).props.style)

    expect(COMMUNITY_GUTTER + 48 + (column.marginLeft as number)).toBe(80)
    // 현행 구현의 `marginLeft: 80` 인셋을 버렸다 — 선은 바깥 상자의 테두리다.
    expect(styleOf(row).borderBottomColor).toBe(light.line.normal)
  })

  it("팔로워 목록에는 버튼이 없고, 팔로잉 목록에만 있다 (§2.14)", () => {
    expect(findAll(connection(), FollowButton)).toEqual([])

    const toggled: string[] = []
    const row = connection({
      follow: { following: true, onToggle: () => toggled.push("toggle") },
    })
    const [button] = findAll(row, FollowButton)

    expect(button?.props.following).toBe(true)
    ;(button?.props.onPress as () => void)()
    expect(toggled).toEqual(["toggle"])
  })

  it("메타 카피는 두 행이 같은 키를 쓰고 수는 세 자리로 끊는다", () => {
    for (const row of [neighbor(), connection()]) {
      expect(textsOf(row)).toContain("community.author.followerCount:1,741")
      expect(textsOf(row)).toContain("community.author.postCount:83")
      // 두 지표 사이는 16 으로 같이 스냅했다(실측 15/14, §5.20).
      expect(flatten(metaStyleOf(row)).gap).toBe(spacing[16])
    }
  })
})
