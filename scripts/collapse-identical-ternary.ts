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
 * 접고 나면 `cond ?` 앞의 조건식이 통째로 남는다:
 *
 *     backgroundColor: isDarkMode colors.background.default
 *
 * 이걸 정리하려면 조건식의 시작을 알아야 하는데, 그건 문맥마다 달라 안전하지 않다.
 * 그래서 **삼항 전체**를 잡는다 — `식별자 ? X : X` 형태만.
 */
function collapseWhole(src: string): { out: string; count: number } {
  let count = 0
  const re =
    /(?:[A-Za-z_$][\w$]*(?:\s*(?:===|!==|==|!=|>|<|>=|<=)\s*[^?]+?)?)\s*\?\s*((?:\w+\.)+\w+(?:\.val)?)\s*:\s*((?:\w+\.)+\w+(?:\.val)?)/g
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
