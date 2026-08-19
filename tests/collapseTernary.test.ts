/**
 * `collapse-identical-ternary` 가 **접어야 할 것만** 접는지 검증한다.
 *
 * tamagui → v2 이행에서 `isDark ? "$appBgDark" : "$appBg"` 같은 분기가
 * `isDark ? colors.background.default : colors.background.default` 로 바뀐다.
 * v2 토큰이 스킴을 이미 알기 때문이다. 양쪽이 같아진 삼항은 접어야 하지만,
 * **다른 것을 접으면 다크모드가 통째로 깨진다.** 그 경계를 여기서 못 박는다.
 */
import { collapseWhole } from "../scripts/collapse-identical-ternary"

describe("같아진 삼항만 접는다", () => {
  it("양쪽이 같으면 접는다", () => {
    const src = `backgroundColor: isDarkMode ? colors.background.default : colors.background.default,`
    expect(collapseWhole(src).out).toBe(
      `backgroundColor: colors.background.default,`,
    )
  })

  it("양쪽이 다르면 **손대지 않는다** — 여기가 깨지면 다크모드가 죽는다", () => {
    const src = `color: isDark ? colors.label.normal : colors.label.strong`
    const { out, count } = collapseWhole(src)
    expect(out).toBe(src)
    expect(count).toBe(0)
  })

  it("`.val` 접미가 붙은 앱 토큰도 같으면 접는다", () => {
    const src = `color={isDark ? tokens.color.grey5.val : tokens.color.grey5.val}`
    expect(collapseWhole(src).out).toBe(`color={tokens.color.grey5.val}`)
  })

  it("`.val` 끼리 달라도 안 접는다", () => {
    const src = `color={isDark ? tokens.color.grey5.val : tokens.color.grey8.val}`
    expect(collapseWhole(src).count).toBe(0)
  })

  it('비교식 조건도 접는다 — `scheme === "dark"` 형태', () => {
    const src = `bg={scheme === "dark" ? colors.fill.normal : colors.fill.normal}`
    expect(collapseWhole(src).out).toBe(`bg={colors.fill.normal}`)
  })

  it("문자열 리터럴은 대상이 아니다 — 경로만 본다", () => {
    const src = `color={isDark ? "white" : "white"}`
    // 리터럴은 이 도구의 관심사가 아니다(사람이 판단할 여지가 있다).
    expect(collapseWhole(src).count).toBe(0)
  })

  it("여러 곳을 한 번에 접고 개수를 센다", () => {
    const src = `
      a={isDark ? colors.a.b : colors.a.b}
      c={isDark ? colors.c.d : colors.c.d}
      e={isDark ? colors.e.f : colors.g.h}
    `
    const { out, count } = collapseWhole(src)
    expect(count).toBe(2)
    expect(out).toContain("a={colors.a.b}")
    expect(out).toContain("c={colors.c.d}")
    // 다른 것은 그대로
    expect(out).toContain("isDark ? colors.e.f : colors.g.h")
  })
})
