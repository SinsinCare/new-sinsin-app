/**
 * **사다리 4번은 고장난 화면에서만 산다** — 등록하는 쪽의 표. (2026-08-21)
 *
 * ## 무엇이 뒤집혔나
 *
 * 사용자 신고: "커뮤니티, 레시피 다시누르면 스크롤 맨위가 아니라 새로고침 스피너까지
 * 가는데". 4번은 `refresh`(이미 맨 위면 다시 받는다)였고, 3번의 `scrollToTop` 이
 * 기억한 오프셋을 **동기적으로** 0 으로 쓰기 때문에(늦게 오는 `onScroll` 이 옛 위치를
 * 되살리는 다른 결함을 막는다) 자연스러운 빠른 두 번째 탭이 곧바로 거기 떨어졌다.
 *
 * 탭 탭은 **이동** 제스처다. 새로고침에는 이미 보편적이고 발견 가능한 제스처가 있다
 * (당겨서 새로고침). 그래서 4번은 **복구**로만 남는다 — 전면 오류가 선 목록, 죽은 지도.
 *
 * ## 왜 소스로 검사하나
 *
 * 이 화면들은 렌더러 없이 부를 수 없다(지도 WebView·FlashList·쿼리 십수 개).
 * 커뮤니티 피드만 예외로 함수 호출이 가능해 `tests/communityFeedSectionWiring.test.ts`
 * 가 **등록된 값 자체**를 잡고, 식당은 `tests/restaurantTabRootState.test.ts` 가 본다.
 * 여기서는 나머지와 함께 **표 전체**를 못 박는다 — 뒤집히면 안 되는 것이 결국
 * "어느 화면이 그 칸을 채우는가" 라서, 그 목록 자체가 검사 대상이다.
 *
 * 새 탭이 생겨 `useRegisterTabReset` 을 부르면 아래 목록이 어긋나 이 스위트가 깨진다.
 * 그때 해야 할 일은 목록에 더하는 것이 아니라 **그 화면이 4번을 채워야 하는지 정하는
 * 것**이다(멀쩡한 화면이면 답은 언제나 "채우지 않는다").
 */
import fs from "fs"
import path from "path"

const ROOT = path.join(__dirname, "..")
const SCAN_DIRS = ["app", "src"]

/** 4번을 **채우는** 화면과 그 조건. 값은 등록식에 반드시 들어 있어야 하는 조각이다. */
const RECOVERS_WHEN: Record<string, string> = {
  // 목록 자리에 글이 아니라 전면 오류가 서 있을 때(`communityFeedSurfaces.failed`).
  [path.join("src", "features", "recipe", "components", "FreePostTab.tsx")]:
    "feedFailed",
  // 첫 조회가 실패해 목록이 비었을 때 — `ListEmptyComponent` 의 오류 갈래와 같은 조건.
  [path.join("src", "features", "recipe", "views", "RecipeHomeScreen.tsx")]:
    "list.isError",
  // 지도가 죽어 오류면만 남았을 때. 화면의 `다시 시도` 와 같은 일을 한다.
  [path.join(
    "src",
    "features",
    "restaurant",
    "views",
    "RestaurantMapScreen.tsx",
  )]: "mapError",
}

/**
 * 4번을 **비워 두는** 화면과 그 이유.
 *
 * 둘 다 되살릴 "고장난 상태" 자체가 없다 — 조회가 실패해도 전면 오류를 세우지 않고
 * 화면이 그대로 서고(홈은 토스트, 내정보는 대체 문구), 다시 받는 길이 따로 있다
 * (홈은 당겨서 새로고침, 내정보는 focus 마다 도는 `useFocusEffect`).
 */
const NEVER_RECOVERS = [
  path.join(
    "src",
    "features",
    "home",
    "components",
    "record",
    "RecordView.tsx",
  ),
  path.join("app", "(tabs)", "home.tsx"),
  path.join("src", "features", "settings", "views", "MyPageScreen.tsx"),
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

/** 주석은 뺀다 — 이 파일들의 머리말이 **옛 코드**(`refresh: refreshable.refresh`)를 인용한다. */
function read(relative: string): string {
  return fs
    .readFileSync(path.join(ROOT, relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^\s*\/\/.*$/gmu, "")
}

const files = SCAN_DIRS.flatMap((dir) => collect(path.join(ROOT, dir))).map(
  (file) => path.relative(ROOT, file),
)

/**
 * 화면이 사다리에 등록하는 파일들 — 스캔으로 찾는다(목록을 손으로 들면 새 것을 놓친다).
 * 훅을 **정의하는** 모듈은 뺀다(`src/shared/navigation`) — 거기 있는 것은 등록이 아니다.
 */
const registrars = files.filter(
  (relative) =>
    !relative.startsWith(path.join("src", "shared", "navigation")) &&
    /useRegisterTabReset\(/u.test(read(relative)),
)

/** `recover:` 뒤에 오는 식 하나를 공백을 눌러 돌려준다. 없으면 `null`. */
function recoverExpression(relative: string): string | null {
  const match = /recover:([^,]*(?:,[^,]*\?[^,]*)?)/u.exec(read(relative))
  return match ? match[1].replace(/\s+/gu, " ").trim() : null
}

describe("누가 4번을 채우는가", () => {
  it("등록하는 화면은 정확히 이 여섯이다", () => {
    /* 새 화면이 늘면 여기가 깨진다 — 그때 정할 것은 "그 화면이 고장날 수 있는가" 다. */
    expect([...registrars].sort()).toEqual(
      [...Object.keys(RECOVERS_WHEN), ...NEVER_RECOVERS].sort(),
    )
  })

  it("**멀쩡할 수밖에 없는 화면은 그 칸을 아예 안 만든다**", () => {
    const offenders = NEVER_RECOVERS.filter((relative) =>
      /recover:/u.test(read(relative)),
    )
    expect(offenders).toEqual([])
  })

  it("채우는 화면도 **조건 없이는** 채우지 않는다 — 멀쩡한 갈래가 `undefined` 다", () => {
    /*
      이 한 줄이 결정 그 자체다. `recover: refreshable.refresh` 로 되돌리면
      멀쩡한 화면의 두 번째 재탭이 다시 새로고침으로 떨어진다.
    */
    const unconditional = Object.keys(RECOVERS_WHEN).filter((relative) => {
      const expression = recoverExpression(relative)
      return expression === null || !expression.includes("undefined")
    })
    expect(unconditional).toEqual([])
  })

  it("각 화면의 조건은 **그 화면이 고장났다는 사실**을 본다", () => {
    for (const [relative, needle] of Object.entries(RECOVERS_WHEN)) {
      expect(recoverExpression(relative)).toContain(needle)
    }
  })
})

describe("복구 중에는 화면이 그 사실을 말한다", () => {
  /*
    프로그램 새로고침은 `RefreshControl` 을 켜지 않는다 — 켜면 iOS 가 스크롤을
    밀어 두고 되돌리지 않아 부를 때마다 위 여백이 쌓인다(`useRefreshable` 머리말 4번,
    계약은 `tests/refreshableSpinnerSource.test.ts`). 그래서 스피너가 서던 자리에
    화면이 이미 들고 있는 **첫 조회 스켈레톤**을 세운다.
  */
  it("레시피 홈의 빈 자리는 `isRunning` 에도 스켈레톤을 세운다", () => {
    const source = read(
      path.join("src", "features", "recipe", "views", "RecipeHomeScreen.tsx"),
    ).replace(/\s+/gu, " ")
    expect(source).toContain("list.isLoading || refreshable.isRunning")
  })

  it("커뮤니티 피드의 스켈레톤 판정도 같은 사실을 본다", () => {
    const source = read(
      path.join("src", "features", "recipe", "components", "FreePostTab.tsx"),
    ).replace(/\s+/gu, " ")
    expect(source).toContain("isLoading || refreshable.isRunning")
  })
})
