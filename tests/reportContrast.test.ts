/**
 * 홈·식단 리포트의 글자/바닥 쌍이 읽히는지 **숫자로** 지킨다(WCAG 대비).
 *
 * 시안(`write.svg`·`home.svg`)은 라이트만 있고, 몇 곳은 밝은 링 색을 글자에도 썼다.
 * 눈으로 "괜찮아 보인다" 는 재현이 안 되므로, 실제로 화면이 쓰는 값(reportInk·homeInk)을
 * 가져와 rgba 를 바닥에 합성한 뒤 대비를 계산한다. 본문 글자는 4.5:1, 큰 글자(18pt+ 또는
 * 14pt 굵게)는 3:1 — 여기서는 글자 크기를 알고 있으므로 쌍마다 기준을 적었다.
 */
import { REPORT_INK } from "../src/features/home/components/reportInk"
import { HOME_INK_LIGHT } from "../src/features/home/components/record/homeInk"
import { getSurfacePalette } from "../src/theme/surface"

type Rgb = [number, number, number]

function parse(color: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/iu.exec(color)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return {
      rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255],
      alpha: hex[2] ? parseInt(hex[2], 16) / 255 : 1,
    }
  }
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/u.exec(
    color,
  )
  if (!rgba) throw new Error(`unparsable color: ${color}`)
  return {
    rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
    alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
  }
}

/** `top` 을 `under` 위에 합성한 불투명 색. */
function over(top: string, under: Rgb): Rgb {
  const { rgb, alpha } = parse(top)
  return rgb.map((c, i) =>
    Math.round(c * alpha + under[i] * (1 - alpha)),
  ) as Rgb
}

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(fg: Rgb, bg: Rgb): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

/** 글자색(알파 가능)을 바닥(알파 가능)을 흰/검 캔버스에 합성한 위에 올려 대비를 낸다. */
function ratio(text: string, ground: string, canvas: string): number {
  const canvasRgb = parse(canvas).rgb
  const groundRgb = over(ground, canvasRgb)
  return contrast(over(text, groundRgb), groundRgb)
}

const WHITE = "#FFFFFF"
const BODY = 4.5
const LARGE = 3

describe("리포트 페이지 — 라이트", () => {
  const I = REPORT_INK
  it.each([
    ["본문 글자 / 흰 바닥", I.strong, WHITE, WHITE, BODY],
    ["보조 글자(70%) / 흰 바닥", I.muted, WHITE, WHITE, BODY],
    ["한눈에 카드 글자 / #F9FAFB", I.strong, I.well, WHITE, BODY],
    ["도넛 숫자 ok / 흰 바닥(14pt 굵게)", I.textOn.ok, WHITE, WHITE, LARGE],
    ["도넛 숫자 tight / 흰 바닥", I.textOn.tight, WHITE, WHITE, LARGE],
    ["도넛 숫자 over / 흰 바닥", I.textOn.over, WHITE, WHITE, LARGE],
    ["집중 영양소 이름 / 흰 바닥", I.strong, WHITE, WHITE, BODY],
    ["배지 안전 글자 / 배지 면", I.textOn.ok, I.badgeBg.ok, WHITE, LARGE],
    ["배지 주의 글자 / 배지 면", I.textOn.tight, I.badgeBg.tight, WHITE, LARGE],
    ["배지 제한 글자 / 배지 면", I.textOn.over, I.badgeBg.over, WHITE, LARGE],
    // 모름(영양 미확정)은 회색 — 판정 색으로 읽히지 않으면서도 읽혀야 한다.
    ["배지 모름 글자 / 배지 면", I.textOn.unknown, I.badgeBg.unknown, WHITE, BODY],
    ["도넛 숫자 unknown / 흰 바닥", I.textOn.unknown, WHITE, WHITE, BODY],
    [
      "음식 칩 흰 글자 / 칩 면(사진 위, 흰 사진 가정)",
      WHITE,
      I.chip,
      WHITE,
      BODY,
    ],
    // 파괴 버튼은 브랜드 틴트가 아니라 **중립 면**에 앉는다(위계 규칙). 그 위에서도 읽혀야 한다.
    ["기록 삭제 글자 / 중립 면 #F7F7F7", I.textOn.over, I.band, WHITE, LARGE],
  ] as const)("%s", (_name, text, ground, canvas, min) => {
    expect(ratio(text, ground, canvas)).toBeGreaterThanOrEqual(min)
  })

  it("분할 막대의 흰 숫자는 시안의 결정이다(2026-09-04) — 첫 칸 2.5:1 이상, 나머지는 굵기·그림자로 보완하며 1.5:1 아래로는 안 떨어진다", () => {
    expect(ratio(WHITE, I.split[0], WHITE)).toBeGreaterThanOrEqual(2.5)
    expect(ratio(WHITE, I.split[1], WHITE)).toBeGreaterThanOrEqual(1.5)
    expect(ratio(WHITE, I.split[2], WHITE)).toBeGreaterThanOrEqual(1.5)
  })

  it("브랜드 버튼의 흰 글자 / #FE7139 는 앱 전체 규칙이라 그대로 둔다 — 2.5:1 아래로 떨어지면 잡는다", () => {
    // 2026-09-04 실측 2.75:1. WCAG 큰 글자 3:1 에는 못 미치지만 홈 CTA·시트·온보딩이 같은
    // 조합을 쓰므로 이 화면만 바꾸면 브랜드가 갈린다. 낮아지는 회귀만 막는다.
    expect(ratio(WHITE, I.brand, WHITE)).toBeGreaterThanOrEqual(2.5)
  })

  it("시안 그대로의 노란 링 색을 글자에 쓰면 읽히지 않는다 (규칙이 헛돌지 않는 대조)", () => {
    expect(ratio(I.ring.tight, WHITE, WHITE)).toBeLessThan(LARGE)
  })
})

describe("리포트 페이지 — 다크(surface 토큰 위)", () => {
  const I = REPORT_INK
  const d = getSurfacePalette(true)
  it.each([
    ["본문 / 캔버스", d.textStrong, d.canvas],
    ["보조(다크는 text 톤) / 캔버스", d.text, d.canvas],
    ["본문 / 우물(추천 식단)", d.textStrong, d.surface],
    ["보조(text 톤) / 카드", d.text, d.card],
  ] as const)("%s", (_name, text, ground) => {
    expect(ratio(text, ground, d.canvas)).toBeGreaterThanOrEqual(BODY)
  })
  it("보조(text 톤) / 우물은 큰 글자 기준을 넘는다", () => {
    expect(ratio(d.text, d.surface, d.canvas)).toBeGreaterThanOrEqual(LARGE)
  })
  it("모름 배지(다크는 밝은 unknown 톤) / 우물 면", () => {
    expect(ratio(I.textOnDark.unknown, d.surface, d.canvas)).toBeGreaterThanOrEqual(BODY)
  })
  it("기록 삭제(다크는 밝은 over 톤) / 우물 면 — 짙은 over 톤이면 못 읽는다", () => {
    expect(
      ratio(I.textOnDark.over, d.surface, d.canvas),
    ).toBeGreaterThanOrEqual(LARGE)
    expect(ratio(I.textOn.over, d.surface, d.canvas)).toBeLessThan(LARGE)
  })
  it("다크의 textMuted 를 그대로 카드에 쓰면 못 읽는다 (그래서 text 로 올렸다 — 대조)", () => {
    expect(ratio(d.textMuted, d.card, d.canvas)).toBeLessThan(LARGE)
  })
  it("기록 삭제(다크는 밝은 over 톤) / 중립 면(다크는 우물)", () => {
    expect(
      ratio(I.textOnDark.over, d.surface, d.canvas),
    ).toBeGreaterThanOrEqual(LARGE)
  })

  it.each([
    ["도넛 숫자 ok(밝은 톤)", I.textOnDark.ok],
    ["도넛 숫자 tight", I.textOnDark.tight],
    ["도넛 숫자 over", I.textOnDark.over],
  ] as const)("%s / 다크 캔버스", (_name, text) => {
    expect(ratio(text, d.canvas, d.canvas)).toBeGreaterThanOrEqual(LARGE)
  })
})

describe("홈 — 라이트(homeInk)", () => {
  const H = HOME_INK_LIGHT
  it.each([
    ["제목 기록 / 복숭아 히어로", H.strong, H.heroBg, BODY],
    ["제목 통계(비활성, 21pt) / 복숭아 히어로", H.inactive, H.heroBg, LARGE],
    ["타일 라벨(14pt) / 흰 타일", H.muted, H.tileBg, BODY],
    ["기록 없음(18pt) / 흰 타일", H.placeholder, H.tileBg, LARGE],
    ["목록 메타 / 흰 바닥", H.muted, WHITE, BODY],
    ["말풍선 글자 / 흰 말풍선", H.bubbleText, WHITE, BODY],
  ] as const)("%s", (_name, text, ground, min) => {
    expect(ratio(text, ground, WHITE)).toBeGreaterThanOrEqual(min)
  })

  it("시안의 28%·51% 그대로였다면 큰 글자 기준에도 못 미친다 (대조)", () => {
    expect(ratio("rgba(55,56,60,0.28)", H.tileBg, WHITE)).toBeLessThan(LARGE)
    expect(ratio("rgba(55,56,60,0.51)", H.heroBg, WHITE)).toBeLessThan(LARGE)
  })
})

describe("홈 — 다크(surface 토큰)", () => {
  const d = getSurfacePalette(true)
  // homeInk 의 다크 매핑: muted·inactive·placeholder → `text`, strong → `textStrong`.
  it("타일 라벨·값·기록 없음이 카드 위에서 읽힌다", () => {
    expect(ratio(d.text, d.card, d.canvas)).toBeGreaterThanOrEqual(BODY)
    expect(ratio(d.textStrong, d.card, d.canvas)).toBeGreaterThanOrEqual(BODY)
  })
  it("히어로(surface) 위 제목·비활성 제목이 읽힌다", () => {
    expect(ratio(d.textStrong, d.surface, d.canvas)).toBeGreaterThanOrEqual(
      BODY,
    )
    expect(ratio(d.text, d.surface, d.canvas)).toBeGreaterThanOrEqual(LARGE)
  })
})
