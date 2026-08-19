/**
 * `isDark ? A : A` 처럼 **양쪽이 같아진 삼항식**을 접는다 (일회성 이행 도구).
 *
 * ## 왜 생기나
 *
 * tamagui 색 토큰을 v2 로 옮기면 스킴 분기가 저절로 사라진다:
 *
 *     isDarkMode ? "$appBgDark" : "$appBg"
 *       → isDarkMode ? colors.background.default : colors.background.default
 *
 * v2 토큰이 이미 스킴별 값을 들고 있기 때문이다. 남겨 두면 **읽는 사람이 "다크에서
 * 뭔가 다르구나" 라고 잘못 읽고**, `useAppColorScheme()` 도 쓰이지 않는데 계속 남는다.
 *
 *     npx tsx scripts/collapse-identical-ternary.ts <파일…>
 *     npx tsx scripts/collapse-identical-ternary.ts --write <파일…>
 */
import { readFileSync, writeFileSync } from "node:fs"

const WRITE = process.argv.includes("--write")
const FILES = process.argv.slice(2).filter((a) => !a.startsWith("--"))

/**
 * `cond ? A : B` 에서 A 와 B 가 **문자 그대로 같으면** A 로 접는다.
 *
 * 조건식에 물음표가 또 있거나(중첩 삼항) 괄호가 얽히면 건드리지 않는다 — 이 도구는
 * 자신 있는 것만 손대고 나머지는 사람에게 남긴다.
 */
function collapse(src: string): { out: string; count: number } {
  let count = 0
  // `? X : Y` 에서 X·Y 는 `colors.a.b` / `tokens.color.x.val` 같은 단순 경로만 본다.
  const re = /\?\s*((?:\w+\.)+\w+(?:\.val)?)\s*:\s*((?:\w+\.)+\w+(?:\.val)?)/g
  const out = src.replace(re, (whole, a: string, b: string) => {
    if (a !== b) return whole
    count++
    return `? ${a} : ${b}` === whole ? a : a
  })
  return { out, count }
}

/**
 * `cond ? A : A` 전체를 잡아 `A` 로 접는다.
 *
 * ## 정규식이 JSX 를 넘어가면 코드를 삼킨다 (2026-08-19 사고)
 *
 * 처음엔 조건식을 `[^?]+?` 로 느슨하게 잡았다. 그러면 `?` 가 나올 때까지 **줄바꿈도
 * 태그도 넘어서** 훑기 때문에 이런 게 통째로 조건식이 된다:
 *
 *     '</V2Text>\n<V2Text color={isDarkMode ? colors.label.normal : colors.label.normal'
 *      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 여기까지 삼켜서 닫는 태그가 사라졌다
 *
 * 그래서 조건식을 **한 줄 · 중괄호 밖으로 나가지 않는 범위**로 묶는다:
 *   - 줄바꿈 금지 (`[^\n?{}<>]`)
 *   - `<` `>` 금지 → JSX 태그 경계를 넘지 못한다
 *   - `{` `}` 금지 → 표현식 블록을 벗어나지 못한다
 *
 * 이 제약 때문에 `a.b === "x" ? …` 같은 흔한 형태는 잡히고, 여러 줄에 걸친 복잡한
 * 조건은 **일부러 놓친다**. 놓치는 쪽이 삼키는 쪽보다 안전하다.
 */
function collapseWhole(src: string): { out: string; count: number } {
  let count = 0
  const re =
    /(?:[A-Za-z_$][\w$.]*(?:\s*(?:===|!==|==|!=)\s*[^\n?{}<>]+?)?)\s*\?\s*((?:\w+\.)+\w+(?:\.val)?)\s*:\s*((?:\w+\.)+\w+(?:\.val)?)/g
  const out = src.replace(re, (whole, a: string, b: string) => {
    if (a !== b) return whole
    count++
    return a
  })
  return { out, count }
}

for (const file of FILES) {
  const src = readFileSync(file, "utf8")
  const { out, count } = collapseWhole(src)
  if (!count) {
    console.log(`·  ${file} — 접을 것 없음`)
    continue
  }
  if (WRITE) {
    writeFileSync(file, out)
    console.log(`✅ ${file} — ${count}곳 접음`)
  } else {
    console.log(`🔍 ${file} — ${count}곳 접을 수 있음`)
  }
}

export { collapse, collapseWhole }
