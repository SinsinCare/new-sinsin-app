import fs from "node:fs"
import path from "node:path"

/**
 * t("key", { vars }) 가 문구의 {{자리표시자}} 를 전부 채우는지 원본에서 대조한다.
 * 2026-09-08 홈 약 타일에 "{{taken}}회 복용" 이 그대로 찍힌 사고의 재발 방지:
 * 문구는 {{taken}} 인데 호출은 { count } 만 넘겼다. 복수형(_one/_other) 키는 {{count}} 로 쓴다.
 */
const ROOT = path.resolve(__dirname, "..")
const LOCALE_DIR = path.join(ROOT, "src/i18n/locales/ko")
const SCAN_DIRS = [
  "src/features/medication",
  "src/features/home",
  "src/features/settings",
]

type Flat = Record<string, string>
const flatten = (o: unknown, prefix = "", out: Flat = {}): Flat => {
  if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o as Record<string, unknown>))
      flatten(v, prefix ? `${prefix}.${k}` : k, out)
  } else if (typeof o === "string") out[prefix] = o
  return out
}
const namespaces: Record<string, Flat> = Object.fromEntries(
  fs
    .readdirSync(LOCALE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [
      f.replace(/\.json$/u, ""),
      flatten(JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, f), "utf8"))),
    ]),
)

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* sourceFiles(p)
    else if (/\.tsx?$/u.test(entry.name)) yield p
  }
}

/** 문구(복수형 변형 포함)의 자리표시자 이름. */
function placeholders(ns: Flat, key: string): string[] | null {
  const values = [ns[key], ns[`${key}_one`], ns[`${key}_other`]].filter(
    (v): v is string => typeof v === "string",
  )
  if (!values.length) return null
  return [
    ...new Set(
      values.flatMap((v) =>
        [...v.matchAll(/\{\{\s*([\w.]+)\s*\}\}/gu)].map((m) => m[1]!),
      ),
    ),
  ]
}

/** `{ count: x, taken }` 같은 객체 리터럴에서 넘긴 이름. 중첩·스프레드가 섞이면 null(검사 생략). */
function passedNames(literal: string): string[] | null {
  if (/\.\.\.|\{[^}]*\{/u.test(literal)) return null
  return literal
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(":")[0]!.trim())
    .filter((name) => /^\w+$/u.test(name))
}

describe("i18n 자리표시자와 t() 인자", () => {
  const problems: string[] = []
  let checked = 0
  for (const dir of SCAN_DIRS) {
    for (const file of sourceFiles(path.join(ROOT, dir))) {
      const src = fs.readFileSync(file, "utf8")
      const fileNamespaces = [
        ...src.matchAll(/useTranslation\(\s*"(\w+)"/gu),
      ].map((m) => m[1]!)
      const candidates = fileNamespaces.length
        ? fileNamespaces
        : Object.keys(namespaces)
      for (const m of src.matchAll(/\bt\(\s*"([\w.]+)"\s*,\s*\{([^}]*)\}/gu)) {
        const [, key, literal] = m
        const names = passedNames(literal!)
        if (!names) continue
        for (const nsName of candidates) {
          const ns = namespaces[nsName]
          if (!ns) continue
          const wanted = placeholders(ns, key!)
          if (!wanted) continue
          checked += 1
          const missing = wanted.filter((p) => !names.includes(p))
          if (missing.length)
            problems.push(
              `${path.relative(ROOT, file)}: t("${key}") 에 ${missing.map((p) => `{{${p}}}`).join(", ")} 이 비었다 (넘긴 값: ${names.join(", ") || "없음"})`,
            )
        }
      }
    }
  }

  it("리터럴 호출은 문구의 자리표시자를 전부 채운다", () => {
    expect(problems).toEqual([])
  })

  it("검사가 헛돌지 않는다 — 실제 호출을 세었고, 대조군은 잡힌다", () => {
    expect(checked).toBeGreaterThan(20)
    expect(
      placeholders({ x_one: "{{taken}}회", x_other: "{{taken}}회" }, "x"),
    ).toEqual(["taken"])
    expect(passedNames(" count: day.taken ")).toEqual(["count"])
    expect(passedNames(" taken, planned: n ")).toEqual(["taken", "planned"])
    expect(passedNames(" ...rest ")).toBeNull()
  })

  it("복수형 키는 {{count}} 로 쓴다 — 다른 이름은 count 를 넘겨도 채워지지 않는다", () => {
    const wrong: string[] = []
    for (const [nsName, ns] of Object.entries(namespaces)) {
      for (const [key, value] of Object.entries(ns)) {
        if (!/_(one|other)$/u.test(key)) continue
        for (const p of [...value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/gu)].map(
          (x) => x[1]!,
        )) {
          if (p !== "count") wrong.push(`${nsName}:${key} → {{${p}}}`)
        }
      }
    }
    expect(wrong).toEqual([])
  })
})
