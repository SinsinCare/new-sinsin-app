import { readFileSync } from "node:fs"
import { join } from "node:path"
import { railChipSurface } from "../src/features/restaurant/components/categoryChipSurface"
import { resolveTheme } from "../src/design-system-v2/theme"
import { touchTarget } from "../src/design-system-v2/tokens/size"

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** `#rrggbb` 의 상대휘도. 이 파일이 다루는 면은 전부 불투명 값이다. */
function luminance(hex: string): number {
  expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/u)
  const n = parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  )
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe("map category selection", () => {
  it("contrast oracle detects unreadable text", () => {
    expect(contrast("#ffffff", "#ffffff")).toBe(1)
    expect(contrast("#ffffff", "#777777")).toBeLessThan(4.5)
    expect(contrast("#ffffff", "#222222")).toBeGreaterThan(4.5)
  })
  it.each(["light", "dark"] as const)(
    "%s keeps selected and unselected readable and distinct",
    (mode) => {
      const colors = resolveTheme(mode).colors
      const on = railChipSurface({ active: true, mode, colors })
      const off = railChipSurface({ active: false, mode, colors })
      for (const surface of [on, off]) {
        expect(
          contrast(surface.color, surface.backgroundColor),
        ).toBeGreaterThanOrEqual(4.5)
        expect(surface.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i)
      }
      expect(on.backgroundColor).not.toBe(off.backgroundColor)
      expect(on.typography.fontFamily).not.toBe(off.typography.fontFamily)
      expect(on.borderWidth).toBe(off.borderWidth)
    },
  )
  it("uses a growing 44pt target and preserves toggle semantics", () => {
    const source = readFileSync(
      join(
        __dirname,
        "../src/features/restaurant/components/CategoryChipRail.tsx",
      ),
      "utf8",
    )
    expect(touchTarget.min).toBeGreaterThanOrEqual(44)
    expect(source).toContain("const HEIGHT = touchTarget.min")
    expect(source).toContain("minHeight: HEIGHT")
    expect(source).not.toMatch(/\n\s+height: HEIGHT/)
    expect(source).toContain("onSelect(isSelected ? null : spec.value)")
    expect(source).toContain(
      "accessibilityState={isToggle ? { selected: active } : undefined}",
    )
  })
})
