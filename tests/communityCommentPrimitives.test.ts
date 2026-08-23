/**
 * 커뮤니티 재디자인의 **댓글 3종**(WBS 1.7 · 1.8 · 1.9)의 계약.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.8 · §2.9 · §2.18 · §5.5 · §5.6
 * · `01-DECISIONS.md` **D15**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 소스 문자열이 아니라 컴포넌트를 부르나
 *
 * 이 저장소의 jest 에는 렌더러가 없다(`tests/helpers/hookHarness.ts` 머리말). 그래서
 * 흔히 쓰이던 두 수법은 아무것도 보증하지 못한다: **로직을 테스트에 다시 쓰면** 사본을
 * 시험한 것이고, **소스를 grep 하면** 주석이 계약을 대신 만족시킨다(`codeOnly.ts` 머리말).
 * 대신 함수 컴포넌트를 그대로 호출해 **돌려받은 엘리먼트 트리를 읽는다** —
 * `tests/v2CommunityGaps.test.ts` 와 같은 방법이고, 스타일 계산은 컴포넌트 자신의 것이다.
 * 색·치수는 토큰에서 읽어와 비교하므로 토큰이 바뀌면 같이 따라간다.
 *
 * ■ 이 파일이 지키는 것 중 가장 중요한 셋
 *
 *  1. **행 높이 98** — 3개 구역이 독립적으로 잰 값이고, 리듬의 일곱 항이 그 합을 만든다.
 *     본문 타이포를 다른 토큰으로 갈아 끼우면 줄당 증가분이 달라져 목록이 통째로 어긋난다.
 *  2. **`⋯`·`답글쓰기` 는 프롭이 없으면 안 그려진다** — 대댓글의 `답글` 은 서버가 거부하는
 *     막다른 길이라, 그 어포던스를 화면이 끌 수 있어야 한다.
 *  3. **빈 상태는 `V2EmptyState` 다**(D15) — 손으로 만들면 그림은 같고 `empty_state_viewed`
 *     만 조용히 사라진다. 그래서 "무엇을 쓰는가"를 타입으로 직접 묻는다.
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

// react-native 는 Flow 원본이라 이 프리셋에서 파싱이 안 된다(tests/helpers/reactNativeStub.js).
// 호스트 컴포넌트는 **문자열 태그**다 — 흉내 낸 구현을 두면 "렌더러 없이 렌더한" 셈이 된다.
jest.mock("react-native", () => {
  const flatten = (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style))
      return style.reduce(
        (acc, item) => ({ ...acc, ...flatten(item) }),
        {} as Record<string, unknown>,
      )
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
    TextInput: "TextInput",
  }
})
jest.mock("react-native-svg", () => ({ Svg: "Svg", Path: "Path" }))
jest.mock("react-i18next", () => ({
  // 키를 그대로 돌려준다 — 여기서 보는 것은 "어느 키를 골랐나" 다.
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "ko" } }),
}))
jest.mock("@/src/design-system-v2/components/V2Icon", () => ({
  V2Icon: "V2Icon",
}))
// `V2EmptyState` → `V2Button` → `V2DotLoader` → reanimated(ESM) 체인을 여기서 끊는다.
// 빈 상태는 액션 버튼을 안 쓰므로 이 자리는 그려지지도 않는다.
jest.mock("@/src/design-system-v2/components/V2Button", () => ({
  V2Button: "V2Button",
}))
jest.mock("@/src/features/analytics", () => ({ trackAnalyticsEvent: () => {} }))
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => "light",
}))
/*
  `CommentComposer` 만 상태를 쓴다(`onContentSizeChange` 가 알려 주는 실제 콘텐츠 높이).
  렌더러가 없으므로 그 한 칸을 대신하고, 대신 **펼침 가지도 부를 수 있게** 값을 밖에서 준다.
*/
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) =>
    typeof initial === "boolean"
      ? [mockExpanded, () => {}]
      : [initial, () => {}],
}))

let mockExpanded = false

import { resolveTheme } from "@/src/design-system-v2/theme"
import { radius } from "@/src/design-system-v2/tokens/radius"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"
import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { V2EmptyState } from "@/src/design-system-v2/components/V2EmptyState"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import {
  COMMUNITY_GUTTER,
  ROW,
} from "@/src/features/recipe/components/community/communityLayout"
import { MicroPill } from "@/src/features/recipe/components/community/MicroPill"
import {
  CommentRow,
  COMMENT_ROW_RHYTHM,
} from "@/src/features/recipe/components/community/CommentRow"
import {
  CommentComposer,
  composerFieldGeometry,
  isComposerExpanded,
} from "@/src/features/recipe/components/community/CommentComposer"
import {
  CommentEmptyState,
  COMMENT_EMPTY_TOP_INSET,
  type CommentEmptyStateSurface,
} from "@/src/features/recipe/components/community/CommentEmptyState"

const light = resolveTheme("light").colors

/* ── 엘리먼트 트리 읽기 ──────────────────────────────────────────────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

/** style 배열/함수/중첩을 RN 과 같은 순서(뒤가 이김)로 편다. falsy 는 무시. */
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

const styleOf = (element: Element): Style => flatten(element.props.style)

function childrenOf(element: Element): Element[] {
  const raw = element.props.children
  const list = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return list.filter(isElement)
}

/** 트리 전체(자기 자신 포함)를 훑는다. */
function walk(element: Element): Element[] {
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walk(child)],
    [element],
  )
}

const findAll = (root: Element, type: unknown): Element[] =>
  walk(root).filter((el) => el.type === type)

/** 컴포넌트를 호출해 트리 뿌리를 받는다. 렌더러가 아니라 함수 호출이다. */
const render = <P>(component: (props: P) => unknown, props: P): Element => {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

/** `V2Text` 의 자식 문자열(수치·라벨). */
const textsOf = (root: Element): string[] =>
  findAll(root, V2Text).map((el) => String(el.props.children))

afterEach(() => {
  mockExpanded = false
})

/* ══ 1.7 · CommentRow — §2.8 ═════════════════════════════════════════════ */

const comment = (extra: Record<string, unknown> = {}) =>
  render(CommentRow, {
    authorName: "백종원",
    body: "좋네요 참고하겠습니다",
    timeText: "2026.07.28",
    likeCount: 541,
    replyCount: 0,
    ...extra,
  } as never)

/** 안쪽(패딩을 가진) 상자 — 바깥은 면과 구분선만 갖는다. */
const innerOf = (row: Element): Element => childrenOf(row)[0]

describe("CommentRow — 98 을 만드는 세로 리듬 (§2.8 · §5.5)", () => {
  it("일곱 항의 합이 실측 행 높이와 같다", () => {
    const sum = Object.values(COMMENT_ROW_RHYTHM).reduce((a, b) => a + b, 0)
    expect(sum).toBe(ROW.commentRow)
    expect(sum).toBe(98)
  })

  it("리듬의 세 줄 높이는 그 줄이 실제로 쓰는 **타이포 토큰**에서 나온다", () => {
    // 숫자를 따로 적으면 토큰이 바뀌었을 때 리듬만 옛 값으로 남는다.
    expect(COMMENT_ROW_RHYTHM.nameLine).toBe(
      typography.label.xSmallWeak.lineHeight,
    )
    expect(COMMENT_ROW_RHYTHM.bodyLine).toBe(
      typography.label.xSmallWeak.lineHeight,
    )
    // 13 Regular 은 정본에 `subtext.medium`(13/18) 하나뿐이다 — §2.8 표의 lh 16 은
    // 토큰이 아니고, 실측 중심선(+77)도 18 쪽이다.
    expect(COMMENT_ROW_RHYTHM.actionLine).toBe(
      typography.subtext.medium.lineHeight,
    )
    expect(COMMENT_ROW_RHYTHM.actionLine).toBe(18)
  })

  it("그려진 상자가 그 리듬을 그대로 쓴다", () => {
    const inner = styleOf(innerOf(comment()))
    expect(inner.paddingTop).toBe(COMMENT_ROW_RHYTHM.padTop)
    expect(inner.paddingBottom).toBe(COMMENT_ROW_RHYTHM.padBottom)

    const [nameLine, body, actionLine] = childrenOf(innerOf(comment()))
    expect(styleOf(nameLine).height).toBe(COMMENT_ROW_RHYTHM.nameLine)
    expect(styleOf(body).marginTop).toBe(COMMENT_ROW_RHYTHM.nameToBody)
    expect(styleOf(actionLine).height).toBe(COMMENT_ROW_RHYTHM.actionLine)
    expect(styleOf(actionLine).marginTop).toBe(COMMENT_ROW_RHYTHM.bodyToAction)
  })

  it("본문은 13 Medium / lh 16 이다 — 줄이 늘 때 행이 16 씩 자라는 근거 (§5.5)", () => {
    const [, body] = childrenOf(innerOf(comment()))
    expect(body.type).toBe(V2Text)
    expect(body.props.token).toBe("label.xSmallWeak")
    expect(body.props.color).toBe(light.label.normal)
    // 본문에 줄 수 제한이 붙으면 "줄당 +16" 이 성립하지 않는다.
    expect(body.props.numberOfLines).toBeUndefined()
  })

  it("이름은 본문보다 연하다 — 두 색이 같아지면 위계가 사라진다", () => {
    const [nameLine, body] = childrenOf(innerOf(comment()))
    const name = childrenOf(nameLine)[0]
    expect(name.props.color).toBe(light.label.neutral)
    expect(body.props.color).toBe(light.label.normal)
    expect(name.props.color).not.toBe(body.props.color)
  })
})

describe("CommentRow — 가로 구성과 대댓글 변형 (§2.8)", () => {
  it("부모는 흰 면, 대댓글은 틴트 면 — 둘 다 full-bleed 다", () => {
    expect(styleOf(comment()).backgroundColor).toBe(light.background.default)
    expect(styleOf(comment({ isReply: true })).backgroundColor).toBe(
      light.fill.alternative,
    )
    // 면이 바깥 상자에 있어야 화면 끝까지 간다(패딩은 안쪽 상자의 것).
    expect(styleOf(comment()).paddingHorizontal).toBeUndefined()
  })

  it("대댓글은 **왼쪽만** 12 들어간다 — 우측 20 은 그대로다", () => {
    const parent = styleOf(innerOf(comment()))
    expect(parent.paddingHorizontal).toBe(COMMUNITY_GUTTER)
    expect(parent.paddingLeft).toBeUndefined()

    const reply = styleOf(innerOf(comment({ isReply: true })))
    expect(reply.paddingLeft).toBe(COMMUNITY_GUTTER + ROW.commentReplyIndent)
    expect(reply.paddingLeft).toBe(32)
    // 우변은 안 밀린다 — `⋯`·날짜·본문 줄바꿈이 부모와 같은 x 에 선다.
    expect(reply.paddingHorizontal).toBe(COMMUNITY_GUTTER)
  })

  it("하단 구분선은 **모든 행**에 있고 full-bleed 다", () => {
    for (const row of [comment(), comment({ isReply: true })]) {
      const [divider] = findAll(row, V2Divider)
      expect(divider.props.tone).toBe("alternative")
      const style = flatten(divider.props.style)
      expect(style).toMatchObject({
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
      })
      // 인셋이 붙으면 선이 좌측 여백만큼 짧아진다.
      expect(divider.props.inset).toBeUndefined()
    }
  })

  it("`작성자` 배지는 21 짜리 MicroPill 의 brandWeak 면이다", () => {
    expect(findAll(comment(), MicroPill)).toHaveLength(0)

    const [badge] = findAll(comment({ authorBadge: "작성자" }), MicroPill)
    expect(badge.props.face).toBe("brandWeak")
    expect(badge.props.label).toBe("작성자")

    // 이름 ↔ 배지 8.
    const nameLine = childrenOf(innerOf(comment({ authorBadge: "작성자" })))[0]
    expect(styleOf(nameLine).gap).toBe(spacing[8])
  })
})

describe("CommentRow — 액션줄 (§2.8)", () => {
  it("수치는 0 도 그린다", () => {
    expect(textsOf(comment({ likeCount: 0, replyCount: 0 }))).toEqual(
      expect.arrayContaining(["0"]),
    )
  })

  it("좋아요는 **색만** 바뀐다 — 하트 모양은 그대로다", () => {
    const heartOf = (row: Element) =>
      findAll(row, "V2Icon").find((el) => el.props.name === "heartFilled")

    const off = heartOf(comment())
    const on = heartOf(comment({ liked: true }))
    /*
      끈 하트는 **끄지 않은 것과 색으로만** 갈린다. 시안값 `label.assistive` 는
      라이트에서 1.7:1 이라 "안 누른 하트"가 아니라 "하트가 없는 자리"로 보였다 —
      켰을 때만 모양이 나타나는 것처럼 읽힌다. 옆 숫자와 같은 `label.neutral` 로 둔다
      (계산: `tests/lightContrastAudit.test.ts`).
    */
    expect(off?.props.color).toBe(light.label.neutral)
    expect(on?.props.color).toBe(light.status.negative)
    // 브랜드 주황이 아니다(§2.8).
    expect(on?.props.color).not.toBe(light.primary.primary)
    expect(on?.props.name).toBe(off?.props.name)
  })

  it("액션 타이포는 전부 13 Regular — 색은 읽히는 가장 옅은 단이다", () => {
    const row = comment({ onPressReply: () => {} })
    const actionLine = childrenOf(innerOf(row))[2]
    for (const text of findAll(actionLine, V2Text)) {
      expect(text.props.token).toBe("subtext.medium")
      // 시안값 `label.alternative` 는 라이트 2.8:1 — 본문(4.5)도 큰 글자(3)도 아니다.
      expect(text.props.color).toBe(light.label.neutral)
    }
  })

  it("날짜는 실제 컬럼 우변에 붙는다", () => {
    const row = comment()
    const date = findAll(row, V2Text).find(
      (el) => el.props.children === "2026.07.28",
    )
    expect(flatten(date?.props.style).marginLeft).toBe("auto")
  })
})

describe("CommentRow — 막다른 길을 만들지 않는 두 어포던스", () => {
  it("`onPressReply` 가 없으면 `답글쓰기` 자체가 없다", () => {
    // 대댓글의 대댓글은 서버가 거부한다 — 화면이 이 링크를 끌 수 있어야 한다.
    expect(textsOf(comment({ isReply: true }))).not.toContain(
      "community.postDetail.reply",
    )
    expect(textsOf(comment({ onPressReply: () => {} }))).toContain(
      "community.postDetail.reply",
    )
  })

  it("`onPressMore` 가 없으면 `⋯` 가 없다. 있으면 24 박스 + 히트영역 44", () => {
    const bare = findAll(comment(), "V2Icon").filter(
      (el) => el.props.name === "more",
    )
    expect(bare).toHaveLength(0)

    const row = comment({ onPressMore: () => {} })
    const [more] = findAll(row, "V2Icon").filter(
      (el) => el.props.name === "more",
    )
    expect(more.props.size).toBe(24)
    // 라벨 없는 어포던스라 3:1 대상이다 — `PostRow` 의 `⋯` 와 같은 판정.
    expect(more.props.color).toBe(light.label.neutral)

    const trigger = findAll(row, "Pressable").find((el) =>
      findAll(el, "V2Icon").some((icon) => icon.props.name === "more"),
    )
    expect(trigger?.props.accessibilityLabel).toBe(
      "community.postDetail.commentMore",
    )
    // 24 + 10×2 = 44.
    expect(trigger?.props.hitSlop).toBe(10)
    // 줄 오른쪽 끝 = 우측 인셋 20(안쪽 패딩).
    expect(flatten(trigger?.props.style).marginLeft).toBe("auto")
  })

  it("삭제된 댓글은 안내 문구만 남는다 — 액션줄·배지·⋯ 가 사라진다 (§6.3-21)", () => {
    const row = comment({
      isDeleted: true,
      authorBadge: "작성자",
      onPressMore: () => {},
      onPressReply: () => {},
      onPressLike: () => {},
    })
    const [, body, actionLine] = childrenOf(innerOf(row))
    expect(body.props.children).toBe("community.postDetail.deletedComment")
    expect(actionLine).toBeUndefined()
    expect(findAll(row, MicroPill)).toHaveLength(0)
    expect(
      findAll(row, "V2Icon").filter((el) => el.props.name === "more"),
    ).toHaveLength(0)
  })
})

/* ══ 1.8 · CommentComposer — §2.9 · §5.6 ═════════════════════════════════ */

const composer = (extra: Record<string, unknown> = {}) =>
  render(CommentComposer, {
    value: "",
    onChangeText: () => {},
    onSubmit: () => {},
    ...extra,
  } as never)

/** 바의 마지막 자식이 필드 상자다(컨텍스트·멘션이 그 앞에 붙을 수 있다). */
const fieldOf = (bar: Element): Element => childrenOf(bar).slice(-1)[0]

describe("CommentComposer — 바 높이는 실측과 같은 합에서 나온다 (§2.9 · §3.11)", () => {
  const barPadding = (bar: Element) => {
    const style = styleOf(bar)
    return (style.paddingTop as number) + (style.paddingBottom as number)
  }

  it("화면 하단 바 = 14 + 필드 52 + 14 = 80", () => {
    const bar = composer()
    expect(barPadding(bar)).toBe(28)
    expect(styleOf(fieldOf(bar)).height).toBe(52)
    expect(barPadding(bar) + 52).toBe(80)
  })

  it("시트 푸터 = 14 + 필드 44 + 14 = 72, 모서리는 r16 (§3.11)", () => {
    const bar = composer({ variant: "sheet" })
    const field = styleOf(fieldOf(bar))
    expect(field.height).toBe(44)
    expect(field.borderRadius).toBe(radius["2xl"])
    expect(barPadding(bar) + 44).toBe(72)

    // 화면 변형은 r12 — 둘이 같아지면 시트 컴포저가 화면 바처럼 보인다.
    expect(styleOf(fieldOf(composer())).borderRadius).toBe(radius.lg)
  })

  it("펼치면 필드 118 · 바 146 — 버튼이 본문 **아래** 우측에 선다", () => {
    mockExpanded = true
    const bar = composer({ value: "두 줄짜리 초안" })
    const field = styleOf(fieldOf(bar))
    const send = flatten(findAll(bar, "Pressable").slice(-1)[0]?.props.style)

    const line = typography.label.mediumWeak.lineHeight
    const height =
      (field.paddingTop as number) +
      line * 2 +
      (send.marginTop as number) +
      (send.height as number) +
      (field.paddingBottom as number)

    expect(height).toBe(118)
    expect(barPadding(bar) + height).toBe(146)
    expect(send.alignSelf).toBe("flex-end")
    // 접힘에서는 옆에 있으므로 세로 정렬이 필요 없다.
    expect(field.flexDirection).toBeUndefined()
  })

  it("펼침 여부는 **콘텐츠 높이**가 정한다 — 토글이 아니다 (§5.6)", () => {
    const line = typography.label.mediumWeak.lineHeight
    expect(isComposerExpanded(line)).toBe(false)
    expect(isComposerExpanded(line * 2)).toBe(true)
  })

  it("두 기하가 한 함수에서 나온다 — 그려진 상자가 그 함수의 결과다", () => {
    expect(styleOf(fieldOf(composer()))).toMatchObject(
      composerFieldGeometry(false, "screen").field as Style,
    )
  })

  it("접힘 입력 폭 289 = 343 − 10 − 10 − 24 − 10 (실측 클립 프레임)", () => {
    // 텍스트와 원 사이의 10 이 없으면 마지막 글자가 원에 닿는다.
    const field = composerFieldGeometry(false, "screen").field
    const send = flatten(
      findAll(composer({ value: "안녕하세요" }), "Pressable").slice(-1)[0].props
        .style,
    )
    const inputWidth =
      343 -
      (field.paddingLeft as number) -
      (field.gap as number) -
      (send.width as number) -
      (field.paddingRight as number)
    expect(inputWidth).toBe(289)
  })

  it("safe-area 는 아래 여백에 더해진다(키보드가 닫혔을 때)", () => {
    expect(styleOf(composer({ bottomInset: 34 })).paddingBottom).toBe(14 + 34)
  })
})

describe("CommentComposer — 전송 어포던스 (§5.6)", () => {
  const sendOf = (bar: Element) =>
    findAll(bar, "V2Icon").find((el) => el.props.name === "arrowUp")

  it("초안이 비면 **버튼 자체가 없다** — 회색 비활성이 아니다", () => {
    expect(sendOf(composer())).toBeUndefined()
    // 공백만 있는 초안도 보낼 것이 없다.
    expect(sendOf(composer({ value: "   " }))).toBeUndefined()
    expect(sendOf(composer({ value: "안녕하세요" }))).toBeDefined()
  })

  it("글리프는 chevron 이 아니라 `arrowUp` 이고 원은 브랜드다", () => {
    const bar = composer({ value: "안녕하세요" })
    expect(sendOf(bar)?.props.color).toBe(light.static.white)

    const button = findAll(bar, "Pressable").slice(-1)[0]
    const style = flatten(button.props.style)
    expect(style.backgroundColor).toBe(light.primary.primary)
    expect(style.width).toBe(24)
    expect(style.borderRadius).toBe(radius.full)
    // 24 + 10×2 = 44.
    expect(button.props.hitSlop).toBe(10)
    expect(button.props.accessibilityLabel).toBe(
      "community.postDetail.postComment",
    )
  })

  it("전송 중에는 버튼이 남되 눌리지 않는다 (§6.3-23 중복 제출 가드)", () => {
    const button = findAll(
      composer({ value: "안녕하세요", submitting: true }),
      "Pressable",
    ).slice(-1)[0]
    expect(button.props.disabled).toBe(true)
    expect(button.props.accessibilityState).toEqual({ disabled: true })
  })
})

describe("CommentComposer — 입력 구현을 받는다 (§4-G14)", () => {
  it("기본은 RN TextInput, 시트에서는 넘겨받은 구현으로 그린다", () => {
    expect(findAll(composer(), "TextInput")).toHaveLength(1)

    const SheetInput = "SheetInput"
    const bar = composer({ inputComponent: SheetInput })
    expect(findAll(bar, "TextInput")).toHaveLength(0)
    expect(findAll(bar, SheetInput)).toHaveLength(1)
  })

  it("입력은 멀티행이고 캐럿은 브랜드다 — 여백은 필드가 한 번만 준다", () => {
    const input = findAll(composer(), "TextInput")[0]
    expect(input.props.multiline).toBe(true)
    expect(input.props.cursorColor).toBe(light.primary.primary)
    expect(input.props.selectionColor).toBe(light.primary.primary)
    expect(input.props.placeholder).toBe(
      "community.postDetail.commentPlaceholder",
    )
    /*
      플레이스홀더는 **안내문이지 흔적이 아니다**(`WriteTextField` 머리말이 같은 판정을
      한 단계 먼저 했다). 시안값 2.8:1 → 읽히는 단으로. 입력된 글자는 `label.normal`
      (14.1:1)이라 "비어 있다"와 "적혀 있다"는 여전히 갈린다.
    */
    expect(input.props.placeholderTextColor).toBe(light.label.neutral)

    const style = flatten(input.props.style)
    expect(style.padding).toBe(0)
    // 17 Medium / lh 21 — 멀티행이라 lineHeight 를 유지한다.
    expect(style).toMatchObject(typography.label.mediumWeak as Style)
  })

  it("`inputProps` 는 그대로 넘어가되 콘텐츠 높이 관찰은 뺏기지 않는다", () => {
    const input = findAll(
      composer({ inputProps: { maxLength: 2000, autoFocus: true } }),
      "TextInput",
    )[0]
    expect(input.props.maxLength).toBe(2000)
    expect(input.props.autoFocus).toBe(true)
    expect(typeof input.props.onContentSizeChange).toBe("function")
  })
})

describe("CommentComposer — 시안에 없는 두 줄 (§6.3-18·19 보존)", () => {
  it("답글/수정 컨텍스트는 라벨 + 닫기다", () => {
    expect(childrenOf(composer())).toHaveLength(1) // 필드만

    const bar = composer({
      context: { label: "백종원님에게 답글 쓰는 중", onDismiss: () => {} },
    })
    const [context] = childrenOf(bar)
    const label = findAll(context, V2Text)[0]
    expect(label.props.children).toBe("백종원님에게 답글 쓰는 중")
    expect(label.props.numberOfLines).toBe(1)

    const dismiss = findAll(context, "Pressable")[0]
    expect(dismiss.props.accessibilityLabel).toBe(
      "community.postDetail.cancelReply",
    )
  })

  it("멘션 칩은 눌러서 뺀다 — 누구에게 알림이 가는지가 그 칩이다", () => {
    const removed: string[] = []
    const bar = composer({
      mentions: ["백종원", "신신마스터"],
      onRemoveMention: (name: string) => removed.push(name),
    })
    const [chips] = childrenOf(bar)
    const pressables = findAll(chips, "Pressable")
    expect(pressables).toHaveLength(2)
    expect(findAll(chips, V2Text).map((el) => el.props.children)).toEqual([
      "@백종원",
      "@신신마스터",
    ])
    expect(pressables[0].props.accessibilityLabel).toBe(
      "community.postDetail.removeMention",
    )
    expect(flatten(pressables[0].props.style).backgroundColor).toBe(
      light.primary.primaryWeak,
    )
    ;(pressables[1].props.onPress as () => void)()
    expect(removed).toEqual(["신신마스터"])
  })
})

/* ══ 1.9 · 조용한 빈 상태 — §2.18 · D15 ══════════════════════════════════ */

describe("CommentEmptyState — 손으로 만들지 않는다 (D15)", () => {
  it("**`V2EmptyState` 자신**이다 — 계측은 그 안에서 나간다", () => {
    /*
      §2.18 은 로컬 `QuietEmptyState` 를 만들라고 적었지만 그 전제(20 Bold 제목 + 40 아이콘
      강제)는 Phase 0-B 가 지웠다. 손으로 만들면 그림은 같고 `empty_state_viewed` 만
      사라진다 — 화면을 눈으로 봐서는 절대 안 보이는 결함이다.
    */
    const state = render(CommentEmptyState, {
      surface: "community_post_comments",
    })
    expect(state.type).toBe(V2EmptyState)
    expect(state.props.tone).toBe("quiet")
    expect(state.props.title).toBeUndefined()
  })

  it("표면을 그대로 넘긴다 — 세 자리 전부", () => {
    // 타입이 `Extract` 라 표면 유니온에서 이름이 사라지면 여기서 컴파일이 막힌다.
    const surfaces: CommentEmptyStateSurface[] = [
      "community_post_comments",
      "community_story_comments",
      "community_reply",
    ]
    for (const surface of surfaces) {
      expect(render(CommentEmptyState, { surface }).props.surface).toBe(surface)
    }
  })

  it("카피는 앱의 **해요체** 두 줄이다 (§2.18 판정)", () => {
    const state = render(CommentEmptyState, { surface: "community_reply" })
    expect(state.props.description).toBe(
      "community.postDetail.noComments\ncommunity.postDetail.firstComment",
    )
  })

  it("정렬 바(시트 상단)에서 102 아래에 선다 (§3.4 · §3.11)", () => {
    const state = render(CommentEmptyState, { surface: "community_reply" })
    expect(flatten(state.props.style).paddingTop).toBe(COMMENT_EMPTY_TOP_INSET)
    expect(COMMENT_EMPTY_TOP_INSET).toBe(102)
  })
})

describe("CommentEmptyState — 71×69 말풍선은 `illustration` 으로 표현된다 (§4-G11)", () => {
  const bubble = (): Element => {
    const slot = render(CommentEmptyState, { surface: "community_reply" }).props
      .illustration
    if (!isElement(slot)) throw new Error("일러스트가 엘리먼트가 아니다")
    return slot
  }

  it("40px 아이콘 캡을 안 받는다 — 획까지 담는 상자는 75×73 이다", () => {
    const svg = bubble()
    expect(svg.type).toBe("Svg")
    // 실측 71×69 는 **획의 중심선** 상자다. 획 4 가 사방으로 2 씩 더 나간다.
    expect(svg.props.width).toBe(75)
    expect(svg.props.height).toBe(73)
    // viewBox 가 0 0 71 69 면 뷰포트가 테두리를 반씩 잘라 납작한 변이 생긴다.
    expect(svg.props.viewBox).toBe("-2 -2 75 73")
  })

  it("획 4 · `line.normal` · 몸통은 라운드조인 / 안쪽 줄은 라운드캡", () => {
    const [body, rules] = childrenOf(bubble())
    for (const path of [body, rules]) {
      expect(path.type).toBe("Path")
      expect(path.props.stroke).toBe(light.line.normal)
      expect(path.props.strokeWidth).toBe(4)
      expect(path.props.fill).toBe("none")
    }
    expect(body.props.strokeLinejoin).toBe("round")
    expect(rules.props.strokeLinecap).toBe("round")
  })

  it("몸통은 r10 둥근 사각 + 하단 중앙 꼬리, 안쪽 줄은 3개(마지막만 짧다)", () => {
    const [body, rules] = childrenOf(bubble())
    const d = String(body.props.d)
    // 71×56 상자: 우변 71 · 아래변 56 · 모서리 반지름 10.
    expect(d).toContain("A10 10 0 0 1 71 10")
    expect(d).toContain("A10 10 0 0 1 61 56")
    // 꼬리 꼭짓점 y = 69 (전체 높이).
    expect(d).toContain("L35.5 69")

    expect(String(rules.props.d)).toBe("M15 15H57 M15 28H57 M15 41H45")
  })
})
