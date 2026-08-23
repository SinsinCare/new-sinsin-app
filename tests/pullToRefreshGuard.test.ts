/**
 * **당겨서 새로고침이 다시 죽는 것**을 막는다.
 *
 * ## 실측된 결함
 *
 * 커뮤니티 피드(`FreePostTab`)와 내 활동(`community-library`)은 `RefreshControl` 을
 * 정상적으로 달아 놓고, 같은 스크롤 컨테이너에 `bounces={false}` 를 함께 줬다.
 * iOS 의 `UIRefreshControl` 은 스크롤뷰가 맨 위에서 **더 당겨질 수 있을 때만**
 * 발동하므로, 컨트롤은 렌더되지만 `onRefresh` 가 **한 번도 불리지 않는다.**
 * 사용자에게는 앱을 껐다 켜는 것 말고 새로 받을 방법이 없었다.
 *
 * ## 왜 tsc 가 못 잡는가
 *
 * 두 prop 다 완벽하게 올바른 타입이다. 틀린 것은 **둘의 조합**이고, 그 조합이
 * 왜 틀렸는지는 UIKit 의 동작이라 타입 시스템 밖에 있다. 게다가 안드로이드는
 * `SwipeRefreshLayout` 이 부모라 멀쩡히 동작한다 — **한 플랫폼에서만 죽으므로**
 * 손으로 확인하는 QA 도 절반은 통과시킨다.
 *
 * ## eslint 가 이미 잡는데 왜 테스트도 두는가
 *
 * `eslint.config.js` 의 `no-restricted-syntax` 가 같은 것을 잡는다. 그런데 그 규칙은
 * JSX 안에 **리터럴 `false`** 가 있을 때만 본다 — `bounces={hideBounce}` 처럼
 * 변수를 거치면 통과한다. 여기서는 소스를 그대로 훑어 그 우회까지 본다.
 *
 * ## 두 번째 검사: 스코프를 지나가는가
 *
 * 커뮤니티·레시피의 스크롤 화면은 전부 `src/shared/refresh` 의 `useRefreshable` 이
 * 주는 `scrollProps` 를 통째로 펼쳐야 한다. 손으로 `RefreshControl` 을 다시 쓰면
 * (a) bounces 를 또 갈라 놓을 수 있고 (b) 화면의 다른 쿼리가 새로고침에서 빠진다 —
 * 스토리 레일이 당겨도 어제 것으로 남아 있던 그 결함이다.
 */
import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..")
const SCAN_DIRS = ["app", "src"]

/**
 * 예외. 새로 추가할 때는 **왜 안전한지**를 여기 적는다.
 *
 * `src/shared/refresh/**` — `RefreshControl` 을 만드는 곳이다. 여기 한 벌만 있다.
 */
const RAW_CONTROL_ALLOWED = [path.join("src", "shared", "refresh")]

/**
 * 훅을 지나지 않는 **유일한** 화면. 여기 남은 이유는 스코프 의미가 다르기 때문이다 —
 * `useRefreshable` 은 `type: "active"` 로만 다시 받는데, 이 화면의 `["diaryExistence"]`
 * 는 달력 점을 그리는 쿼리라 관찰자가 없는 순간에도 다시 받아야 한다. 그대로 옮기면
 * "새로고침했는데 달력만 어제 상태" 가 생긴다.
 */
const HAND_ROLLED_CONTROL = path.join(
  "src",
  "features",
  "home",
  "components",
  "record",
  "RecordView.tsx",
)

/**
 * `useRefreshable` 을 반드시 지나야 하는 화면들.
 *
 * 목록으로 두는 이유: "이 화면에 당김이 있어야 한다" 는 **제품 결정**이라 코드에서
 * 유도할 수 없다. 새 화면을 여기 더하는 것이 곧 그 결정을 적어 두는 일이다.
 */
const MUST_BE_REFRESHABLE = [
  path.join("src", "features", "recipe", "components", "FreePostTab.tsx"),
  path.join("src", "features", "recipe", "archive", "RecipeArchiveScreen.tsx"),
  path.join("app", "community-library.tsx"),
  path.join("app", "post", "[id].tsx"),
  path.join("src", "features", "recipe", "views", "RecipeHomeScreen.tsx"),
  // 인기글 전용 화면 — 실시간 순위라 당김이 없으면 "새로고침" 수단이 뒤로가기뿐이다.
  path.join("src", "features", "recipe", "views", "CommunityPopularScreen.tsx"),
  path.join("app", "recipe", "[id]", "index.tsx"),
]

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

/** 주석은 검사에서 뺀다 — 머리말이 `bounces={false}` 를 **설명**하기 때문이다. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/^\s*\/\/.*$/gmu, "")
}

const files = SCAN_DIRS.flatMap((dir) => collect(path.join(ROOT, dir))).map(
  (file) => path.relative(ROOT, file),
)

function read(relative: string): string {
  return stripComments(fs.readFileSync(path.join(ROOT, relative), "utf8"))
}

describe("당겨서 새로고침", () => {
  it("RefreshControl 을 단 스크롤 컨테이너의 bounces 를 끄지 않는다", () => {
    const offenders = files.filter((relative) => {
      const source = read(relative)
      if (!/refreshControl=/u.test(source)) return false
      return /bounces=\{(?!true\})/u.test(source)
    })

    expect(offenders).toEqual([])
  })

  it("RefreshControl 은 src/shared/refresh 한 곳에서만 만든다", () => {
    const offenders = files.filter((relative) => {
      if (RAW_CONTROL_ALLOWED.some((prefix) => relative.startsWith(prefix))) {
        return false
      }
      return /<RefreshControl\b/u.test(read(relative))
    })

    // 홈 기록 화면 하나만 예외다 — 이유는 `HAND_ROLLED_CONTROL` 머리말.
    expect(offenders).toEqual([HAND_ROLLED_CONTROL])
  })

  /* ── 제스처 없이 켠 스피너가 스크롤을 밀던 결함 (2026-08-21) ────────────────
     RN 의 `RCTRefreshControl.m` 은 `refreshing` 이 **JS 쪽에서** 켜지면
     `contentOffset.y -= 컨트롤 높이` 로 스크롤을 직접 내리고, 끝날 때의 복원은
     조건부라 자주 실패한다 — 부를 때마다 위 여백이 쌓인다(실측 0 → 200 → 270pt).
     제스처는 UIKit 이 먼저 내부 상태를 켜 두므로 이 경로를 타지 않는다.

     훅 쪽 계약은 `tests/refreshableSpinnerSource.test.ts` 가 프롭으로 확인한다.
     여기서는 **훅 밖의 그 한 화면**이 같은 규칙을 지키는지 본다. */
  it("훅 밖의 유일한 컨트롤도 제스처일 때만 스피너를 켠다", () => {
    const source = read(HAND_ROLLED_CONTROL).replace(/\s+/gu, " ")

    // `refreshing={...}` 안이 **출처를 보는 식**이어야 한다(불리언 하나면 되돌린 것).
    const bound = /refreshing=\{([^}]*)\}/u.exec(source)?.[1]
    expect(bound).toContain('"gesture"')

    // 그리고 그 출처는 컨트롤의 `onRefresh` 만 넘길 수 있어야 한다.
    expect(source).toMatch(/onRefresh=\{[^}]*\("gesture"\)/u)
  })

  it("훅 밖 컨트롤의 새로고침 함수는 **기본값이 스피너 없음**이다", () => {
    /* 새 호출자가 아무것도 안 적으면 안전한 쪽으로 떨어져야 한다 — 기본값이 반대면
       위 결함이 다음 호출자와 함께 그대로 돌아온다. */
    const source = read(HAND_ROLLED_CONTROL).replace(/\s+/gu, " ")
    expect(source).toMatch(/source: "gesture" \| "code" = "code"/u)
  })

  it("커뮤니티·레시피 화면은 useRefreshable 의 scrollProps 를 지난다", () => {
    const missing = MUST_BE_REFRESHABLE.filter((relative) => {
      const source = read(relative)
      return !source.includes("refreshable.scrollProps")
    })

    expect(missing).toEqual([])
  })

  it("스코프 상수는 키 문자열을 복사하지 않고 훅에서 가져온다", () => {
    const source = read(
      path.join("src", "features", "recipe", "refresh", "scopes.ts"),
    )
    // 키를 여기에 리터럴로 적으면 훅이 이름을 바꾼 날 이 파일만 옛 이름을 가리킨다.
    expect(source).not.toMatch(/\[\s*"[a-z-]+"\s*\]\s*(as const)?/u)
    expect(source).toMatch(/from "\.\.\/hooks\//u)
  })
})
