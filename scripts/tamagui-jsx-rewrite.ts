/**
 * tamagui JSX → design-system-v2 변환기 (일회성 보조 도구).
 *
 * ## 왜 또 만드나 — `codemod-tamagui-layout.ts` 로 안 되는 파일들
 *
 * 그 코드모드는 **자신 없는 파일은 통째로 건너뛴다**(색 토큰·삼항식 등). 남은 파일은
 * 대부분 그런 것들이라 결국 사람이 손대야 하는데, 그때 급하게 짠 정규식 치환이
 * **화살표 함수를 잘라먹는 사고**를 냈다(2026-08-19, TextRecord).
 *
 *     onPress={() => void handleClose()}
 *                  ↑ 이 `>` 를 태그 끝으로 오인해 뒤가 통째로 날아갔다
 *
 * 원인은 `<Tag ...>` 를 `[^>]*` 로 잡은 것이다. JSX 속성값 안에는 `>` 가 얼마든지
 * 들어간다. 그래서 이 파일은 **중괄호 깊이를 세면서** 태그 끝을 찾는다.
 *
 * ## 쓰는 법
 *
 *     npx tsx scripts/tamagui-jsx-rewrite.ts <파일…>          # dry-run(diff 미리보기)
 *     npx tsx scripts/tamagui-jsx-rewrite.ts --write <파일…>
 *
 * 색 토큰은 **건드리지 않는다** — `$color` 같은 값이 남아 있으면 그 파일은 손대지 않고
 * 이유를 알린다. 색은 화면을 보고 사람이 정해야 한다(themes.ts 대응표는 커밋 메시지에).
 */
import { readFileSync, writeFileSync } from "node:fs"

const WRITE = process.argv.includes("--write")
const FILES = process.argv.slice(2).filter((a) => !a.startsWith("--"))

const TAG: Record<string, string> = {
  XStack: "V2HStack",
  YStack: "V2VStack",
  Text: "V2Text",
  View: "V2Box",
}

const RENAME: Record<string, string> = {
  alignItems: "align",
  justifyContent: "justify",
  flexWrap: "wrap",
}

/**
 * V2Stack 이 prop 으로 받는 것. 나머지는 style 로 접는다.
 *
 * ⚠️ `onPress`·접근성·`hitSlop` 은 **스타일이 아니다.** 여기 없으면 style 객체로
 * 새고, 그러면 버튼이 눌리지 않거나 스크린리더가 못 읽는다 — tsc 가 잡아 주긴
 * 하지만(실측: TextRecord 닫기 버튼) 애초에 안 만드는 편이 낫다.
 */
const STACK_PROP = new Set([
  "gap",
  "flex",
  "padding",
  "paddingHorizontal",
  "paddingVertical",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "align",
  "justify",
  "wrap",
  "onPress",
  "onLayout",
  "hitSlop",
  "activeOpacity",
  "accessibilityRole",
  "accessibilityLabel",
  "accessibilityState",
  "accessible",
  "testID",
  "pointerEvents",
  "collapsable",
])

/**
 * 옮기지 않고 **버리는** prop.
 *
 * `pressStyle` 은 tamagui 전용이다. v2 는 `V2Stack` 의 `activeOpacity`(기본 0.7)로
 * 같은 효과를 내므로 그대로 옮기면 style 에 쓰레기가 남는다. 실측상 이 레포의
 * `pressStyle` 은 전부 `{ opacity: 0.7 }` 이라 기본값과 같다.
 */
const DROP_PROP = new Set([
  "pressStyle",
  "hoverStyle",
  "focusStyle",
  "animation",
])

/** V2Text 는 레이아웃을 받지 않는다(글자만 그린다). */
const TEXT_PROP = new Set([
  "color",
  "token",
  "numberOfLines",
  "ellipsizeMode",
  "lineBreakStrategyIOS",
  "textBreakStrategy",
  "selectable",
  "allowFontScaling",
  "maxFontSizeMultiplier",
  "adjustsFontSizeToFit",
  "onPress",
  "onLayout",
  "accessibilityRole",
  "accessibilityLabel",
  "testID",
])

/** style 로 접을 때 이름이 다른 것. */
const STYLE_KEY: Record<string, string> = {
  align: "alignItems",
  justify: "justifyContent",
  wrap: "flexWrap",
}

/**
 * 여는 태그의 끝을 **중괄호 깊이를 세며** 찾는다.
 *
 * 이 함수가 이 파일의 전부다. `[^>]*` 로 잡으면 `() => x` 의 `>` 에서 잘린다.
 */
function findTagEnd(src: string, from: number): { end: number; self: boolean } {
  let depth = 0
  let quote: string | null = null
  for (let i = from; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c
      continue
    }
    if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth === 0) {
      const self = src[i - 1] === "/"
      return { end: i, self }
    }
  }
  return { end: -1, self: false }
}

/** 속성 문자열을 (이름, 원시값) 목록으로 쪼갠다. 중괄호 깊이를 센다. */
function parseAttrs(body: string): { name: string; raw: string }[] {
  const out: { name: string; raw: string }[] = []
  let i = 0
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++
    if (i >= body.length) break
    if (body.startsWith("{...", i)) {
      let depth = 0
      const s = i
      for (; i < body.length; i++) {
        if (body[i] === "{") depth++
        else if (body[i] === "}") {
          depth--
          if (depth === 0) {
            i++
            break
          }
        }
      }
      out.push({ name: "...", raw: body.slice(s, i) })
      continue
    }
    const m = /^([A-Za-z_][\w.-]*)/.exec(body.slice(i))
    if (!m) {
      i++
      continue
    }
    const name = m[1]
    i += name.length
    while (i < body.length && /\s/.test(body[i])) i++
    if (body[i] !== "=") {
      out.push({ name, raw: "" }) // boolean prop
      continue
    }
    i++
    while (i < body.length && /\s/.test(body[i])) i++
    const s = i
    if (body[i] === '"' || body[i] === "'") {
      const q = body[i++]
      while (i < body.length && body[i] !== q) i++
      i++
    } else if (body[i] === "{") {
      let depth = 0
      for (; i < body.length; i++) {
        if (body[i] === "{") depth++
        else if (body[i] === "}") {
          depth--
          if (depth === 0) {
            i++
            break
          }
        }
      }
    }
    out.push({ name, raw: body.slice(s, i) })
  }
  return out
}

function rewrite(src: string): { out: string; skipped?: string } {
  // 색 토큰이 남아 있으면 사람에게 넘긴다.
  const colorToken = src.match(
    /(?:color|backgroundColor|borderColor)="(\$[\w.]+)"/,
  )
  if (colorToken) return { out: src, skipped: `색 토큰 ${colorToken[1]}` }

  let out = ""
  let i = 0
  const names = Object.keys(TAG).join("|")
  const openRe = new RegExp(`<(${names})(?=[\\s/>])`, "g")

  while (i < src.length) {
    openRe.lastIndex = i
    const m = openRe.exec(src)
    if (!m) {
      out += src.slice(i)
      break
    }
    out += src.slice(i, m.index)
    const tag = m[1]
    const bodyStart = m.index + m[0].length
    const { end, self } = findTagEnd(src, bodyStart)
    if (end < 0) {
      out += src.slice(m.index)
      break
    }
    const body = src.slice(bodyStart, self ? end - 1 : end)
    const next = TAG[tag]
    const isText = next === "V2Text"
    const allowed = isText ? TEXT_PROP : STACK_PROP

    const keep: string[] = []
    const styles: string[] = []
    let existingStyle: string | null = null

    for (const { name, raw } of parseAttrs(body)) {
      if (name === "...") {
        keep.push(raw)
        continue
      }
      if (name === "key" || name === "ref") {
        keep.push(`${name}=${raw}`)
        continue
      }
      if (name === "style") {
        existingStyle = raw.startsWith("{") ? raw.slice(1, -1) : raw
        continue
      }
      if (DROP_PROP.has(name)) continue
      const renamed = RENAME[name] ?? name
      if (allowed.has(renamed)) {
        keep.push(raw ? `${renamed}=${raw}` : renamed)
        continue
      }
      // style 로 접는다
      const key = STYLE_KEY[renamed] ?? renamed
      const val = raw.startsWith("{") ? raw.slice(1, -1) : raw
      styles.push(`${key}: ${val}`)
    }

    const parts = [next, ...keep]
    if (styles.length && existingStyle)
      parts.push(`style={[{ ${styles.join(", ")} }, ${existingStyle}]}`)
    else if (styles.length) parts.push(`style={{ ${styles.join(", ")} }}`)
    else if (existingStyle) parts.push(`style={${existingStyle}}`)

    out += `<${parts.join(" ")}${self ? " />" : ">"}`
    i = end + 1
  }

  // 닫는 태그
  out = out.replace(
    new RegExp(`</(${names})>`, "g"),
    (_m, t: string) => `</${TAG[t]}>`,
  )
  return { out }
}

for (const file of FILES) {
  const src = readFileSync(file, "utf8")
  const { out, skipped } = rewrite(src)
  if (skipped) {
    console.log(`⏭️  ${file} — ${skipped}`)
    continue
  }
  if (out === src) {
    console.log(`·  ${file} — 변화 없음`)
    continue
  }
  if (WRITE) {
    writeFileSync(file, out)
    console.log(`✅ ${file}`)
  } else {
    console.log(`🔍 ${file} — 변환 가능 (--write 로 적용)`)
  }
}
