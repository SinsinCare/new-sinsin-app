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

  /**
   * 실제로 코드를 삼켰던 케이스 (2026-08-19).
   *
   * 조건식을 `[^?]+?` 로 느슨하게 잡으면 **닫는 태그와 다음 줄을 통째로** 조건식으로
   * 먹는다. 그 결과 `</V2Text>` 가 사라지고 JSX 가 깨졌다:
   *
   *     </colors.label.normal} lineBreakStrategyIOS="hangul-word" …>
   *
   * tsc 가 잡아 주긴 하지만, 그때 `git checkout` 으로 되돌리면 **같은 파일의 다른
   * 미커밋 작업까지 날아간다**(실제로 두 번 겪었다). 그래서 파서 단계에서 막는다.
   */
  it("🔴 JSX 경계를 넘어 삼키지 않는다 — 닫는 태그가 살아 있어야 한다", () => {
    const src = [
      `<V2Text color={isDark ? colors.label.normal : colors.label.normal} style={{ fontSize: 17 }}>`,
      `  {t("title")}`,
      `</V2Text>`,
      `<V2Text color={isDark ? colors.label.normal : colors.label.normal} style={{ fontSize: 15 }}>`,
    ].join("\n")

    const { out, count } = collapseWhole(src)

    // 두 삼항 모두 접힌다
    expect(count).toBe(2)
    // **닫는 태그가 살아 있다** — 이것이 이 테스트의 전부다
    expect(out).toContain("</V2Text>")
    expect(out.split("\n")).toHaveLength(4)
    expect(out).toContain(`color={colors.label.normal}`)
    // 삼켜졌다면 이런 쓰레기가 남는다
    expect(out).not.toContain("</colors.")
  })

  it("조건이 여러 줄이어도 `? A : A` 가 한 줄이면 접는다 — 접는 판단은 값끼리만 본다", () => {
    const src = `color={\n  someVeryLongCondition\n    ? colors.a.b\n    : colors.a.b}`
    /*
      조건식이 여러 줄이어도 **접어도 안전하다** — 양쪽 값이 같으면 조건은 결과에
      영향을 주지 않기 때문이다. 중요한 건 "삼키지 않는 것" 이지 "안 접는 것" 이 아니다.
      다만 조건식 자체는 남는다(`someVeryLongCondition` 이 식으로 남아 lint 가 잡는다).
    */
    const { out, count } = collapseWhole(src)
    expect(count).toBe(1)
    expect(out).toContain("colors.a.b")
    // 줄 수가 줄지언정 다른 줄의 내용을 먹지는 않았다.
    expect(out).not.toContain("colors.a.b : colors.a.b")
  })
})
