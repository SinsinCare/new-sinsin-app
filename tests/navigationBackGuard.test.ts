/**
 * expo-router 의 **맨 `back()`** 이 다시 들어오는 것을 막는다.
 *
 * ## 실측된 결함
 *
 * `router.back()` 은 직전 화면이 없으면 아무 일도 하지 않는다. 푸시 알림·딥링크·
 * dev 리로드로 들어오면 스택 깊이가 1 이라 항상 그 상태다. dev 에서는
 * `The action 'GO_BACK' was not handled by any navigator` 경고가 뜨고, prod 에서는
 * **아무 반응 없는 뒤로가기 버튼**만 남는다 — 사용자는 앱을 껐다 켜는 것 말고는
 * 그 화면에서 나갈 수 없다.
 *
 * 정리 전에는 80곳 중 10곳만 `canGoBack()` 으로 감싸여 있었다. 나머지 70곳은
 * "여기는 항상 스택이 있겠지" 라는 **가정**이었고, 그 가정은 딥링크가 생길 때마다
 * 조용히 깨진다.
 *
 * ## 왜 tsc·eslint 가 못 잡는가
 *
 * `router.back()` 은 완벽하게 올바른 코드다. 틀린 것은 타입이 아니라 **그 화면이
 * 어떻게 진입되는가에 대한 가정**이라, 타입 검사도 린트 규칙도 볼 수 없다. 그래서
 * 소스를 직접 훑는다.
 *
 * ## 무엇을 금지하는가
 *
 * `useAppRouter()` / `useGoBack()` 을 쓰면 `back()` 이 히스토리 없을 때
 * 라우트 그래프로 떨어진다. 그러므로 금지 대상은
 *  - `expo-router` 에서 직접 가져온 `router` / `useRouter` 로 부르는 `.back()`
 *  - 손으로 다시 만든 `canGoBack() ? back() : replace(...)` 분기
 * 두 가지다. 후자를 함께 막는 이유는, 그것이 **폴백 목적지를 표 바깥에 한 벌 더**
 * 두는 일이라 시간이 지나면 표와 어긋나기 때문이다.
 */
import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..")
const SCAN_DIRS = ["app", "src"]

/**
 * 예외. 새로 추가할 때는 **왜 안전한지**를 여기 적는다.
 *
 * `src/shared/navigation/**` — 안전한 뒤로가기를 구현하는 곳이다. 여기서는
 * 맨 `back()` 과 `canGoBack()` 을 쓸 수밖에 없다.
 */
const ALLOWED = [path.join("src", "shared", "navigation")]

function isSource(name: string): boolean {
  return /\.(ts|tsx)$/u.test(name) && !name.endsWith(".d.ts")
}

function collect(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue
      collect(full, out)
    } else if (isSource(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function isAllowed(relative: string): boolean {
  return ALLOWED.some((prefix) => relative.startsWith(prefix))
}

/** 주석은 검사에서 뺀다 — 머리말이 `router.back()` 을 **설명**하기 때문이다. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

const files = SCAN_DIRS.flatMap((dir) => collect(path.join(ROOT, dir))).map(
  (file) => path.relative(ROOT, file),
)

function offenders(pattern: RegExp): string[] {
  const found: string[] = []
  for (const relative of files) {
    if (isAllowed(relative)) continue
    const source = stripComments(
      fs.readFileSync(path.join(ROOT, relative), "utf8"),
    )
    const lines = source.split("\n")
    lines.forEach((line, index) => {
      if (pattern.test(line))
        found.push(`${relative}:${index + 1} ${line.trim()}`)
    })
  }
  return found
}

describe("back navigation guard", () => {
  it("scans the app at all (검사 자체가 비어 있지 않은지)", () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it("has nobody calling the raw router.back()", () => {
    // `useAppRouter()` 를 통해 얻은 `router.back()` 은 안전하지만, 이 검사는
    // 어느 쪽인지 구분할 수 없다. 그래서 아래의 import 검사와 짝을 이룬다 —
    // expo-router 의 `useRouter`/`router` 를 못 쓰면 `router.back()` 은 안전하다.
    expect(offenders(/\bcanGoBack\s*\(/u)).toEqual([])
  })

  it("has nobody importing expo-router's router directly", () => {
    const bad: string[] = []
    for (const relative of files) {
      if (isAllowed(relative)) continue
      const source = stripComments(
        fs.readFileSync(path.join(ROOT, relative), "utf8"),
      )
      const imports = source.matchAll(
        /import\s*\{([^}]*)\}\s*from\s*"expo-router"/gu,
      )
      for (const match of imports) {
        const names = match[1].split(",").map((name) => name.trim())
        // `useRouter` 는 `useAppRouter` 로, 싱글턴 `router` 는 push/replace 전용이다.
        // 뒤로가기를 부르지 않는 한 싱글턴 자체는 문제가 아니므로 `useRouter` 만 막는다.
        if (names.includes("useRouter")) bad.push(relative)
      }
    }
    // 루트 레이아웃은 네비게이터 **바깥**이라 `useAppRouter` 를 쓸 수 없다
    // (`useAppRouter` 머리말 참고). 뒤로가기를 부르지 않으므로 안전하다.
    expect(bad.filter((f) => f !== path.join("app", "_layout.tsx"))).toEqual([])
  })

  it("has nobody calling .back() on the expo-router singleton", () => {
    const bad: string[] = []
    for (const relative of files) {
      if (isAllowed(relative)) continue
      const source = stripComments(
        fs.readFileSync(path.join(ROOT, relative), "utf8"),
      )
      const importsSingleton =
        /import\s*\{[^}]*\brouter\b[^}]*\}\s*from\s*"expo-router"/u.test(source)
      if (!importsSingleton) continue
      if (/\brouter\.back\s*\(/u.test(source)) bad.push(relative)
    }
    expect(bad).toEqual([])
  })
})
