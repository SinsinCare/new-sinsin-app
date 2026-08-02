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
 * 라우터가 이 URL 로 화면을 옮겨도 되는가.
 *
 * 거짓이면 호출처(`app/+native-intent.tsx`)가 `null` 을 돌려주고, expo-router 는
 * 그 URL 을 **없던 것처럼** 취급한다 — 부팅이면 `/` 에서 시작하고, 실행 중이면
 * 화면을 옮기지 않는다.
 */
export function isRoutableEntryUrl(url: string): boolean {
  const { own, path } = parse(url)
  // 남의 스킴은 우리가 판단할 대상이 아니다. SDK 가 네이티브에서 처리한다.
  if (!own) return false
  return isKnownRoutePath(path)
}
