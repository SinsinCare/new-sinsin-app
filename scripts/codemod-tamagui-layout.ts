/**
 * tamagui 레이아웃 프리미티브(XStack/YStack/Text/View) → design-system-v2 이행.
 *
 * ## 이 스크립트가 하는 일과 **하지 않는 일**
 *
 * 한다:
 *   - `<XStack …>` → `<V2HStack …>`, `<YStack …>` → `<V2VStack …>`,
 *     `<Text …>` → `<V2Text …>`, tamagui `<View …>` → `<V2Box …>`
 *   - `gap="$3"` 같은 **숫자 토큰**을 `scripts/tamaguiTokenMap.ts` 표로 해석
 *   - import 문 교체
 *
 * **하지 않는다 — 이게 더 중요하다:**
 *   - **색 토큰을 옮기지 않는다.** `color="$colorSubtle"`, `fontFamily="$body"` 등
 *     161회는 다크모드 분기와 테마에 묶여 있어 기계가 판단할 수 없다.
 *     하나라도 만나면 **그 파일은 통째로 건너뛰고** 사람에게 넘긴다.
 *   - **표에 없는 토큰을 추측하지 않는다.** `resolveToken()` 이 null 이면 skip.
 *   - **`styled`/`useTheme`/`Provider` 를 쓰는 파일은 손대지 않는다**(구조 변경).
 *
 * 즉 이 스크립트는 **확신할 수 있는 것만** 옮기고 나머지는 정직하게 남긴다.
 * 애매한 것을 억지로 변환해 화면을 조용히 틀어뜨리는 것보다, 파일 수가 덜 줄어드는
 * 편이 낫다.
 *
 * ## 쓰는 법
 *
 * ```bash
 * npx tsx scripts/codemod-tamagui-layout.ts            # dry-run(기본) — 파일 안 고침
 * npx tsx scripts/codemod-tamagui-layout.ts --write     # 실제 적용
 * npx tsx scripts/codemod-tamagui-layout.ts --write src/features/home
 * ```
 *
 * 적용 후에는 **반드시** `npx tsc --noEmit` → `npx eslint` → 화면 확인 순으로 본다.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { resolveToken } from "./tamaguiTokenMap"

const WRITE = process.argv.includes("--write")
/**
 * 훑을 범위. 인자로 받으므로 **셸 문자열로 조립하지 않는다** —
 * `execFileSync` 에 배열로 넘겨 셸을 아예 거치지 않게 한다.
 */
const SCOPE = process.argv.slice(2).filter((a) => !a.startsWith("--"))
const ROOTS = SCOPE.length ? SCOPE : ["src", "app"]

/** 태그 이름 대응. */
const TAG: Record<string, string> = {
  XStack: "V2HStack",
  YStack: "V2VStack",
  Text: "V2Text",
  View: "V2Box",
}

/**
 * `V2Text` 는 **레이아웃 prop 을 받지 않는다**(글자만 그린다).
 * tamagui `<Text paddingHorizontal flex>` 는 흔하므로 여기서 걸러 `style` 로 접는다.
 *
 * 시범 적용에서 tsc 가 잡아낸 것: `paddingHorizontal`(app/consult.tsx),
 * `flex`(ChatHistoryCard). 타입이 잡아 주긴 하지만 **13파일을 통째로 되돌려야 했다** —
 * 스크립트가 애초에 안 만드는 편이 낫다.
 */
const TEXT_ONLY_REJECT = new Set([
  "flex",
  "padding",
  "paddingHorizontal",
  "paddingVertical",
  "gap",
  "align",
  "justify",
  "wrap",
])

/** 이 심볼이 import 에 있으면 파일 전체를 건너뛴다(구조 의존). */
const BLOCK_IMPORT =
  /\b(styled|useTheme|useThemeName|Theme|TamaguiProvider|createTamagui|Input|Label|Button|Sheet|Dialog|Portal|Popover|Adapt|Select|Spinner|Image|ScrollView|Circle|Square|Separator|SizableText|Paragraph|H1|H2|H3|H4|H5|H6)\b/

/**
 * `V2Stack`/`V2Text` 가 **prop 으로 직접 받는** 것들.
 * 나머지 스타일 prop 은 `style={{…}}` 로 접어 넣는다.
 *
 * ⚠️ `RENAME` 을 거친 **뒤의 이름**을 여기 적어야 한다. 시범 변환에서
 * `alignItems` → `align` 으로 바꿔 놓고 `align` 을 이 집합에 안 넣었더니
 * `style={{ align: "center" }}` 가 나왔다 — RN 스타일에 `align` 은 없으므로
 * **정렬이 통째로 사라진다.** 컴파일도 린트도 통과하고 화면만 틀어지는 부류다.
 */
const NATIVE_PROP = new Set([
  "gap",
  "flex",
  "padding",
  "paddingHorizontal",
  "paddingVertical",
  "color",
  "style",
  "key",
  "ref",
  // RENAME 결과 — 아래 세 개가 빠지면 정렬/줄바꿈이 조용히 사라진다.
  "align",
  "justify",
  "wrap",
  "onLayout",
  "onPress",
  "testID",
  "accessibilityRole",
  "accessibilityLabel",
  "accessibilityState",
  "accessibilityHint",
  "numberOfLines",
  "ellipsizeMode",
  "lineBreakStrategyIOS",
  "textBreakStrategy",
  "pointerEvents",
  "children",
])

/** align/justify 는 이름이 다르다. */
const RENAME: Record<string, string> = {
  alignItems: "align",
  justifyContent: "justify",
  flexWrap: "wrap",
}

type Skip = { file: string; reason: string }

function listFiles(): string[] {
  // 셸을 거치지 않는다(execFileSync + 인자 배열) — ROOTS 가 argv 에서 오기 때문.
  try {
    const out = execFileSync(
      "grep",
      ["-rlE", 'from "tamagui"', ...ROOTS, "--include=*.tsx"],
      { encoding: "utf8" },
    )
    return out.split("\n").filter(Boolean)
  } catch {
    // grep 은 매치가 없으면 exit 1 — 오류가 아니다.
    return []
  }
}

/** 파일을 훑어 변환 가능 여부만 판정한다. */
function inspect(src: string): { ok: boolean; reason?: string } {
  const imp = src.match(/import\s*\{([^}]+)\}\s*from\s*"tamagui"/)
  if (!imp) return { ok: false, reason: "tamagui import 형태가 다름" }
  if (BLOCK_IMPORT.test(imp[1]))
    return { ok: false, reason: `구조 의존 심볼: ${imp[1].trim()}` }

  /*
    ■ RN 과 이름이 겹치는 태그는 손대지 않는다 (시범 변환에서 잡힌 결함 #1)

    `ChipWithLine.tsx` 는 `import { View } from "react-native"` 와
    `import { Text, XStack } from "tamagui"` 를 함께 쓴다. 태그 이름만 보고 바꾸면
    **RN 의 `<View>` 까지 `<V2Box>` 로 바뀌어** import 가 없어 컴파일이 깨진다.

    `Text` 도 같은 문제를 갖는다 — 이 레포에는 `shared/components/AppText` 의 `Text`
    도 있다. 그래서 **tamagui import 에 실제로 있는 이름만** 변환 대상으로 삼는다.
  */
  const imported = new Set(
    imp[1]
      .split(",")
      .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean),
  )

  /*
    ■ 삼항식 안의 색 토큰 (결함 #2)

    `backgroundColor={isOver ? "$primaryLight" : "$borderColor"}` 는 `=$` 패턴이
    아니라서 예전 검사를 그대로 통과했다. 그러면 `$primaryLight` 가 `style` 안으로
    살아남고, RN 은 그 문자열을 해석하지 못해 **색이 조용히 사라진다.**

    이제 태그 본문에 `$` 가 하나라도 남아 있으면 해석을 시도하고, 숫자로 못 바꾸면
    파일 전체를 건너뛴다.
  */
  const tagNames = [...imported].filter((n) => n in TAG)
  if (!tagNames.length) return { ok: false, reason: "변환할 태그 없음" }

  const tagRe = new RegExp(`<(${tagNames.join("|")})(\\s[^>]*?)/?>`, "gs")
  for (const m of src.matchAll(tagRe)) {
    const body = m[2] ?? ""
    if (!body.includes("$")) continue
    for (const kv of body.matchAll(
      /(\w+)=(?:"(\$[^"]*)"|\{"(\$[^"]*)"\})/g,
    )) {
      const prop = kv[1]
      const val = kv[2] ?? kv[3]
      if (resolveToken(prop, val) === null)
        return { ok: false, reason: `해석 불가 토큰: ${prop}=${val}` }
    }
    // 위 패턴으로 소진되지 않은 `$` 가 남아 있으면(삼항식·템플릿 등) 사람에게 넘긴다.
    const consumed = body.replace(/(\w+)=(?:"(\$[^"]*)"|\{"(\$[^"]*)"\})/g, "")
    if (consumed.includes("$"))
      return { ok: false, reason: "표현식 안의 토큰(삼항식 등)" }
  }

  /*
    ■ position 기본값 차이 (결함 #3)

    tamagui 는 `position: relative` 가 기본이라 `bottom="$1"` 만으로 위치가 밀린다.
    RN 은 `static` 이 기본이므로 같은 값을 옮기면 **아무 일도 일어나지 않는다.**
    옮겨도 티가 안 나는 종류라 특히 위험하다 — 사람이 보게 남긴다.
  */
  if (/<(?:XStack|YStack|Text|View)[^>]*\s(?:top|bottom|left|right)=/s.test(src))
    return { ok: false, reason: "위치 prop(position 기본값이 다름)" }

  return { ok: true }
}

function transform(src: string): string {
  let out = src

  /*
    **tamagui import 에 실제로 있는 태그만** 바꾼다.
    이름만 보고 바꾸면 `import { View } from "react-native"` 의 `<View>` 까지
    건드려 컴파일이 깨진다(inspect 의 결함 #1 주석 참고).
  */
  const imp = src.match(/import\s*\{([^}]+)\}\s*from\s*"tamagui"/)
  if (!imp) return src
  const tagNames = imp[1]
    .split(",")
    .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
    .filter((n) => n in TAG)
  if (!tagNames.length) return src

  const openRe = new RegExp(`<(${tagNames.join("|")})(\\s[^>]*?)?(/?)>`, "gs")
  const closeRe = new RegExp(`</(${tagNames.join("|")})>`, "g")

  // 1) 태그 이름 + prop 변환
  out = out.replace(
    openRe,
    (_full, tag: string, body: string | undefined, selfClose: string) => {
      const next = TAG[tag]
      if (!body) return `<${next}${selfClose}>`

      const keep: string[] = []
      const styles: string[] = []
      const isText = next === "V2Text"
      /*
        원본에 이미 `style` 이 있으면 우리가 만든 것과 **둘 다 남아** JSX 가 깨진다
        (`JSX elements cannot have multiple attributes with the same name`).
        시범 적용에서 EditorToolbar 가 그렇게 깨졌다. 원본 style 을 따로 들고 있다가
        마지막에 배열로 합친다.
      */
      let existingStyle: string | null = null

      const attrRe = /(\w+)=(?:"([^"]*)"|\{((?:[^{}]|\{[^{}]*\})*)\})|(\{\.\.\.[^}]+\})/g
      for (const m of body.matchAll(attrRe)) {
        if (m[4]) {
          keep.push(m[4]) // 스프레드는 그대로
          continue
        }
        const prop = m[1]
        const strVal = m[2]
        const exprVal = m[3]
        const raw = strVal !== undefined ? `"${strVal}"` : `{${exprVal}}`

        if (prop === "style") {
          existingStyle = exprVal ?? `"${strVal}"`
          continue
        }

        // $토큰 → 숫자
        const tokenSrc = strVal ?? (exprVal?.match(/^"(\$[^"]*)"$/)?.[1] ?? "")
        if (tokenSrc.startsWith("$")) {
          const n = resolveToken(prop, tokenSrc)
          if (n === null) throw new Error(`해석 불가: ${prop}=${tokenSrc}`)
          const name = RENAME[prop] ?? prop
          if (NATIVE_PROP.has(name) && !(isText && TEXT_ONLY_REJECT.has(name)))
            keep.push(`${name}={${n}}`)
          else styles.push(`${name}: ${n}`)
          continue
        }

        const name = RENAME[prop] ?? prop
        // V2Text 는 레이아웃 prop 을 안 받는다 → style 로 접는다.
        const asProp =
          NATIVE_PROP.has(name) && !(isText && TEXT_ONLY_REJECT.has(name))
        if (asProp) {
          keep.push(`${name}=${raw}`)
        } else if (strVal !== undefined) {
          styles.push(`${name}: "${strVal}"`)
        } else {
          styles.push(`${name}: ${exprVal}`)
        }
      }

      if (styles.length || existingStyle) {
        const made = styles.length ? `{ ${styles.join(", ")} }` : null
        if (made && existingStyle)
          keep.push(`style={[${existingStyle}, ${made}]}`)
        else keep.push(`style={${made ?? existingStyle}}`)
      }
      const attrs = keep.length ? " " + keep.join(" ") : ""
      return `<${next}${attrs}${selfClose}>`
    },
  )

  // 2) 닫는 태그
  out = out.replace(closeRe, (_m, tag: string) => `</${TAG[tag]}>`)

  // 3) import 교체
  out = out.replace(
    /import\s*\{([^}]+)\}\s*from\s*"tamagui"\n/,
    (_m, names: string) => {
      const used = new Set(
        names
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((n) => TAG[n])
          .filter(Boolean),
      )
      if (!used.size) return ""
      return `import { ${[...used].sort().join(", ")} } from "@/src/design-system-v2"\n`
    },
  )

  return out
}

/**
 * 변환 결과를 자체 검증한다 — **스스로 만든 쓰레기를 못 내보내게.**
 *
 * 시범 변환에서 두 번 연속 같은 종류로 깨졌다:
 *   - `style={{ align: "center" }}`  (RENAME 결과를 NATIVE_PROP 에 안 넣음)
 *   - `style={{ backgroundColor: "$primaryLight" }}`  (삼항식 안의 색 토큰)
 *
 * 둘 다 **컴파일·린트를 통과하고 화면만 조용히 틀어진다.** 그래서 결과 문자열을
 * 직접 훑어 의심스러운 것이 있으면 그 파일을 버린다.
 */
function verify(out: string): string | null {
  // 1) RN 스타일에 없는 키 — RENAME 사고 재발 방지
  const bogus = out.match(/style=\{\{[^}]*\b(align|justify|wrap)\s*:/)
  if (bogus) return `RN 스타일에 없는 키가 style 로 샜다: ${bogus[1]}`

  // 2) style 안에 살아남은 $토큰 — 색이 조용히 사라지는 사고
  const token = out.match(/style=\{\{[^}]*"\$[^"]+"/)
  if (token) return "style 안에 $토큰이 남았다(색이 사라진다)"

  // 3) 태그가 반쯤 바뀐 상태
  if (/<\/(XStack|YStack)>/.test(out)) return "닫는 태그가 안 바뀐 것이 있다"

  // 4) 한 태그에 style 이 두 번 — JSX 가 깨진다
  for (const m of out.matchAll(/<V2(?:HStack|VStack|Box|Text)(\s[^>]*?)\/?>/gs)) {
    const styleCount = (m[1].match(/\bstyle=/g) ?? []).length
    if (styleCount > 1) return "한 태그에 style 이 두 번 붙었다"
  }

  return null
}

function main() {
  const files = listFiles()
  const skipped: Skip[] = []
  const changed: string[] = []

  for (const file of files) {
    const src = readFileSync(file, "utf8")
    const verdict = inspect(src)
    if (!verdict.ok) {
      skipped.push({ file, reason: verdict.reason ?? "?" })
      continue
    }
    try {
      const next = transform(src)
      if (next === src) continue
      const bad = verify(next)
      if (bad) {
        skipped.push({ file, reason: `자체검증 실패: ${bad}` })
        continue
      }
      if (WRITE) writeFileSync(file, next)
      changed.push(file)
    } catch (e) {
      skipped.push({ file, reason: (e as Error).message })
    }
  }

  console.log(`\n${WRITE ? "✍️  적용" : "🔍 DRY-RUN"} — 대상 ${files.length}파일\n`)
  console.log(`  ✅ 변환 ${changed.length}`)
  console.log(`  ⏭️  건너뜀 ${skipped.length}\n`)

  if (changed.length) {
    console.log("--- 변환된 파일 ---")
    for (const f of changed) console.log("   ", f)
  }

  const byReason = new Map<string, number>()
  for (const s of skipped) {
    const key = s.reason.replace(/:.*$/, "")
    byReason.set(key, (byReason.get(key) ?? 0) + 1)
  }
  console.log("\n--- 건너뛴 이유 ---")
  for (const [reason, n] of [...byReason].sort((a, b) => b[1] - a[1]))
    console.log(`   ${n}×  ${reason}`)

  if (!WRITE)
    console.log("\n실제 적용하려면 --write 를 붙인다. 적용 후 tsc·eslint·화면 확인 필수.")
}

main()
