/**
 * tamagui 색 토큰 → design-system-v2 대응표 (일회성 이행 도구).
 *
 * ## 근거는 추측이 아니라 대조다
 *
 * `src/theme/themes.ts` 가 tamagui 테마를 정의하면서 **이미 v2 값을 참조**하고 있다:
 *
 *     color        : s.textStrong        borderColor : s.border
 *     colorSubtle  : s.textMuted         background  : s.canvas
 *     cardBackground: s.card             danger      : v2.status.negative
 *
 * 즉 두 계보가 같은 정본(surface/semantic)을 보고 있었고, 이 표는 그 참조를
 * 그대로 뒤집은 것이다.
 *
 * ## 잃는 것 하나 — 테마 자동 전환
 *
 * tamagui 는 스킴에 따라 값을 알아서 뒤집어 줬다. v2 로 오면 `useV2Theme()` 가
 * 그 역할을 하므로 **호출부가 훅을 부르고 있어야 한다.** 이 스크립트는 표만 바꾸고
 * 훅 주입은 하지 않는다 — 안 부르면 tsc 가 `colors` 미정의로 잡는다(의도한 안전망).
 *
 *     npx tsx scripts/tamagui-color-map.ts <파일…>          # 미리보기
 *     npx tsx scripts/tamagui-color-map.ts --write <파일…>
 */
import { readFileSync, writeFileSync } from "node:fs"

const WRITE = process.argv.includes("--write")
const FILES = process.argv.slice(2).filter((a) => !a.startsWith("--"))

/**
 * themes.ts 를 뒤집은 표. 값은 `colors.*` 경로.
 *
 * ⚠️ 눈으로 짐작하면 틀린다. 실제로 세 번 틀렸고 `tests/tamaguiColorMap.test.ts` 가
 * 잡았다(2026-08-19):
 *   `$color` 는 `label.strong`(#000) 이 아니라 **`label.normal`**(#2a2a37) 이고,
 *   `$colorSubtle` 은 `label.neutral` 이 아니라 **`label.alternative`** 다.
 *   `$cardBackground` 는 다크에서 `background.default`(#1f1f21) 가 아니라
 *   한 단 뜬 **`background.lower`**(#313135) 다 — 카드가 바닥과 같은 면이 되면
 *   경계가 사라진다.
 */
export const COLOR_MAP: Record<string, string> = {
  // 글자
  $color: "colors.label.normal",
  $colorSubtle: "colors.label.alternative",
  "$color.pureWhite": "colors.static.white",
  $black: "colors.label.normal",
  $textDark: "colors.label.normal",
  // 면
  $background: "colors.background.default",
  $cardBackground: "colors.background.lower",
  $appBg: "colors.background.default",
  $appBgDark: "colors.background.default",
  $cardBgDark: "colors.background.lower",
  $offWhite: "colors.background.lower",
  $backgroundPress: "colors.fill.pressed",
  $backgroundFocus: "colors.fill.normal",
  // 선
  $borderColor: "colors.line.normal",
  // 상태·브랜드
  $primary: "colors.primary.primary",
  $primaryLight: "colors.primary.primaryWeak",
  $danger: "colors.status.negative",
  $dangerBackground: "colors.accentForeground.redWeak",
  $secondary: "colors.status.positive",
  $secondaryLight: "colors.accentForeground.greenWeak",
  $success: "colors.status.positive",
  $warning: "colors.status.cautionary",
}

/**
 * 앱 고유 팔레트는 v2 로 옮기지 않고 `tokens.color.*.val` 로 내린다.
 * 브랜드 램프(sub/primary 스케일)와 회색 계단은 v2 에 같은 단이 없다.
 */
const APP_TOKEN =
  /^\$(sub\d|primary\d|grey\d|error|restrictionText|primaryAccent|textLight|textDarkSub|color\.grey\d)$/

/** space 스케일 (gap·padding·margin). tokens.ts 정본. */
const SPACE: Record<string, number> = {
  $0: 0,
  $1: 4,
  "$1.5": 6,
  $2: 8,
  "$2.5": 10,
  $3: 12,
  $4: 16,
  $5: 20,
  $6: 24,
  $7: 28,
  $8: 32,
  $9: 36,
  $10: 40,
  $12: 48,
}
/** radius 스케일 — space 와 값이 다르다. 섞으면 모서리가 조용히 틀어진다. */
const RADIUS: Record<string, number> = {
  $1: 2,
  $2: 4,
  $3: 6,
  $4: 8,
  $5: 10,
  $6: 12,
  $8: 16,
  $10: 24,
  $12: 48,
}
/** font.size 스케일. */
const FONT: Record<string, number> = {
  $1: 10,
  $2: 11,
  $3: 12,
  $4: 14,
  $5: 15,
  $6: 16,
  $7: 17,
  $8: 22,
  $9: 26,
  $10: 30,
}

const SPACE_PROP =
  /^(gap|padding|paddingHorizontal|paddingVertical|paddingTop|paddingBottom|paddingLeft|paddingRight|margin|marginHorizontal|marginVertical|marginTop|marginBottom|marginLeft|marginRight|width|height|top|bottom|left|right)$/

function convert(src: string): { out: string; unresolved: string[] } {
  const unresolved: string[] = []

  /*
    1단계: `prop="$tok"` / `prop={"$tok"}` — 가장 흔한 형태.
  */
  let out = src.replace(
    /(\w+)=(?:"(\$[\w.]+)"|\{"(\$[\w.]+)"\})/g,
    (whole, prop: string, a: string, b: string) => {
      const tok = a ?? b
      const mapped = mapToken(prop, tok)
      if (mapped === null) {
        unresolved.push(`${prop}=${tok}`)
        return whole
      }
      return `${prop}={${mapped}}`
    },
  )

  /*
    2단계: **표현식 안에 박힌 토큰** — `isDark ? "$appBgDark" : "$appBg"` 같은 것.

    1단계만 돌리면 이런 토큰이 그대로 살아남아 RN 에 문자열 `"$appBg"` 가 넘어가고
    **색이 통째로 사라진다**(실측: TextRecord 시범 변환). 여기서는 prop 이름을 알 수
    없으므로 색 표만 적용한다 — 숫자 토큰이 표현식에 들어가는 경우는 실측상 없다.
  */
  out = out.replace(/"(\$[\w.]+)"/g, (whole, tok: string) => {
    if (COLOR_MAP[tok]) return COLOR_MAP[tok]
    if (APP_TOKEN.test(tok))
      return `tokens.color.${tok.slice(1).replace("color.", "")}.val`
    unresolved.push(`(표현식) ${tok}`)
    return whole
  })

  return { out, unresolved }
}

/** prop 이름을 알 때의 해석. 모르면 null. */
function mapToken(prop: string, tok: string): string | null {
  if (COLOR_MAP[tok]) return COLOR_MAP[tok]
  if (APP_TOKEN.test(tok))
    return `tokens.color.${tok.slice(1).replace("color.", "")}.val`
  const table = /adius/.test(prop)
    ? RADIUS
    : /fontSize|lineHeight/.test(prop)
      ? FONT
      : SPACE_PROP.test(prop)
        ? SPACE
        : null
  if (table && table[tok] !== undefined) return String(table[tok])
  return null
}

for (const file of FILES) {
  const src = readFileSync(file, "utf8")
  const { out, unresolved } = convert(src)
  if (unresolved.length) {
    console.log(
      `⏭️  ${file} — 해석 불가: ${[...new Set(unresolved)].join(", ")}`,
    )
    continue
  }
  if (out === src) {
    console.log(`·  ${file} — 변화 없음`)
    continue
  }
  if (WRITE) {
    writeFileSync(file, out)
    console.log(`✅ ${file}`)
  } else console.log(`🔍 ${file} — 변환 가능`)
}
