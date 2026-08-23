/**
 * `V2Avatar`(§4-G12 · §2.10) — 원형 아바타의 계약.
 *
 * ## 어떻게 보나
 *
 * 렌더러가 없으므로 **함수 컴포넌트를 그대로 호출해 엘리먼트 트리를 읽는다**
 * (`tests/v2CommunityGaps.test.ts` 와 같은 수법). 상태(로드 실패)는 훅 하네스로
 * 진짜 전이를 돌린다(`tests/helpers/hookHarness.ts`).
 *
 * ## 여기서 지키는 것
 *
 * 1. **자리표시 글리프의 크기 비율** — 시안 실측(48 에서 34.3 × 41.1, 60 에서 42.9 × 51.4,
 *    docs/design/community-redesign/author-profile.md)을 재현한다. 그 값은 아이콘 SVG 안
 *    글리프가 24 박스에서 차지하는 비율에서 나오므로, **SVG 파일을 직접 읽어** 비율을
 *    계산하고 컴포넌트가 넘긴 px 와 곱한다. 아이콘이 다시 그려지면 여기서 걸린다.
 * 2. **채움 글리프** — `profile`(선)이 아니라 `profileFilled`(채움)이어야 한다.
 * 3. **서명 URL 회전** — 만료로 한 번 실패한 아바타가 새 URL 을 받으면 다시 시도한다.
 *    실패를 boolean 으로 들고 있으면 영영 글리프로 남는다.
 */
/* eslint-disable import/first -- RN·네이티브 의존을 모듈 로드 **전에** 갈아 끼워야 한다. */

// 호스트 컴포넌트는 **문자열 태그**다(tests/helpers/reactNativeStub.js 머리말).
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
  StyleSheet: { create: <T>(styles: T): T => styles },
  View: "View",
  Text: "Text",
}))
// 원격 사진 계보는 expo-image 다 — 여기서는 "그것을 골랐는가" 만 본다.
jest.mock("expo-image", () => ({ Image: "Image" }))
jest.mock("@/src/hooks/useAppColorScheme", () => ({
  useAppColorScheme: () => mockMode,
}))
// useState 는 테스트마다 다른 구현을 꽂는다: 기본은 훅 하네스(진짜 전이),
// "이미 실패한 상태" 를 그리는 테스트에서는 고정값.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => mockStateImpl(initial),
}))

let mockMode: "light" | "dark" = "light"
let mockStateImpl: (initial: unknown) => [unknown, (next: unknown) => void]

import fs from "fs"
import path from "path"

import { resolveTheme } from "@/src/design-system-v2/theme"
import { radius } from "@/src/design-system-v2/tokens"
import { iconRegistry } from "@/src/design-system-v2/icons/registry"
import { V2Icon } from "@/src/design-system-v2/components/V2Icon"
import {
  V2Avatar,
  type V2AvatarProps,
  type V2AvatarSize,
} from "@/src/design-system-v2/components/V2Avatar"
import {
  renderHookSync,
  useState as harnessUseState,
} from "./helpers/hookHarness"

const light = resolveTheme("light").colors
const dark = resolveTheme("dark").colors

/** §2.10 이 쓰는 여섯 지름. */
const SIZES: V2AvatarSize[] = [24, 28, 40, 48, 56, 60]

/* ── 엘리먼트 트리 읽기 ──────────────────────────────────────────────────── */

type Element = { type: unknown; props: Record<string, unknown> }
type Style = Record<string, unknown>

const isElement = (node: unknown): node is Element =>
  typeof node === "object" && node !== null && "props" in node && "type" in node

function flatten(style: unknown): Style {
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

function walk(element: Element): Element[] {
  return childrenOf(element).reduce<Element[]>(
    (acc, child) => [...acc, ...walk(child)],
    [element],
  )
}

const findAll = (root: Element, type: unknown): Element[] =>
  walk(root).filter((el) => el.type === type)

const render = <P>(component: (props: P) => unknown, props: P): Element => {
  const out = component(props)
  if (!isElement(out)) throw new Error("엘리먼트를 돌려주지 않았다")
  return out
}

const avatar = (props: V2AvatarProps): Element => render(V2Avatar, props)

/** 자리표시 글리프를 **한 겹 더 실제로 렌더해** 최종 svg 엘리먼트를 얻는다. */
function glyphOf(root: Element): Element {
  const [icon, ...rest] = findAll(root, V2Icon)
  if (!icon) throw new Error("자리표시 글리프가 없다")
  if (rest.length > 0) throw new Error("글리프가 여러 개다")
  return render(V2Icon as (props: Record<string, unknown>) => unknown, {
    ...icon.props,
  })
}

beforeEach(() => {
  mockMode = "light"
  // 기본은 "상태 전이 없음" — 한 번 그린 그림만 본다. 전이를 볼 때만 하네스를 꽂는다
  // (하네스의 useState 는 renderHookSync 안에서만 쓸 수 있다).
  mockStateImpl = (initial) => [initial, () => {}]
})

/* ── 원 ─────────────────────────────────────────────────────────────────── */

describe("V2Avatar — 원", () => {
  it("여섯 지름 전부 정원이고 면은 fill.pressed 다", () => {
    for (const size of SIZES) {
      const style = styleOf(avatar({ size }))
      expect(style.width).toBe(size)
      expect(style.height).toBe(size)
      expect(style.borderRadius).toBe(radius.full)
      expect(style.backgroundColor).toBe(light.fill.pressed)
      // 사진의 네 귀퉁이와 원 밖으로 나가는 글리프 어깨를 자른다.
      expect(style.overflow).toBe("hidden")
      expect(style.alignItems).toBe("center")
      expect(style.justifyContent).toBe("center")
    }
  })

  it("면 색은 토큰에서 온다 — 다크에서도 같은 칸을 읽는다", () => {
    mockMode = "dark"
    expect(styleOf(avatar({ size: 48 })).backgroundColor).toBe(
      dark.fill.pressed,
    )
  })

  it("style 은 마지막에 얹힌다 — 호출부가 예외를 줄 수 있다", () => {
    const style = styleOf(avatar({ size: 40, style: { opacity: 0.5 } }))
    expect(style.opacity).toBe(0.5)
    expect(style.width).toBe(40)
  })
})

/* ── 자리표시 글리프 (§4-G12) ───────────────────────────────────────────── */

describe("V2Avatar — 사진이 없을 때", () => {
  it("**채운** 사람 글리프다 — 선 글리프(`profile`)를 쓰지 않는다", () => {
    const glyph = glyphOf(avatar({ size: 48 }))
    // jest 의 svg 변환기는 파일 이름을 값으로 준다(tests/helpers/svgTransformer.js).
    expect(glyph.type).toBe("icon-profile-filled.svg")
    expect(glyph.type).not.toBe(iconRegistry.profile)
    expect(glyph.props.color).toBe(light.label.assistive)

    mockMode = "dark"
    expect(glyphOf(avatar({ size: 48 })).props.color).toBe(dark.label.assistive)
  })

  it("uri 가 비었거나 null 이면 글리프로 간다", () => {
    for (const uri of [undefined, null, ""]) {
      const root = avatar({ size: 40, uri })
      expect(findAll(root, "Image")).toEqual([])
      expect(glyphOf(root).type).toBe("icon-profile-filled.svg")
    }
  })

  it("글리프는 아바타와 같은 px 로 그린다", () => {
    for (const size of SIZES) {
      const glyph = glyphOf(avatar({ size }))
      expect(glyph.props.width).toBe(size)
      expect(glyph.props.height).toBe(size)
    }
  })

  /**
   * 시안 실측 재현. 아이콘은 24 박스 안에서 글리프가 일정 비율을 차지하도록 그려졌고,
   * 그 비율 × 렌더 px 가 시안이 잰 글리프 크기여야 한다(author-profile.md).
   */
  it("48 에서 34.3 × 41.1, 60 에서 42.9 × 51.4 (시안 실측)", () => {
    const box = glyphBoxFromSvg("icon-profile-filled.svg")
    expect(box.viewBox).toBe(24)

    const drawn = (size: V2AvatarSize) => {
      const px = glyphOf(avatar({ size })).props.width as number
      return {
        width: (box.width / box.viewBox) * px,
        height: (box.height / box.viewBox) * px,
      }
    }

    // 허용 오차 0.2px — 시안 실측치도 SVG 좌표도 0.1 단위 반올림이다. 다른 규칙
    // (예: 아이콘을 아바타의 90% 로 그리기)이면 3px 넘게 어긋나 여기서 걸린다.
    near(drawn(48).width, 34.3)
    near(drawn(48).height, 41.1)
    near(drawn(60).width, 42.9)
    near(drawn(60).height, 51.4)
  })
})

/* ── 사진 ───────────────────────────────────────────────────────────────── */

const SIGNED = "https://cdn.example.com/avatar.jpg?sig=aaa&exp=1"
const RESIGNED = "https://cdn.example.com/avatar.jpg?sig=bbb&exp=2"

describe("V2Avatar — 사진", () => {
  it("원격 사진은 expo-image 로 그린다", () => {
    const root = avatar({ size: 56, uri: SIGNED })
    expect(findAll(root, V2Icon)).toEqual([])

    const [image, ...rest] = findAll(root, "Image")
    if (!image) throw new Error("사진이 없다")
    expect(rest).toEqual([])
    expect(image.props.source).toEqual({ uri: SIGNED })
    expect(image.props.contentFit).toBe("cover")
    // FlashList 재활용 — 키가 없으면 새 행에 옛 사진이 한 프레임 남는다.
    expect(image.props.recyclingKey).toBe(SIGNED)
    expect(styleOf(image)).toEqual({ width: "100%", height: "100%" })
  })

  it("로드에 실패하면 빈 원이 아니라 글리프로 되돌아간다", () => {
    // 여기서만 진짜 상태 전이를 돌린다 — setState 가 재렌더로 이어지는지까지 본다.
    mockStateImpl = harnessUseState as unknown as typeof mockStateImpl
    const handle = renderHookSync(() => avatar({ size: 48, uri: SIGNED }))

    const image = findAll(handle.result(), "Image")[0]
    if (!image) throw new Error("사진이 없다")
    ;(image.props.onError as () => void)()

    // 상태가 정말 바뀌어 다시 그려졌는가(하네스가 재렌더한다).
    expect(handle.renderCount()).toBe(2)
    expect(findAll(handle.result(), "Image")).toEqual([])
    expect(glyphOf(handle.result()).type).toBe("icon-profile-filled.svg")
  })

  it("서명이 새로 돌면 다시 시도한다 — 실패는 URL 에 매인다", () => {
    /*
      아바타 URL 은 15분마다 도는 서명 URL 이다. 실패를 boolean 으로 들고 있으면
      만료로 한 번 실패한 아바타가 **새 URL 을 받아도 영영 글리프**로 남는다.
      그래서 "무엇이 실패했나" 를 들고 있어야 한다.
    */
    mockStateImpl = () => [SIGNED, () => {}]

    // 같은(만료된) URL 이면 계속 글리프.
    expect(findAll(avatar({ size: 48, uri: SIGNED }), "Image")).toEqual([])
    // 서명만 새로 돈 URL 이면 다시 사진을 건다.
    const retried = findAll(avatar({ size: 48, uri: RESIGNED }), "Image")[0]
    expect(retried?.props.source).toEqual({ uri: RESIGNED })
  })
})

/* ── 접근성 ─────────────────────────────────────────────────────────────── */

describe("V2Avatar — 접근성", () => {
  it("이름을 주면 이미지로 읽고, 안 주면 장식으로 건너뛴다", () => {
    const named = avatar({
      size: 48,
      accessibilityLabel: "신신마스터의 프로필",
    })
    expect(named.props.accessible).toBe(true)
    expect(named.props.accessibilityRole).toBe("image")
    expect(named.props.accessibilityLabel).toBe("신신마스터의 프로필")

    const decorative = avatar({ size: 48 })
    expect(decorative.props.accessible).toBe(false)
    expect(decorative.props.accessibilityRole).toBeUndefined()
    expect(decorative.props.accessibilityLabel).toBeUndefined()
  })
})

const near = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.2)

/* ── SVG 글리프 상자 재기 ───────────────────────────────────────────────── */

/**
 * 아이콘 SVG 를 읽어 **글리프가 차지하는 상자**를 잰다.
 *
 * 베지어는 제어점을 포함한 볼록껍질로 감싼다(과대 근사). 이 글리프는 네 변 모두
 * 껍질 경계가 곧 실제 경계라 정확하고, 다시 그리면 이 검사가 먼저 걸린다.
 */
function glyphBoxFromSvg(fileName: string) {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src/design-system-v2/icons/svg", fileName),
    "utf8",
  )
  const viewBox = Number(
    /viewBox="0 0 (\d+(?:\.\d+)?) \1"/u.exec(source)?.[1] ?? NaN,
  )

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const hit = (x: number, y: number) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  for (const tag of source.matchAll(/<circle[^>]*>/gu)) {
    const attr = (name: string) =>
      Number(new RegExp(`${name}="([^"]+)"`, "u").exec(tag[0])?.[1] ?? NaN)
    const [cx, cy, r] = [attr("cx"), attr("cy"), attr("r")]
    hit(cx - r, cy - r)
    hit(cx + r, cy + r)
  }

  for (const match of source.matchAll(/\sd="([^"]+)"/gu)) {
    let x = 0
    let y = 0
    let startX = 0
    let startY = 0
    for (const step of match[1].matchAll(
      /([MmCcHhVvLlZz])([^MmCcHhVvLlZz]*)/gu,
    )) {
      const command = step[1] as string
      const args = (step[2].match(/-?\d*\.?\d+/gu) ?? []).map(Number)
      const relative = command === command.toLowerCase()
      switch (command.toUpperCase()) {
        case "M":
        case "L":
          for (let i = 0; i < args.length; i += 2) {
            x = relative ? x + (args[i] as number) : (args[i] as number)
            y = relative ? y + (args[i + 1] as number) : (args[i + 1] as number)
            if (command.toUpperCase() === "M" && i === 0) {
              startX = x
              startY = y
            }
            hit(x, y)
          }
          break
        case "H":
          for (const value of args) {
            x = relative ? x + value : value
            hit(x, y)
          }
          break
        case "V":
          for (const value of args) {
            y = relative ? y + value : value
            hit(x, y)
          }
          break
        case "C":
          for (let i = 0; i < args.length; i += 6) {
            for (let p = 0; p < 6; p += 2) {
              hit(
                relative
                  ? x + (args[i + p] as number)
                  : (args[i + p] as number),
                relative
                  ? y + (args[i + p + 1] as number)
                  : (args[i + p + 1] as number),
              )
            }
            const nx = relative
              ? x + (args[i + 4] as number)
              : (args[i + 4] as number)
            const ny = relative
              ? y + (args[i + 5] as number)
              : (args[i + 5] as number)
            x = nx
            y = ny
          }
          break
        case "Z":
          x = startX
          y = startY
          hit(x, y)
          break
      }
    }
  }

  return { viewBox, width: maxX - minX, height: maxY - minY }
}
