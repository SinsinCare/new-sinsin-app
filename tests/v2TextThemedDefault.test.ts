import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * V2Text 의 기본 글자색은 테마의 본문색(label.normal)이다 — RN 기본값(검정)이 아니다.
 *
 * ## 실측 사고 (2026-09-08, 상담 기록 목록)
 * 제목 `<V2Text token="subtext.largeStrong">` 에 color 가 없어 다크에서 검은 바탕 위
 * 검은 글자(대비 1.1:1)로 찍혔다. 499 곳 중 16 곳이 color 없이 쓰이고 있었고,
 * 그 16 곳을 하나씩 고치는 대신 뿌리(V2Text)에서 테마색을 기본값으로 둔다.
 *
 * 규칙: 색은 prop > style > 테마 순. 명시한 색은 그대로, 아무도 안 주면 label.normal.
 */
const ROOT = join(__dirname, "..")
const SOURCE = readFileSync(
  join(ROOT, "src/design-system-v2/components/V2Text.tsx"),
  "utf-8",
)

describe("V2Text 기본 글자색", () => {
  it("테마 훅을 읽고, color/style 이 색을 안 주면 label.normal 을 쓴다", () => {
    expect(SOURCE).toMatch(/useV2Theme\(\)/u)
    expect(SOURCE).toMatch(
      /color === undefined && flat\?\.color === undefined\s*\?\s*\{ color: colors\.label\.normal \}/u,
    )
  })

  it("명시한 색이 테마 기본값을 이긴다 — style 배열에서 themed 가 color prop 앞에 온다", () => {
    const order = SOURCE.match(
      /style=\{\[resolved, themed, color !== undefined && \{ color \}\]\}/u,
    )
    expect(order).not.toBeNull()
  })

  it("V2Text 를 다른 V2Text 안에 색 없이 중첩하지 않는다 — 기본색이 부모색을 덮는다", () => {
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name.startsWith(".")) continue
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p)
        else if (p.endsWith(".tsx") && !p.endsWith("V2Text.tsx")) {
          const source = readFileSync(p, "utf-8")
            .replace(/\/\*[\s\S]*?\*\//gu, "")
            .replace(/^\s*\/\/.*$/gmu, "")
          let depth = 0
          const re = /<V2Text\b[^>]*?(\/?)>|<\/V2Text>/gsu
          let m: RegExpExecArray | null
          while ((m = re.exec(source))) {
            if (m[0].startsWith("</")) {
              depth = Math.max(0, depth - 1)
              continue
            }
            if (m[1] === "/") continue
            if (depth > 0 && !/\bcolor=/u.test(m[0])) {
              const line = source.slice(0, m.index).split("\n").length
              offenders.push(`${p.replace(`${ROOT}/`, "")}:${line}`)
            }
            depth += 1
          }
        }
      }
    }
    walk(join(ROOT, "src"))
    walk(join(ROOT, "app"))
    expect(offenders).toEqual([])
  })
})
