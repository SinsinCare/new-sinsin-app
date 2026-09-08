/**
 * 기록 페이지의 실제 글자와 바탕 대비를 확인한다.
 * 수위가 움직여도 읽히도록 물 그라디언트 양 끝과 수면 색을 함께 검사한다.
 */
import {
  RECORD_INK,
  recordFieldLabel,
} from "../src/features/home/components/record/pages/recordInk"
import { getSurfacePalette, surfaceBodyText } from "../src/theme/surface"

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

function ratio(text: string, ground: string, canvas: string): number {
  const canvasRgb = parse(canvas).rgb
  const groundRgb = over(ground, canvasRgb)
  const textRgb = over(text, groundRgb)
  const [a, b] = [luminance(textRgb), luminance(groundRgb)].sort(
    (x, y) => y - x,
  )
  return (a + 0.05) / (b + 0.05)
}

const BODY = 4.5
const LARGE = 3

describe.each([false, true])("입력 및 오류 안내 — dark=%s", (dark) => {
  const s = getSurfacePalette(dark)
  const ink = dark ? RECORD_INK.dark : RECORD_INK.light
  it("공통 옅은 입력·안내 면에서도 본문과 선택 테두리가 구분된다", () => {
    expect(
      ratio(surfaceBodyText({ ...s, isDark: dark }), s.surfaceSunken, s.canvas),
    ).toBeGreaterThanOrEqual(BODY)
    expect(
      ratio(s.textStrong, s.surfaceSunken, s.canvas),
    ).toBeGreaterThanOrEqual(BODY)
  })
  it("숫자 예시와 오류 안내가 실제 입력 면에서 읽힌다", () => {
    expect(
      ratio(
        recordFieldLabel({ ...s, isDark: dark }),
        s.surfaceSunken,
        s.canvas,
      ),
    ).toBeGreaterThanOrEqual(BODY)
    expect(ratio(ink.errorText, s.canvas, s.canvas)).toBeGreaterThanOrEqual(
      BODY,
    )
  })
})

describe("기록 페이지 — 라이트", () => {
  const ink = RECORD_INK.light
  const s = getSurfacePalette(false)

  it("물잔 안의 큰 퍼센트(30pt 굵게)는 물 위에서 읽힌다", () => {
    for (const ground of [ink.waterFill, ink.waterFillDeep, ink.waterSurface]) {
      expect(ratio(ink.waterValue, ground, s.canvas)).toBeGreaterThanOrEqual(
        LARGE,
      )
    }
  })

  it("물잔 안의 보조 숫자(15pt)도 물 위에서 읽힌다", () => {
    for (const ground of [ink.waterFill, ink.waterFillDeep, ink.waterSurface]) {
      expect(
        ratio(ink.waterValueMuted, ground, s.canvas),
      ).toBeGreaterThanOrEqual(BODY)
    }
  })

  it("담기 버튼의 글리프는 버튼 면에서 읽힌다", () => {
    expect(
      ratio(ink.waterFabGlyph, ink.waterFab, ink.waterCard),
    ).toBeGreaterThanOrEqual(BODY)
  })

  it("시간 표기의 회색 글자는 화면 바탕에서 읽힌다", () => {
    expect(ratio(s.text, s.canvas, s.canvas)).toBeGreaterThanOrEqual(BODY)
  })

  it("본문 글자는 카드 바닥에서 읽힌다", () => {
    expect(ratio(s.textStrong, ink.waterCard, s.canvas)).toBeGreaterThanOrEqual(
      BODY,
    )
  })

  it("규칙이 헛돌지 않는다 — 물 위의 옅은 회색은 떨어진다 (대조)", () => {
    expect(ratio("rgba(0,0,0,0.28)", ink.waterFill, s.canvas)).toBeLessThan(
      LARGE,
    )
  })
})

describe("기록 페이지 — 다크", () => {
  const ink = RECORD_INK.dark
  const d = getSurfacePalette(true)

  it("물잔 숫자는 어두운 물 위에서도 읽힌다", () => {
    for (const ground of [ink.waterFill, ink.waterFillDeep, ink.waterSurface]) {
      expect(ratio(ink.waterValue, ground, d.canvas)).toBeGreaterThanOrEqual(
        LARGE,
      )
      expect(
        ratio(ink.waterValueMuted, ground, d.canvas),
      ).toBeGreaterThanOrEqual(BODY)
    }
  })

  it("시간 표기의 회색 글자는 어두운 화면 바탕에서 읽힌다", () => {
    expect(ratio(d.text, d.canvas, d.canvas)).toBeGreaterThanOrEqual(BODY)
  })

  it("담기 버튼이 뒤집힌다 — 밝은 면에 어두운 글리프", () => {
    expect(
      ratio(ink.waterFabGlyph, ink.waterFab, ink.waterCard),
    ).toBeGreaterThanOrEqual(BODY)
  })

  it("본문 글자가 카드 바닥에서 읽힌다", () => {
    expect(ratio(d.textStrong, ink.waterCard, d.canvas)).toBeGreaterThanOrEqual(
      BODY,
    )
  })

  it("라이트의 카드색을 다크에 그대로 쓰면 본문이 안 읽힌다 (대조)", () => {
    expect(
      ratio(d.textStrong, RECORD_INK.light.waterCard, d.canvas),
    ).toBeLessThan(BODY)
  })
})
