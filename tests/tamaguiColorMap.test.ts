/**
 * `scripts/tamagui-color-map.ts` 의 색 대응표가 **정본과 일치하는지** 대조한다.
 *
 * ## 왜 이 테스트가 필요한가
 *
 * 색을 잘못 옮겨도 tsc·eslint·기존 테스트가 전부 통과한다. `label.strong` 을
 * `label.normal` 로 옮기면 글자가 조금 흐려질 뿐이고, 다크모드에서만 틀리면
 * 라이트로 보는 사람은 영영 모른다. **화면을 열어도 못 잡는 부류**다.
 *
 * 그런데 이 표에는 근거가 있다 — `src/theme/themes.ts` 가 tamagui 테마를 만들면서
 * 이미 v2 값을 참조한다. 즉 표는 그 참조를 뒤집은 것이고, 뒤집기가 맞는지는
 * **양쪽 실제 값을 비교**하면 확인된다. 이 파일이 하는 일이 그것이다.
 */
import { COLOR_MAP } from "../scripts/tamagui-color-map"
import { lightTheme, darkTheme } from "@/src/theme/themes"
import {
  semanticLight,
  semanticDark,
} from "@/src/design-system-v2/tokens/colors"

/** `colors.label.strong` 같은 경로를 실제 값으로 판다. */
function dig(root: Record<string, unknown>, path: string): unknown {
  return path
    .replace(/^colors\./, "")
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], root)
}

/** tamagui 테마 값은 문자열 또는 `{ val }` 래퍼로 온다. */
function themeValue(
  theme: Record<string, unknown>,
  key: string,
): string | null {
  const raw = theme[key.slice(1)] as unknown
  if (raw == null) return null
  if (typeof raw === "string") return raw
  const v = (raw as { val?: unknown }).val
  return typeof v === "string" ? v : null
}

describe("색 대응표 — themes.ts 와 실제 값이 같은가", () => {
  /*
    핵심만 고른다. 여기 있는 것들은 `themes.ts` 가 v2/surface 를 **직접** 가리켜
    1:1 대조가 성립하는 항목이다. `$textDark`·`$cardBgDark` 처럼 스킴 한쪽만
    가리키던 토큰은 v2 에서 한 토큰으로 접히므로 이 대조에 넣지 않는다
    (접는 판단 자체는 사람이 한 것이고, 커밋 메시지에 근거를 남겼다).
  */
  const PAIRS: [string, string][] = [
    ["$color", "colors.label.normal"],
    ["$colorSubtle", "colors.label.alternative"],
    ["$borderColor", "colors.line.normal"],
    ["$background", "colors.background.default"],
    ["$danger", "colors.status.negative"],
    ["$secondary", "colors.status.positive"],
    ["$warning", "colors.status.cautionary"],
    ["$primary", "colors.primary.primary"],
  ]

  it.each(PAIRS)("라이트: %s → %s", (token, path) => {
    const expected = themeValue(
      lightTheme as unknown as Record<string, unknown>,
      token,
    )
    const actual = dig(
      semanticLight as unknown as Record<string, unknown>,
      path,
    )
    // 정본에 없는 키면 테스트가 의미 없다 — 그것부터 실패로 드러낸다.
    expect(typeof actual).toBe("string")
    if (expected != null) {
      expect(String(actual).toLowerCase()).toBe(expected.toLowerCase())
    }
  })

  it.each(PAIRS)("다크: %s → %s", (token, path) => {
    const expected = themeValue(
      darkTheme as unknown as Record<string, unknown>,
      token,
    )
    const actual = dig(semanticDark as unknown as Record<string, unknown>, path)
    expect(typeof actual).toBe("string")
    if (expected != null) {
      expect(String(actual).toLowerCase()).toBe(expected.toLowerCase())
    }
  })

  it("표의 모든 목적지가 v2 정본에 실재한다 — 오타가 조용히 통과하면 안 된다", () => {
    const missing: string[] = []
    for (const [token, path] of Object.entries(COLOR_MAP)) {
      const v = dig(semanticLight as unknown as Record<string, unknown>, path)
      if (typeof v !== "string") missing.push(`${token} → ${path}`)
    }
    expect(missing).toEqual([])
  })

  /**
   * `$cardBackground` 는 **한 v2 토큰으로 접히지 않는다.**
   *
   *   light: #ffffff = background.default   (바닥과 같은 흰 면)
   *   dark : #313135 = background.lower     (바닥 #1f1f21 보다 한 단 뜬 면)
   *
   * 즉 "카드는 바닥보다 뜬 면" 이라는 규칙이 라이트에서만 깨져 있다. v2 에 그 관계를
   * 그대로 담는 토큰이 없으므로 표는 `background.lower` 로 두되(다크의 의도를 살린다),
   * **라이트에서 카드가 살짝 회색이 된다**는 것을 알고 옮긴다. 화면 확인이 필요한 지점.
   *
   * 이 테스트는 그 차이를 못 박아 둔다 — 나중에 누가 "왜 다르지?" 하고 한쪽으로
   * 통일하려 할 때, 그게 의도된 차이였음을 알 수 있어야 한다.
   */
  it("$cardBackground 는 스킴별로 다른 v2 토큰을 가리킨다 — 접히지 않는다", () => {
    const L = lightTheme as unknown as Record<string, unknown>
    const D = darkTheme as unknown as Record<string, unknown>
    const lightCard = themeValue(L, "$cardBackground")
    const darkCard = themeValue(D, "$cardBackground")

    // 라이트 카드 = 바닥과 같은 면
    expect(lightCard?.toLowerCase()).toBe(
      String(semanticLight.background.default).toLowerCase(),
    )
    // 다크 카드 = 바닥보다 한 단 뜬 면
    expect(darkCard?.toLowerCase()).toBe(
      String(semanticDark.background.lower).toLowerCase(),
    )
    // 그래서 두 스킴의 대응 토큰 이름이 다르다.
    expect(semanticDark.background.lower).not.toBe(
      semanticDark.background.default,
    )
  })
})
