import { LAYOUT, TYPE, MOTION, getSurfacePalette } from "../src/theme/surface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../src/features/auth/data/authSurface"

describe("surface palette", () => {
  it("separates layers by tone in both schemes", () => {
    ;[true, false].forEach((isDark) => {
      const p = getSurfacePalette(isDark)
      // 면과 바닥이 같은 색이면 테두리가 거의 없는 화면에서 입력칸이 사라진다.
      expect(p.surface).not.toBe(p.canvas)
      expect(p.surfacePressed).not.toBe(p.surface)
      expect(p.surfaceBrand).not.toBe(p.surface)
    })
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
    expect(getSurfacePalette(false).onBrand).toBe("#FFFFFF")
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
