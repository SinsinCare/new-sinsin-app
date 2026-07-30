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
  if (!UI_ONLY) return true
  if (!file.endsWith(".tsx")) return false
  return path.relative(ROOT, file) !== "app/v2-showcase.tsx"
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
    `${UI_ONLY ? "Production UI" : "All source"} Korean candidates: ${findings.length}`,
  )
  for (const row of summary)
    console.log(`${String(row.count).padStart(4)}  ${row.file}`)
}

if (process.argv.includes("--fail-on-findings") && findings.length > 0) {
  process.exitCode = 1
}
