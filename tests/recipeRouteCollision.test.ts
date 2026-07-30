/**
 * 두 라우트 파일이 **같은 URL** 로 등록되는 것을 막는다.
 *
 * ## 실측된 결함
 *
 * `app/(write)/recipe/[id].tsx`(수정 스텁)와 `app/recipe/[id]/index.tsx`(v2 상세)가
 * 둘 다 `/recipe/{id}` 였다. Expo Router 는 `(write)` 같은 그룹 폴더를 **URL 에서
 * 지우기** 때문에 두 경로가 파일 트리에서는 전혀 달라 보이는데 URL 은 같다.
 *
 * 결과: 목록 카드를 눌렀을 때 상세가 아니라 수정 스텁("수정은 아직 안 돼요")이 열렸다.
 * 어느 쪽이 이기는지는 라우터의 해석 순서에 달려 있어서 **다음 버전에서 조용히 뒤집힐
 * 수 있다.**
 *
 * ## 왜 이 검사가 필요한가
 *
 * 두 파일 다 문법적으로 옳고 각자 잘 렌더된다. 충돌은 **파일 경로의 성질**이라
 * 컴포넌트 테스트로는 보이지 않고, tsc 도 잡지 않는다. 사람이 보기에도 그룹 폴더가
 * 사라진다는 것을 매번 머릿속에서 계산해야 한다.
 *
 * ## URL 이 같은 것 자체는 결함이 아니다
 *
 * Expo Router 는 같은 URL 을 여러 그룹이 나눠 갖는 것을 **지원한다**(shared routes).
 * 부를 때 `router.push("/(settings)")` 처럼 그룹을 명시하면 어느 화면인지 확정된다.
 * 실제로 `app/index.tsx`(진입 리다이렉트)와 `app/(settings)/index.tsx`(설정)가 둘 다
 * `/` 인데, 설정은 항상 `/(settings)` 로 불려서 모호하지 않다.
 *
 * 결함이 되는 조건은 **그룹을 명시하지 않고 부르는 것**이다. 레시피가 그랬다 —
 * 목록이 `router.push(`/recipe/${'${'}card.id}`)` 로 불렀고, 그 URL 에 두 화면이
 * 걸려 있어서 어느 쪽이 열리는지 라우터의 해석 순서에 달렸다.
 *
 * 그래서 이 검사는 "URL 이 같다" 가 아니라 **"URL 이 같은데 그룹 없이 부른다"** 를
 * 잡는다. 지원되는 패턴을 금지하면 사람이 검사를 지우고, 그러면 다음 충돌도 놓친다.
 */
import fs from "fs"
import path from "path"

const APP_DIR = path.join(__dirname, "..", "app")

/** 라우트가 아닌 파일. `_layout` 은 껍데기, `+` 로 시작하는 것은 라우터 특수 파일. */
function isRouteFile(name: string): boolean {
  if (!/\.(tsx|jsx|ts|js)$/u.test(name)) return false
  const base = name.replace(/\.(tsx|jsx|ts|js)$/u, "")
  if (base.startsWith("_")) return false
  if (base.startsWith("+")) return false
  return true
}

/**
 * 파일 경로를 URL 로 바꾼다. Expo Router 규칙 세 가지만 쓴다.
 *  - `(group)` 세그먼트는 URL 에 나타나지 않는다
 *  - `index` 는 부모 경로가 된다
 *  - `[id]` `[...rest]` 는 자리만 차지한다 — 이름이 달라도 **같은 자리면 충돌한다**.
 *    그래서 이름을 지우고 `[p]` / `[...p]` 로 정규화한다.
 */
function toUrl(relative: string): string {
  const withoutExt = relative.replace(/\.(tsx|jsx|ts|js)$/u, "")
  const segments = withoutExt
    .split(path.sep)
    .filter((segment) => !/^\(.*\)$/u.test(segment))
    .filter((segment) => segment !== "index")
    .map((segment) => {
      if (/^\[\.\.\..+\]$/u.test(segment)) return "[...p]"
      if (/^\[.+\]$/u.test(segment)) return "[p]"
      return segment
    })
  return "/" + segments.join("/")
}

function collectRoutes(dir: string, prefix = ""): { url: string; file: string }[] {
  const out: { url: string; file: string }[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix === "" ? entry.name : path.join(prefix, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectRoutes(path.join(dir, entry.name), relative))
    } else if (isRouteFile(entry.name)) {
      out.push({ url: toUrl(relative), file: relative })
    }
  }
  return out
}

/** 소스 트리의 모든 `.ts`/`.tsx` 를 훑는다. */
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue
      out.push(...sourceFiles(full))
    } else if (/\.(tsx|ts)$/u.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/**
 * 코드가 부르는 라우트 목표를 모은다. `router.push("/x")`, `router.replace(...)`,
 * `href="/x"`, 그리고 템플릿 리터럴(`` `/recipe/${id}` ``)까지.
 *
 * 템플릿의 `${...}` 는 동적 세그먼트 자리이므로 `[p]` 로 정규화해 라우트 URL 과 같은
 * 표현으로 만든다 — 그래야 `/recipe/${id}` 와 `/recipe/[p]` 가 같은 것으로 비교된다.
 */
function navigationTargets(): { target: string; file: string }[] {
  const pattern =
    /(?:router\.(?:push|replace|navigate)\(|href[=:]\s*)\{?\s*(["'`])(\/[^"'`]*)\1/gu
  const out: { target: string; file: string }[] = []
  for (const dir of [APP_DIR, path.join(__dirname, "..", "src")]) {
    for (const file of sourceFiles(dir)) {
      const text = fs.readFileSync(file, "utf8")
      for (const match of text.matchAll(pattern)) {
        const raw = match[2]
        if (raw === undefined) continue
        const normalized = raw
          .replaceAll(/\$\{[^}]*\}/gu, "[p]")
          .replace(/\?.*$/u, "")
          .replace(/\/$/u, "")
        out.push({ target: normalized === "" ? "/" : normalized, file })
      }
    }
  }
  return out
}

describe("라우트 URL 충돌", () => {
  const routes = collectRoutes(APP_DIR)

  it("라우트를 실제로 찾았다", () => {
    // 경로 규칙이 바뀌어 아무것도 못 찾으면 아래 검사가 조용히 통과한다.
    expect(routes.length).toBeGreaterThan(20)
  })

  it("네비게이션 호출을 실제로 찾았다", () => {
    // 정규식이 헛돌면 "그룹 없이 부르는 곳이 없다" 가 항상 참이 된다.
    expect(navigationTargets().length).toBeGreaterThan(30)
  })

  it("URL 이 겹치는 화면을 그룹 없이 부르는 곳이 없다", () => {
    const byUrl = new Map<string, string[]>()
    for (const { url, file } of routes) {
      byUrl.set(url, [...(byUrl.get(url) ?? []), file])
    }
    const collidingUrls = new Set(
      [...byUrl.entries()].filter(([, files]) => files.length > 1).map(([url]) => url),
    )

    // 그룹을 명시한 호출(`/(settings)/...`)은 모호하지 않으므로 제외한다.
    const ambiguous = navigationTargets()
      .filter(({ target }) => !target.includes("/("))
      .filter(({ target }) => collidingUrls.has(target))
      .map(
        ({ target, file }) =>
          `${path.relative(path.join(__dirname, ".."), file)} → ${target} ` +
          `(후보: ${byUrl.get(target)?.join(" / ") ?? "?"})`,
      )
    expect(ambiguous).toEqual([])
  })

  it("레시피 상세와 수정이 서로 다른 URL 이다", () => {
    // 실제로 겹쳤던 짝이라 이름을 박아 둔다. 위 일반 검사가 규칙 변경으로 헐거워져도
    // 이 짝만은 계속 지켜진다.
    const urlOf = (file: string): string | undefined =>
      routes.find((route) => route.file.split(path.sep).join("/") === file)?.url

    const detail = urlOf("recipe/[id]/index.tsx")
    const edit = urlOf("(write)/recipe/edit/[id].tsx")
    expect(detail).toBe("/recipe/[p]")
    expect(edit).toBe("/recipe/edit/[p]")
    expect(detail).not.toBe(edit)
  })
})
