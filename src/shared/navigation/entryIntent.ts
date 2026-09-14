/**
 * 진입 URL 분류 — **라우터가 이 URL 로 화면을 옮겨도 되는가.**
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 실측된 결함: 리로드하면 홈이 아니라 그때 그 화면이 뜬다
 *
 * 원인은 JS 가 아니라 **네이티브에 남는 URL 한 개**다.
 *
 * ```
 * iOS 가 URL 전달
 *   → LinkingAppDelegateSubscriber.application(_:open:options:)
 *   → ExpoLinkingRegistry.shared.initialURL = url      ← 네이티브 싱글턴
 * ```
 *
 * JS 리로드(⌘R, Metro `r`, LogBox 의 Reload)는 **JS VM 만** 다시 시작한다.
 * 네이티브 프로세스는 그대로이므로 저 싱글턴도 그대로 남는다. 그리고 앱이 다시
 * 뜰 때마다 expo-router 가 그것을 시작 지점으로 읽는다:
 *
 * ```
 * expo-router getInitialURL()
 *   → Linking.getLinkingURL()
 *   → ExpoLinkingRegistry.shared.initialURL            ← 아까 그 URL
 *   → router-store 가 곧바로 initialState 로 변환      ← 그 화면에서 "시작"한다
 * ```
 *
 * 이 값을 지우는 곳은 앱 전체에서 하나뿐이다 — `expo-dev-launcher` 가 React 호스트를
 * 버리고 런처로 돌아갈 때(`EXDevLauncherController.m`, 주석에 "so the next React host
 * doesn't pick up the deep link that originally launched the previous app"). 즉
 * **평범한 리로드로는 지워지지 않는다.** 딥링크·유니버설 링크·소셜 로그인 콜백 중
 * 무엇이든 한 번 들어오면, 앱을 완전히 종료하거나 dev 런처로 나가기 전까지
 * 리로드할 때마다 그 URL 이 되살아난다.
 *
 * ■ 그래서 이 파일이 하는 일
 *
 * `app/+native-intent.tsx` 가 라우터보다 **먼저** 이 판정을 부른다. 셋으로 나뉜다:
 *
 * | URL | 판정 | 이유 |
 * |---|---|---|
 * | 우리 것이고 아는 라우트 (`sinsin://recipe/12`) | 라우팅한다 | 정상 딥링크 |
 * | 우리 것인데 없는 라우트 (`sinsin://old-page`) | **안 한다** | 없는 화면으로 시작하면 `+not-found` 에 갇힌다 |
 * | 남의 것 (`kakao123://oauth`) | **안 한다** | SDK 가 네이티브에서 처리한다. 라우터가 볼 일이 아니다 |
 *
 * "안 한다" 는 `null` 로 표현된다 — expo-router 는 falsy 를 "이 URL 로는 아무 데도
 * 가지 않는다" 로 읽는다(부팅이면 `/` 에서 시작, 실행 중이면 화면을 옮기지 않는다).
 * **홈으로 보내는 것과 다르다**: 카카오 로그인 콜백이 돌아온 순간에 홈으로 튕기면
 * 로그인 흐름이 끊긴다.
 *
 * ■ 아는 라우트의 목록은 어디서 오는가
 *
 * `routeGraph.ts` 의 표에서 나온다. 그 표는 `tests/routeGraph.test.ts` 가 `app/`
 * 의 실제 파일 목록과 대조하므로, **여기 따로 유지되는 목록은 없다.**
 */
import { knownRouteKeys } from "./routeGraph"

/** 우리 것으로 인정하는 스킴. `app.json` 의 `expo.scheme` · `associatedDomains` 와 맞춘다. */
const OWN_SCHEMES = ["sinsin", "exp", "exps"]
/** 우리 것으로 인정하는 호스트. `app.json` 의 유니버설 링크 도메인. */
const OWN_HOSTS = ["sinsincare.kr", "www.sinsincare.kr"]

/**
 * 라우트 키(`(settings)/health-data`) → URL 패턴(`/health-data`).
 * Expo Router 규칙 그대로: `(group)` 은 URL 에서 사라지고, `index` 는 부모가 된다.
 */
function toUrlPattern(routeKey: string): string[] {
  return routeKey
    .split("/")
    .filter((segment) => segment !== "" && !/^\(.*\)$/u.test(segment))
    .filter((segment) => segment !== "index")
}

const KNOWN_PATTERNS: string[][] = knownRouteKeys().map(toUrlPattern)

function isDynamic(segment: string): boolean {
  return /^\[.+\]$/u.test(segment)
}

function isCatchAll(segment: string): boolean {
  return /^\[\.\.\..+\]$/u.test(segment)
}

function matchesPattern(pathSegments: string[], pattern: string[]): boolean {
  for (let i = 0; i < pattern.length; i++) {
    const expected = pattern[i]
    if (isCatchAll(expected)) return pathSegments.length >= i
    const actual = pathSegments[i]
    if (actual === undefined) return false
    if (isDynamic(expected)) continue
    if (actual !== expected) return false
  }
  return pathSegments.length === pattern.length
}

/** 이 경로에 대응하는 라우트가 있는가. `path` 는 쿼리·해시가 제거된 순수 경로. */
export function isKnownRoutePath(path: string): boolean {
  const segments = path.split("/").filter(Boolean).map(decodeSegment)
  if (segments.length === 0) return true // `/` 는 진입 라우트다
  return KNOWN_PATTERNS.some((pattern) => matchesPattern(segments, pattern))
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

type ParsedUrl = { own: boolean; path: string }

/**
 * URL 에서 우리 경로를 꺼낸다.
 *
 * 다뤄야 하는 모양이 넷이다:
 *  - `sinsin://recipe/12` · `sinsin:///recipe/12` (슬래시 개수가 호출처마다 다르다)
 *  - `https://sinsincare.kr/password-edit`
 *  - `exp://192.168.0.2:8081/--/recipe/12` (dev client — `/--/` 뒤가 실제 경로)
 *  - `/recipe/12` (스킴 없이 경로만 오는 경우)
 */
function parse(url: string): ParsedUrl {
  const trimmed = url.trim()
  if (trimmed === "") return { own: true, path: "/" }

  // 스킴 없는 순수 경로
  if (trimmed.startsWith("/")) return { own: true, path: stripQuery(trimmed) }

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//u.exec(trimmed)
  if (!schemeMatch) return { own: false, path: "" }

  const scheme = schemeMatch[1].toLowerCase()
  const rest = trimmed.slice(schemeMatch[0].length)

  if (scheme === "http" || scheme === "https") {
    const slash = rest.indexOf("/")
    const host = (slash === -1 ? rest : rest.slice(0, slash)).toLowerCase()
    if (!OWN_HOSTS.includes(host.split(":")[0])) return { own: false, path: "" }
    return {
      own: true,
      path: stripQuery(slash === -1 ? "/" : rest.slice(slash)),
    }
  }

  // `exp+sinsin` 처럼 접두가 붙는 dev 스킴도 우리 것으로 본다.
  const bare = scheme.replace(/^exp\+/u, "")
  if (!OWN_SCHEMES.includes(bare) && bare !== "sinsin") {
    return { own: false, path: "" }
  }

  // dev client / Expo Go 는 `<host:port>/--/<실제 경로>` 로 감싼다.
  const devMarker = rest.indexOf("/--/")
  if (devMarker !== -1) {
    return { own: true, path: stripQuery(rest.slice(devMarker + 3)) }
  }

  /* `exp://192.168.0.2:8081` 처럼 `/--/` 가 없는 dev URL 은 **딥링크가 아니라
     "앱을 그냥 켰다"** 는 뜻이다(`host:port` 는 메트로 주소지 경로가 아니다).
     여기서 경로로 읽으면 매번 진입이 삼켜진 것처럼 보인다. */
  if (bare === "exp" || bare === "exps") return { own: true, path: "/" }

  // `sinsin://recipe/12` 는 `recipe` 가 호스트 자리에 온다. 우리 스킴에는
  // 호스트 개념이 없으므로 전부 경로로 읽는다.
  const withoutLeadingSlashes = rest.replace(/^\/+/u, "")
  return { own: true, path: stripQuery(`/${withoutLeadingSlashes}`) }
}

function stripQuery(path: string): string {
  const cut = path.search(/[?#]/u)
  return cut === -1 ? path : path.slice(0, cut)
}

/**
 * 위 표의 세 갈래에 붙인 이름. 종전에는 뒤 둘이 똑같이 `false` 로 뭉개져 **버려진
 * 이유가 남지 않았다** — "우리 링크인데 화면이 없다"(공유 링크가 죽었다는 뜻)와
 * "남의 로그인 콜백"(정상)은 정반대의 사건인데 구분할 방법이 없었다.
 */
export type EntryUrlVerdict = "routed" | "unknown_route" | "foreign_scheme"

/** 판정만 한다. 아무것도 기록하지 않으므로 호출부가 몇 번을 불러도 안전하다. */
export function classifyEntryUrl(url: string): EntryUrlVerdict {
  const { own, path } = parse(url)
  // 남의 스킴은 우리가 판단할 대상이 아니다. SDK 가 네이티브에서 처리한다.
  if (!own) return "foreign_scheme"
  return isKnownRoutePath(path) ? "routed" : "unknown_route"
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * 접힌 목적지 — 로그인 관문에 막혀 못 간 화면 한 개.
 *
 * ■ 고치는 증상: 로그아웃 상태에서 받은 공유 링크는 목적지가 사라진다
 *
 * `sinsin:///post/482` 를 로그인하지 않은 사람이 누르면 라우터는 그 화면을 열고,
 * 진입 가드(`guard.ts`)가 곧바로 `/(auth)/login` 으로 갈아 끼운다. 그 순간
 * **어디로 가려 했는지는 아무 데도 남지 않았다.** 로그인을 마치면
 * `resolveEntryRoute` 가 홈으로 보내고 링크는 조용히 버려진다 — 공유 링크가
 * 겨냥하는 사람이 정확히 "아직 로그인하지 않은 사람" 인데 말이다.
 *
 * 그래서 가드가 로그인으로 보내는 순간 목적지를 한 칸에 적어 두고, 관문을 전부
 * 통과해 앱 안에 착지한 **딱 한 번** 꺼내 쓴다(`app/_layout.tsx`).
 *
 * ■ 왜 메모리에만 두는가 (AsyncStorage 가 아니라)
 *
 * 앱을 껐다 켜도 살아남으면 **관계없는 나중 로그인에 되살아난다.** 어제 받은
 * 공유 링크 때문에 오늘 아침 앱을 켠 사람이 홈이 아니라 남의 글로 떨어지는
 * 식이다. 게다가 저장은 비동기라, 동기 함수인 가드가 도는 첫 프레임에는 값이
 * 아직 없다 — "있을 때도 있고 없을 때도 있는" 복원이 된다.
 *
 * 잃는 것은 없다: 앱이 완전히 종료된 뒤 같은 링크로 다시 열리면 **OS 가 그 URL 을
 * 다시 넘겨 주므로** 이 흐름 전체가 처음부터 다시 돈다. 링크 없이 그냥 켠 것이라면
 * 목적지가 없는 게 맞다.
 *
 * ■ 무엇을 적지 않는가
 *
 * 관문 화면 자신(`/login`·`/onboarding`·`/profile-setup`)과 진입 기본값(`/home`),
 * 그리고 우리 라우트가 아닌 경로. 앞엣것을 적으면 로그인 → 로그인으로 되돌아가는
 * 고리가 생기고, 뒤엣것은 `+not-found` 로 데려간다.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * 관문 자체이거나 어차피 착지하는 곳. `routeGraph` 의 실제 파일 목록에서 만든다 —
 * 손으로 유지하는 두 번째 목록을 두면 화면이 늘 때 조용히 어긋난다.
 */
const GATE_PATHS: ReadonlySet<string> = new Set([
  // 진입 라우트. `app/index.tsx` 는 라우트 표에 이름이 없다(`/` 그 자체다).
  "/",
  ...knownRouteKeys()
    .filter(
      (key) =>
        key.startsWith("(auth)/") ||
        key === "onboarding" ||
        key === "(tabs)/home",
    )
    .map((key) => `/${toUrlPattern(key).join("/")}`),
])

/** 한 칸뿐이다. 마지막으로 막힌 목적지가 사용자가 방금 하려던 일이다. */
let pendingEntryPath: string | null = null

/**
 * 가드가 로그인으로 보내면서 "여기로 가려던 참이었다" 를 적어 둔다.
 * `path` 는 `usePathname()` 이 주는 실제 경로(`/post/482`) — 세그먼트
 * (`/post/[id]`)가 아니다.
 */
export function rememberEntryIntent(path: string): void {
  const clean = stripQuery(path.trim())
  if (clean === "" || GATE_PATHS.has(clean)) return
  if (!isKnownRoutePath(clean)) return
  pendingEntryPath = clean
}

/**
 * 꺼내면서 **비운다.** 한 번 쓰면 없는 것이 이 값의 계약이다 — 남겨 두면 다음
 * 로그인·다음 화면 전환에 한 번 더 튀어 고리가 된다.
 */
export function takeEntryIntent(): string | null {
  const path = pendingEntryPath
  pendingEntryPath = null
  return path
}

/** 세션이 끊기는 등 목적지가 더 이상 이 사람의 것이 아닐 때. */
export function clearEntryIntent(): void {
  pendingEntryPath = null
}
