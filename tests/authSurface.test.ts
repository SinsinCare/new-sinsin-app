import { LAYOUT, TYPE, MOTION, getSurfacePalette } from "../src/theme/surface"
import {
  semanticDark,
  semanticLight,
} from "../src/design-system-v2/tokens/colors"
import { typography } from "../src/design-system-v2/tokens/typography"
import { AUTH_LAYOUT, AUTH_TYPE } from "../src/features/auth/data/authSurface"

describe("surface palette", () => {
  it("separates layers by tone in both schemes", () => {
    ;[true, false].forEach((isDark) => {
      const p = getSurfacePalette(isDark)
      // 면과 바닥이 같은 색이면 테두리가 거의 없는 화면에서 입력칸이 사라진다.
      expect(p.surface).not.toBe(p.canvas)
      expect(p.surfacePressed).not.toBe(p.surface)
      expect(p.surfaceBrand).not.toBe(p.surface)
      // 카드 안의 입력칸도 마찬가지다 — 카드와 우물이 같은 색이면 입력칸이 카드에 먹힌다.
      expect(p.surface).not.toBe(p.card)
    })
  })

  it("keeps the layer order pointing away from the canvas in both schemes", () => {
    // 라이트는 층마다 어두워지고 다크는 층마다 밝아진다. 방향이 뒤집히면
    // 누르는 순간 면이 바닥 쪽으로 되돌아가 눌림이 반대로 읽힌다.
    const luminance = (hex: string) => {
      const h = hex.replace("#", "")
      return (
        parseInt(h.slice(0, 2), 16) * 0.299 +
        parseInt(h.slice(2, 4), 16) * 0.587 +
        parseInt(h.slice(4, 6), 16) * 0.114
      )
    }
    const light = getSurfacePalette(false)
    expect(luminance(light.surface)).toBeLessThan(luminance(light.canvas))
    expect(luminance(light.surfacePressed)).toBeLessThan(
      luminance(light.surface),
    )

    const dark = getSurfacePalette(true)
    expect(luminance(dark.card)).toBeGreaterThan(luminance(dark.canvas))
    expect(luminance(dark.surface)).toBeGreaterThan(luminance(dark.card))
    expect(luminance(dark.surfacePressed)).toBeGreaterThan(
      luminance(dark.surface),
    )
  })

  it("does not reuse light tones in dark mode", () => {
    const light = getSurfacePalette(false)
    const dark = getSurfacePalette(true)

    expect(dark.canvas).not.toBe(light.canvas)
    expect(dark.surface).not.toBe(light.surface)
    expect(dark.textStrong).not.toBe(light.textStrong)
    expect(dark.card).not.toBe(light.card)
  })

  it("keeps one brand color across schemes and reserves white for on-brand text", () => {
    expect(getSurfacePalette(false).brand).toBe(getSurfacePalette(true).brand)
    // 값의 출처가 v2 시맨틱으로 옮겨가면서 표기가 소문자가 됐다 — 색은 같다.
    expect(getSurfacePalette(false).onBrand.toLowerCase()).toBe("#ffffff")
  })

  it("draws every palette value from the v2 semantics — 손으로 고른 회색이 남아 있지 않다", () => {
    // 팔레트 값은 전부 v2 시맨틱 값이거나 그 값들을 합성한 결과여야 한다.
    // 여기 없는 색이 하나라도 있으면 계보가 다시 갈라지기 시작한 것이다.
    const allowed = new Set(
      [semanticLight, semanticDark].flatMap((set) =>
        Object.values(set).flatMap((group) =>
          Object.values(group).map((v) => String(v).toLowerCase()),
        ),
      ),
    )
    ;[false, true].forEach((isDark) => {
      const p = getSurfacePalette(isDark)
      // 합성으로 만든 면(7개)은 정의상 팔레트에 없다 — 그 외는 전부 토큰 값 그대로여야 한다.
      // `surfaceSunken` 은 `over(fill.alternative, card)` 다(레시피 작성의 설명 칸).
      // **`band` 는 여기 없다** — 그건 `background.lower` 를 그대로 가리키므로
      // 토큰 값 검사를 통과해야 맞다. 통과 못 하면 그때는 진짜 드리프트다.
      const composed = new Set([
        "surface",
        "surfaceSunken",
        "surfacePressed",
        "surfaceBrand",
        "card",
        "ctaOffBg",
        "recordedTint",
      ])
      Object.entries(p).forEach(([key, value]) => {
        if (composed.has(key)) return
        expect(allowed.has(String(value).toLowerCase())).toBe(true)
      })
    })
  })

  it("keeps a disabled CTA readable as disabled — not brand, not body text", () => {
    ;[true, false].forEach((isDark) => {
      const p = getSurfacePalette(isDark)
      expect(p.ctaOffBg).not.toBe(p.brand)
      expect(p.ctaOffText).not.toBe(p.textStrong)
      expect(p.ctaOffText).not.toBe(p.ctaOffBg)
    })
  })

  it("keeps danger separate from brand — 주의와 강조가 같은 색이면 경고가 안 읽힌다", () => {
    ;[true, false].forEach((isDark) => {
      const p = getSurfacePalette(isDark)
      expect(p.danger).not.toBe(p.brand)
    })
  })
})

describe("layout tokens follow the spec sheet", () => {
  it("puts text, fields and the CTA on one left baseline", () => {
    expect(LAYOUT.screenX).toBe(20)
  })

  it("keeps the sheet's field/CTA geometry", () => {
    expect(LAYOUT.field).toEqual({ height: 56, radius: 14 })
    expect(LAYOUT.cta.height).toBe(56)
    expect(LAYOUT.cta.radius).toBe(16)
    expect(LAYOUT.selectCard).toEqual({ size: 128, radius: 20 })
    expect(LAYOUT.sheet.radius).toBe(24)
  })

  it("keeps the home record geometry", () => {
    expect(LAYOUT.card).toEqual({ radius: 16, padding: 18, gap: 12 })
    expect(LAYOUT.chip).toEqual({ height: 36, radius: 10 })
    expect(LAYOUT.control).toEqual({ height: 44, radius: 12 })
    expect(LAYOUT.segment.itemHeight).toBe(36)
    expect(LAYOUT.ctaCompact).toEqual({ height: 52, radius: 16 })
    expect(LAYOUT.section.paddingVertical).toBe(24)
    expect(LAYOUT.section.paddingHorizontal).toBe(20)
  })

  it("takes every TYPE entry from the v2 typography scale", () => {
    // 크기·행간을 여기서 새로 정하는 순간 "같은 15px 이 탭마다 다른 폭"이 다시 시작된다.
    const scale = Object.values(typography).flatMap((group) =>
      Object.values(group).map((t) => `${t.fontSize}/${t.lineHeight}`),
    )
    Object.entries(TYPE).forEach(([key, token]) => {
      expect([key, `${token.fontSize}/${token.lineHeight}`]).toEqual([
        key,
        expect.stringMatching(
          new RegExp(
            `^(${scale.map((s) => s.replace("/", "\\/")).join("|")})$`,
          ),
        ),
      ])
      // 정본은 자간이 전부 0 이다. 음수 트래킹이 다시 들어오면 여기서 잡힌다.
      expect(token.letterSpacing).toBe(0)
    })
  })

  it("orders the type scale by weight of information", () => {
    expect(TYPE.numeric.fontSize).toBeGreaterThan(TYPE.question.fontSize)
    expect(TYPE.question.fontSize).toBeGreaterThan(TYPE.sectionTitle.fontSize)
    expect(TYPE.sectionTitle.fontSize).toBeGreaterThan(TYPE.value.fontSize)
    expect(TYPE.value.fontSize).toBeGreaterThan(TYPE.label.fontSize)
  })

  it("keeps transitions short enough to feel like one motion", () => {
    expect(MOTION.duration.base).toBeLessThanOrEqual(240)
    expect(MOTION.shift).toBeLessThanOrEqual(28)
  })
})

describe("auth aliases stay bound to the shared tokens", () => {
  it("does not fork its own values", () => {
    expect(AUTH_LAYOUT.fieldHeight).toBe(LAYOUT.field.height)
    expect(AUTH_LAYOUT.radius.cta).toBe(LAYOUT.cta.radius)
    expect(AUTH_LAYOUT.selectCardSize).toBe(LAYOUT.selectCard.size)
    expect(AUTH_TYPE.question).toBe(TYPE.question)
    expect(AUTH_TYPE.label).toBe(TYPE.label)
  })
})
