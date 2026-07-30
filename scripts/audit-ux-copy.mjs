import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import ts from "typescript"

const PROJECT_ROOT = process.cwd()
const SOURCE_ROOTS = ["app", "src"]
const USER_COPY_JSON_FILES = [
  "app.json",
  "src/i18n/locales/ko/common.json",
  "src/features/restaurant/data/restaurantsData.json",
]
const KOREAN_PATTERN = /[가-힣]/
const SOURCE_PATTERN = /\.(?:ts|tsx)$/
const SKIP_PARTS = new Set([
  "node_modules",
  ".expo",
  "dist",
  "coverage",
  "_workspace",
])

const RULES = [
  {
    id: "NAV-001",
    severity: "S1",
    label: "막힌 에러",
    pattern:
      /오류가 발생|에러가 발생|문제가 발생|알 수 없는 오류|처리 중 오류|실패했습니다(?:\.|$)/,
    reason: "상황만 말하고 사용자가 이어서 할 행동을 알려주지 않아요.",
  },
  {
    id: "NAV-002",
    severity: "S2",
    label: "해결책 없는 재시도",
    pattern: /다시 시도(?:해 ?주세요|하세요|해보세요)/,
    shouldReport: (text, match) => {
      const context = text.slice(0, match.index)
      return !/(확인(?:한|해 본|하고|하세요)|잠시 후|잠깐 뒤|몇 분 뒤|나중에|계속되면)/.test(
        context,
      )
    },
    reason:
      "재시도가 실제 해결책인지, 언제 다시 해야 하는지 함께 확인해야 해요.",
  },
  {
    id: "USER-001",
    severity: "S1",
    label: "구현 언어 노출",
    pattern:
      /(?:서버|API|엔드포인트|토큰|HTTP|네트워크 오류|데이터 처리|시스템 오류|요청 처리|프로덕션|production)/i,
    reason: "사용자가 이해할 수 있는 현재 상황과 해결 행동으로 바꿔야 해요.",
  },
  {
    id: "USER-002",
    severity: "S2",
    label: "처리 결과 중심",
    pattern:
      /성공적으로|처리되었습니다|처리가 완료|요청되었습니다|등록되었습니다|저장되었습니다|삭제되었습니다|전송되었습니다/,
    reason:
      "서비스가 한 일을 보고하기보다 사용자가 얻은 결과를 말하는 편이 자연스러워요.",
  },
  {
    id: "MED-001",
    severity: "S1",
    label: "의료 상한·목표 혼동",
    pattern:
      /권장량까지 .{0,20}남았|(?:단백질|CKD).{0,45}(?:0\.8g\/?kg|체중 1kg당 0\.8g).{0,30}(?:기준|권장|조절)|체중 1kg당 0\.8g 기준/,
    reason:
      "섭취 상한을 채워야 할 목표처럼 읽히지 않는지 의료 기준과 변수 의미를 확인해야 해요.",
  },
  {
    id: "MED-002",
    severity: "S1",
    label: "고정 수치의 개인 처방화",
    pattern:
      /하루 (?:나트륨|소금|수분|단백질)(?: 섭취)?(?:량)?(?:은|을| 목표는| 기준은)?.{0,25}(?:\d[\d,.]*(?:mg|ml|g)|소변량).{0,20}(?:이하|이내|제한|권장|목표|기준)|하루 권장 .{0,20}ml까지/,
    reason:
      "건강 수치를 개인 목표처럼 말하려면 신장 단계·투석 여부·검사 결과·의료진 목표가 반영됐는지 확인해야 해요.",
  },
  {
    id: "MED-003",
    severity: "S1",
    label: "의료 책임 분할·서비스 생색",
    pattern:
      /(?:판단|해석).{0,20}(?:의료진|의사).{0,12}(?:몫|일)|(?:의료진|의사).{0,12}(?:몫|일)|알리는 것.{0,12}(?:우리|저희).{0,8}몫|(?:우리|저희|앱|서비스|신신당부).{0,24}(?:의료진|병원).{0,16}(?:알리|알렸|연락|전화|전달)/,
    reason:
      "의료진과 서비스의 책임을 나누거나 실제 수행하지 않는 연락을 서비스 성과처럼 말하지 않아요. 사용자가 할 행동과 확인 시점만 씁니다.",
  },
  {
    id: "MED-004",
    severity: "S1",
    label: "근거 없는 의료 허용·안전 단정",
    pattern:
      /(?:먹어도|드셔도|섭취해도|식사|식단|메뉴|음식|영양|건강).{0,25}(?:안전(?:해요|합니다|한)|괜찮(?:아요|습니다)|문제없(?:어요|습니다)|무리 없(?:는|어요|습니다)|적합(?:해요|합니다))/,
    reason:
      "식사나 건강 상태를 허용·안전으로 단정하지 말고, 실제 기록과 개인 참고 기준의 관계만 말해요.",
  },
  {
    id: "OPS-001",
    severity: "S1",
    label: "검증되지 않은 후속 동작 약속",
    pattern:
      /(?:결과|알림|의료진|병원).{0,24}(?:알려 ?드릴게요|보여 ?드릴게요|연락해 ?드릴게요|전달해 ?드릴게요)/,
    reason:
      "알림·연락·결과 제공은 실패 경로까지 구현과 검증이 있을 때만 약속하고, 아니면 확인 방법을 안내해요.",
  },
  {
    id: "TRUST-001",
    severity: "S1",
    label: "검증 필요한 절대 보장",
    pattern:
      /(?:인증|개인|건강|검사|데이터|정보).{0,40}(?:암호화|안전하게 보호|보관하지 않|저장하지 않|저장되지 않)|보건복지부.{0,20}가이드라인|모든 (?:영양|의료).{0,30}공인|공인 식품 영양자료|새(?:로운)? 자료.{0,30}반영/,
    reason:
      "보안·규제·근거·갱신을 보장하는 문구는 구현 기록이나 책임자 확인 없이는 화면에 내보내면 안 돼요.",
  },
  {
    id: "KR-001",
    severity: "S1",
    label: "번역투",
    pattern: /에 있어서|되어진|보여질|가지고 있|을 통하여|를 통하여/,
    reason: "영어식 피동·명사 구문을 자연스러운 한국어 동사로 바꿔야 해요.",
  },
  {
    id: "KR-002",
    severity: "S2",
    label: "피동·명사화",
    pattern:
      /진행됩니다|제공됩니다|수행됩니다|분석됩니다|처리됩니다|완료됩니다|확인됩니다/,
    reason:
      "서비스 관점의 피동형보다 사용자가 하는 행동이나 얻는 결과를 직접 말해요.",
  },
  {
    id: "KR-003",
    severity: "S2",
    label: "과한 격식",
    pattern:
      /하시기 바랍니다|해주시기 바랍니다|하여 주세요|입력하여|선택하여|확인하여/,
    reason: "앱의 해요체와 맞는 짧고 익숙한 표현으로 다듬어야 해요.",
  },
  {
    id: "KR-004",
    severity: "S2",
    label: "보조 용언 붙여쓰기",
    pattern: /해주세요|주시겠어요|해주시기|해주시면/,
    reason: "‘-아/어 주다’는 띄어 써서 화면 전체 표기를 맞춰야 해요.",
  },
]

function parseArgs(argv) {
  const args = { writeRun: null, format: "text" }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--json") {
      args.format = "json"
    } else if (arg === "--write-run") {
      args.writeRun = argv[index + 1]
      index += 1
    } else if (arg === "--help") {
      args.help = true
    } else {
      throw new Error(`알 수 없는 옵션: ${arg}`)
    }
  }

  return args
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP_PARTS.has(entry.name)) return []

    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolutePath)
    if (!SOURCE_PATTERN.test(entry.name)) return []
    return [absolutePath]
  })
}

function getCallName(node, sourceFile) {
  let current = node
  while (current && current !== sourceFile) {
    if (ts.isCallExpression(current)) {
      return current.expression.getText(sourceFile)
    }
    if (ts.isNewExpression(current)) {
      return `new ${current.expression.getText(sourceFile)}`
    }
    current = current.parent
  }
  return ""
}

function getPropertyName(node, sourceFile) {
  let current = node
  while (current && current !== sourceFile) {
    if (
      ts.isPropertyAssignment(current) ||
      ts.isPropertyDeclaration(current) ||
      ts.isJsxAttribute(current)
    ) {
      return current.name.getText(sourceFile)
    }
    current = current.parent
  }
  return ""
}

function classifySurface(callName, propertyName) {
  const internalCallPattern =
    /^(?:console\.|logger\.|analytics\.|track|capture|Sentry\.|devLog|debugLog)/
  const internalPropertyPattern =
    /^(?:debug|debugMessage|log|logMessage|eventName|analyticsName)$/

  if (
    internalCallPattern.test(callName) ||
    internalPropertyPattern.test(propertyName)
  ) {
    return "internal"
  }

  if (/^(?:new Error|Error)$/.test(callName)) return "boundary"
  return "user"
}

function getNodeText(node, sourceFile) {
  if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) return node.text
  if (ts.isTemplateExpression(node))
    return node.getText(sourceFile).slice(1, -1)
  return ""
}

function isCopyNode(node) {
  if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) return true
  return ts.isTemplateExpression(node)
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim()
}

function extractCopy(filePath) {
  const source = fs.readFileSync(filePath, "utf8")
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  )
  const relativeFile = path.relative(PROJECT_ROOT, filePath)
  const copies = []
  let ordinal = 0

  function visit(node) {
    if (isCopyNode(node)) {
      const text = normalizeText(getNodeText(node, sourceFile))
      if (KOREAN_PATTERN.test(text)) {
        const location = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        )
        const callName = getCallName(node, sourceFile)
        const propertyName = getPropertyName(node, sourceFile)
        ordinal += 1
        copies.push({
          id: `${relativeFile}#${ordinal}`,
          file: relativeFile,
          line: location.line + 1,
          column: location.character + 1,
          kind: ts.SyntaxKind[node.kind],
          callName,
          propertyName,
          surface: classifySurface(callName, propertyName),
          text,
        })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return copies
}

function extractJsonCopy(relativeFile) {
  const filePath = path.join(PROJECT_ROOT, relativeFile)
  if (!fs.existsSync(filePath)) return []

  const source = fs.readFileSync(filePath, "utf8")
  const data = JSON.parse(source)
  const copies = []
  let searchOffset = 0

  function visit(value, jsonPath) {
    if (typeof value === "string" && KOREAN_PATTERN.test(value)) {
      const text = normalizeText(value)
      const encoded = JSON.stringify(value)
      const position = source.indexOf(encoded, searchOffset)
      if (position >= 0) searchOffset = position + encoded.length
      const prefix = position >= 0 ? source.slice(0, position) : ""
      const line = prefix ? prefix.split(/\r\n|\r|\n/).length : 1

      copies.push({
        id: `${relativeFile}#${jsonPath}`,
        file: relativeFile,
        line,
        column: 1,
        kind: "JsonString",
        callName: "",
        propertyName: jsonPath.split(".").at(-1) ?? "",
        surface: "user",
        text,
      })
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${jsonPath}[${index}]`))
      return
    }

    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        visit(item, jsonPath ? `${jsonPath}.${key}` : key)
      }
    }
  }

  visit(data, "")
  return copies
}

function detectFindings(copies) {
  const findings = []

  for (const copy of copies) {
    if (copy.surface === "internal") continue
    if (/legal-document\.tsx$/.test(copy.file)) continue

    for (const rule of RULES) {
      const match = copy.text.match(rule.pattern)
      if (!match) continue
      if (rule.shouldReport && !rule.shouldReport(copy.text, match)) continue
      findings.push({
        id: `f${String(findings.length + 1).padStart(4, "0")}`,
        ruleId: rule.id,
        severity: rule.severity,
        categoryLabel: rule.label,
        scope: "span",
        textSpan: match[0],
        source: {
          copyId: copy.id,
          file: copy.file,
          line: copy.line,
          column: copy.column,
          surface: copy.surface,
        },
        fullText: copy.text,
        reason: rule.reason,
      })
    }
  }

  return findings
}

function buildReport(copies, findings) {
  const bySeverity = Object.fromEntries(
    ["S1", "S2", "S3"].map((severity) => [
      severity,
      findings.filter((finding) => finding.severity === severity).length,
    ]),
  )
  const byRule = {}
  for (const finding of findings) {
    byRule[finding.ruleId] = (byRule[finding.ruleId] ?? 0) + 1
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      projectRoot: PROJECT_ROOT,
      sourceRoots: SOURCE_ROOTS,
      jsonFiles: USER_COPY_JSON_FILES,
      fileCount: new Set(copies.map((copy) => copy.file)).size,
      copyCount: copies.length,
      userCopyCount: copies.filter((copy) => copy.surface === "user").length,
      boundaryCopyCount: copies.filter((copy) => copy.surface === "boundary")
        .length,
      internalCopyCount: copies.filter((copy) => copy.surface === "internal")
        .length,
      detectedCount: findings.length,
      bySeverity,
      byRule,
    },
    findings,
  }
}

function writeRunArtifacts(runDirectory, copies, report) {
  const absoluteRunDirectory = path.resolve(PROJECT_ROOT, runDirectory)
  fs.mkdirSync(absoluteRunDirectory, { recursive: true })

  const inputText = copies
    .filter((copy) => copy.surface !== "internal")
    .map((copy) => `[${copy.file}:${copy.line}] ${copy.text}`)
    .join("\n")

  fs.writeFileSync(
    path.join(absoluteRunDirectory, "01_input.txt"),
    `${inputText}\n`,
  )
  fs.writeFileSync(
    path.join(absoluteRunDirectory, "01_inventory.json"),
    `${JSON.stringify(copies, null, 2)}\n`,
  )
  fs.writeFileSync(
    path.join(absoluteRunDirectory, "02_detection.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  )
}

function printHelp() {
  process.stdout.write(`사용법:
  node scripts/audit-ux-copy.mjs
  node scripts/audit-ux-copy.mjs --json
  node scripts/audit-ux-copy.mjs --write-run _workspace/YYYY-MM-DD-NNN
`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const files = SOURCE_ROOTS.flatMap((root) =>
    walk(path.join(PROJECT_ROOT, root)),
  ).sort()
  const copies = [
    ...files.flatMap(extractCopy),
    ...USER_COPY_JSON_FILES.flatMap(extractJsonCopy),
  ]
  const findings = detectFindings(copies)
  const report = buildReport(copies, findings)

  if (args.writeRun) writeRunArtifacts(args.writeRun, copies, report)

  if (args.format === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    return
  }

  process.stdout.write(
    [
      `한국어 문구 ${report.meta.copyCount}개 (${report.meta.fileCount}개 파일)`,
      `사용자 노출 후보 ${report.meta.userCopyCount}개`,
      `경계 에러 ${report.meta.boundaryCopyCount}개`,
      `내부 로그 ${report.meta.internalCopyCount}개`,
      `교정 후보 ${report.meta.detectedCount}개 (S1 ${report.meta.bySeverity.S1}, S2 ${report.meta.bySeverity.S2})`,
      "",
    ].join("\n"),
  )

  for (const finding of findings) {
    process.stdout.write(
      `${finding.severity} ${finding.ruleId} ${finding.source.file}:${finding.source.line} ${finding.fullText}\n`,
    )
  }
}

main()
