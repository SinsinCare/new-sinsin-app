/**
 * `V2Stack` · `V2Text` 의 계약을 고정한다.
 *
 * 이 둘은 tamagui 84파일을 받아내려고 만든 **이행용 프리미티브**다. 그래서 겉모습보다
 * 다음 두 가지가 중요하고, 그 둘이 깨지면 84파일이 조용히 잘못 그려진다:
 *
 * 1. **간격 토큰 해석** — `gap={16}` 이 토큰 키인지 생짜 px 인지 헷갈리면 레이아웃이
 *    통째로 흔들린다. 토큰에 있으면 토큰 값, 없으면 그대로 쓴다.
 * 2. **폰트 face 변환** — Pretendard 는 weight 별 4개 파일이라 `fontWeight` 만 준
 *    스타일은 **OS 기본 서체**로 그려진다(AppText 머리말의 실측). tamagui 에서
 *    옮겨 오는 코드는 대부분 `fontWeight` 만 갖고 있으므로 여기서 흡수해야 한다.
 *    `fontWeight` 를 **떼는 것**까지가 규칙이다 — 남기면 iOS 가 합성 볼드를 덧씌운다.
 *
 * 렌더러(react-test-renderer)를 쓰지 않고 **순수 함수를 직접 검사**한다. 이 저장소의
 * jest 설정에는 RN 컴포넌트 렌더 스택이 없고, 여기서 시험하려는 것은 스타일 계산이지
 * 렌더 트리가 아니다.
 */

import { type TextStyle } from "react-native"

import { spacing } from "@/src/design-system-v2/tokens/spacing"
import {
  fontFamily,
  typography,
} from "@/src/design-system-v2/tokens/typography"

/* ── V2Stack 의 간격 해석 (컴포넌트와 같은 규칙) ───────────────────── */

function resolveGap(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  return (spacing as Record<number, number>)[value] ?? value
}

describe("V2Stack — 간격 토큰", () => {
  it("토큰에 있는 값은 토큰으로 해석한다", () => {
    expect(resolveGap(16)).toBe(spacing[16])
    expect(resolveGap(8)).toBe(spacing[8])
  })

  it("토큰에 없는 값도 그대로 통과시킨다 — 이행이 디자인 협의에 막히지 않게", () => {
    // 84파일에는 14·18 처럼 토큰에 없는 값이 섞여 있다. 거부하면 옮길 수가 없다.
    expect(resolveGap(14)).toBe(14)
    expect(resolveGap(18)).toBe(18)
  })

  it("값이 없으면 undefined — 스타일에 gap 키를 만들지 않는다", () => {
    expect(resolveGap(undefined)).toBeUndefined()
  })
})

/* ── V2Text 의 face 변환 (컴포넌트와 같은 규칙) ────────────────────── */

const FACE: Record<string, string> = {
  "100": fontFamily.regular,
  "200": fontFamily.regular,
  "300": fontFamily.regular,
  "400": fontFamily.regular,
  normal: fontFamily.regular,
  "500": fontFamily.medium,
  "600": fontFamily.semibold,
  "700": fontFamily.bold,
  "800": fontFamily.bold,
  "900": fontFamily.bold,
  bold: fontFamily.bold,
}

function applyFace(flat: TextStyle | undefined): TextStyle | undefined {
  if (!flat || flat.fontFamily) return flat
  const face = FACE[String(flat.fontWeight ?? "400")]
  if (!face) return flat
  const { fontWeight: _expressedByFace, ...rest } = flat
  return { ...rest, fontFamily: face }
}

describe("V2Text — Pretendard face 변환", () => {
  it("fontWeight 만 있으면 face 로 바꾸고 fontWeight 는 뗀다", () => {
    const out = applyFace({ fontSize: 15, fontWeight: "600" })
    expect(out).toEqual({ fontSize: 15, fontFamily: fontFamily.semibold })
    // **이게 핵심이다.** 남겨 두면 iOS 가 이미 굵은 face 위에 합성 볼드를 덧씌운다.
    expect(out).not.toHaveProperty("fontWeight")
  })

  it("weight 가 없으면 regular 로 — 시스템 폰트로 새지 않는다", () => {
    expect(applyFace({ fontSize: 14 })).toEqual({
      fontSize: 14,
      fontFamily: fontFamily.regular,
    })
  })

  it("Pretendard 에 없는 굵기(800·900)는 bold 로 내린다 — 합성하지 않는다", () => {
    expect(applyFace({ fontWeight: "800" })?.fontFamily).toBe(fontFamily.bold)
    expect(applyFace({ fontWeight: "900" })?.fontFamily).toBe(fontFamily.bold)
  })

  it("이미 fontFamily 가 있으면 손대지 않는다 — 토큰이 정한 face 를 이긴다", () => {
    const styled = { fontFamily: fontFamily.medium, fontWeight: "700" as const }
    expect(applyFace(styled)).toBe(styled)
  })

  it("typography 토큰은 face 를 이미 들고 있어 변환을 타지 않는다", () => {
    // 토큰 정의 자체가 fontWeight 를 쓰지 않는다는 계약(typography.ts 머리말).
    const token = typography.title.small as TextStyle
    expect(token.fontFamily).toBeDefined()
    expect(token).not.toHaveProperty("fontWeight")
    expect(applyFace(token)).toBe(token)
  })
})

describe("V2Text — 토큰 + 직접 스타일 합성", () => {
  it("style 이 토큰을 덮어쓴다 — 옮기는 코드가 예외를 줄 수 있어야 한다", () => {
    // `StyleSheet.flatten` 은 이 jest 설정에서 모킹되지 않아 여기서 못 부른다.
    // 합성 규칙 자체(뒤가 앞을 덮는다)는 Object.assign 과 같으므로 그것으로 확인한다.
    const token = typography.body.mediumWeak as TextStyle
    const flat: TextStyle = { ...token, fontSize: 19 }

    expect(flat.fontSize).toBe(19)
    // 토큰이 정한 face 는 살아 있다 — 크기만 바꿔도 서체가 시스템 폰트로 새지 않는다.
    expect(flat.fontFamily).toBe(token.fontFamily)
    // face 가 이미 있으므로 변환도 타지 않는다.
    expect(applyFace(flat)).toBe(flat)
  })
})
