import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import ts from "typescript"

const ROOT = process.cwd()
const KOREAN = /[가-힣]/
const SKIP = new Set([
  "node_modules",
  ".expo",
  "dist",
  "coverage",
  "_workspace",
])
const UI_ONLY = process.argv.includes("--ui-only")

/**
 * 게이트로 쓸 구역.
 *
 * `--fail-on-findings` 를 저장소 전체에 걸면 오늘 당장 빨갛다(홈 분석 결과 화면만
 * 14건). 빨간 게이트는 끄는 게이트라서, **정리가 끝난 구역만** 이름을 붙여 잠근다.
 * 나머지는 여전히 `npm run audit:i18n-ui` 로 세기만 한다 — 구역이 비는 대로 여기
 * 한 줄씩 늘린다(eslint 의 "디자인 계보 래칫" 과 같은 방식이다).
 */
const SCOPES = {
  /**
   * 커뮤니티가 실제로 그리는 화면 전부.
   *
   * `RecipeEditor.tsx` 하나만 뺀다 — v1 에디터이고 **어디서도 import 되지 않는다**
   * (`tests/analyticsCrossCutting.test.ts` 의 "recipe_edit 를 주는 v1 에디터는
   * 어디서도 마운트되지 않는다" 가 그 사실을 못 박고 있다). 죽은 파일의 한국어
   * 리터럴 7개 때문에 살아 있는 화면의 게이트를 못 세우는 쪽이 더 나쁘다.
   * 그 파일이 지워지거나 되살아나면 위 테스트가 먼저 깨진다.
   */
  community: {
    include: [
      "app/post/",
      "app/community-library.tsx",
      "app/stories.tsx",
      "app/(tabs)/community.tsx",
      "app/(write)/free/",
      "app/(write)/story/",
      "src/features/recipe/components/",
      "src/features/recipe/views/",
    ],
    exclude: ["src/features/recipe/components/RecipeEditor.tsx"],
  },
}

const scopeArg = process.argv.find((argument) =>
  argument.startsWith("--scope="),
)
const scopeName = scopeArg ? scopeArg.slice("--scope=".length) : null
if (scopeName && !SCOPES[scopeName]) {
  console.error(
    `알 수 없는 구역: ${scopeName} (가능한 값: ${Object.keys(SCOPES).join(", ")})`,
  )
  process.exit(2)
}
const SCOPE = scopeName ? SCOPES[scopeName] : null

function inScope(relativePath) {
  if (!SCOPE) return true
  if (SCOPE.exclude.some((prefix) => relativePath.startsWith(prefix))) {
    return false
  }
  return SCOPE.include.some((prefix) => relativePath.startsWith(prefix))
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return []
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(file)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [file] : []
  })
}

function isNonUiLiteral(node) {
  const parent = node.parent
  return (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isLiteralTypeNode(parent) ||
    (ts.isCallExpression(parent) &&
      /^(?:console\.|logger\.|track|capture|Sentry\.)/.test(
        parent.expression.getText(),
      )) ||
    (ts.isNewExpression(parent) && parent.expression.getText() === "Error")
  )
}

function isTemplateText(node) {
  return (
    node.kind === ts.SyntaxKind.TemplateHead ||
    node.kind === ts.SyntaxKind.TemplateMiddle ||
    node.kind === ts.SyntaxKind.TemplateTail
  )
}

const sourceFiles = [
  ...walk(path.join(ROOT, "app")),
  ...walk(path.join(ROOT, "src")),
].filter((file) => {
  const relative = path.relative(ROOT, file)
  if (!inScope(relative)) return false
  if (!UI_ONLY) return true
  if (!file.endsWith(".tsx")) return false
  return relative !== "app/v2-showcase.tsx"
})

const findings = []
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8")
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  function visit(node) {
    if (
      (ts.isStringLiteralLike(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        isTemplateText(node) ||
        ts.isJsxText(node)) &&
      KOREAN.test(node.text) &&
      !isNonUiLiteral(node)
    ) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart())
      findings.push({
        file: path.relative(ROOT, file),
        line: position.line + 1,
        text: node.text.replace(/\s+/g, " ").trim(),
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
}

const grouped = new Map()
for (const finding of findings) {
  const rows = grouped.get(finding.file) ?? []
  rows.push(finding)
  grouped.set(finding.file, rows)
}
const summary = [...grouped.entries()]
  .map(([file, rows]) => ({ file, count: rows.length }))
  .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))

if (process.argv.includes("--json")) {
  process.stdout.write(
    `${JSON.stringify(
      {
        mode: UI_ONLY ? "production-ui" : "all-source-candidates",
        count: findings.length,
        summary,
        findings,
      },
      null,
      2,
    )}\n`,
  )
} else {
  console.log(
    `${UI_ONLY ? "Production UI" : "All source"} Korean candidates${
      scopeName ? ` (${scopeName})` : ""
    }: ${findings.length}`,
  )
  for (const row of summary)
    console.log(`${String(row.count).padStart(4)}  ${row.file}`)
}

if (process.argv.includes("--fail-on-findings") && findings.length > 0) {
  process.exitCode = 1
}
