/**
 * 라우트 그래프 — **뒤로가기의 목적지를 히스토리가 아니라 화면 구조로 정의한다.**
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 왜 필요한가 (실측된 결함)
 *
 * `router.back()` 은 "직전에 있던 화면" 으로 간다. 그런데 앱에는 **직전 화면이 없는
 * 진입 경로가 네 가지** 있다:
 *
 * | 진입 | 루트 스택 | `router.back()` 결과 |
 * |---|---|---|
 * | 푸시 알림 탭 (`/(settings)/announcement-detail`) | 깊이 1 | GO_BACK 미처리 |
 * | 딥링크 (`sinsin:///recipe/12`, `https://sinsincare.kr/...`) | 깊이 1 | GO_BACK 미처리 |
 * | dev 리로드 (dev client 가 마지막 URL 을 재생한다) | 깊이 1 | GO_BACK 미처리 |
 * | `router.replace` 로 갈아탄 직후 | 깊이 1 | GO_BACK 미처리 |
 *
 * 이때 나오는 것이 `The action 'GO_BACK' was not handled by any navigator` 경고다.
 * prod 에서는 경고조차 없이 **버튼이 아무 일도 하지 않는다** — 사용자는 앱을 껐다 켜는
 * 것 말고는 그 화면에서 나갈 방법이 없다.
 *
 * ■ 왜 `canGoBack()` 삼항으로 충분하지 않은가
 *
 * 종전에는 80곳 중 10곳만 `router.canGoBack() ? router.back() : router.replace(...)`
 * 를 썼고, 그 10곳도 폴백 목적지를 각자 손으로 골랐다(`/(tabs)/home`, `/(tabs)/all`,
 * `/(settings)/profile-edit` …). 새 화면을 만드는 사람이 매번 다시 판단해야 하고,
 * 판단을 빠뜨리면 **그 화면만 조용히 막다른 길이 된다.** 실제로 70곳이 빠져 있었다.
 *
 * 그래서 폴백 목적지를 화면마다 정하지 않고 **한 표에 모은다.** 표에 있으면 그 화면은
 * 어떤 경로로 들어와도 빠져나올 수 있다는 뜻이고, `tests/routeGraph.test.ts` 가
 * `app/` 의 모든 라우트 파일이 표에 있는지 검사한다 — 새 화면을 추가하면 표를
 * 채우기 전까지 테스트가 실패한다.
 *
 * ■ 폴백 목적지를 고르는 규칙: **"사용자가 시작했을 법한 화면"**
 *
 * 히스토리가 있으면 그쪽이 항상 옳다(그 화면이 실제로 직전 화면이다). 폴백은
 * 히스토리가 **없을 때만** 쓰이므로, 그때의 목적지는 "논리적 상위" 가 아니라
 * **"딥링크로 들어온 사람이 여기서 나가면 자연스러운 곳"** 이어야 한다.
 *
 * 그래서 대부분은 그 화면이 속한 **탭 루트**로 보낸다. 퍼널 중간 화면
 * (`/restaurant/list`, `/restaurant/search`)을 부모로 삼지 않는 이유가 이것이다 —
 * 검색어 없이 목록만 덩그러니 뜬 화면으로 되돌리는 것은 나가는 게 아니다.
 *
 * 예외는 **부모를 params 로 복원할 수 있을 때**다. `/restaurant/317/photos` 는
 * `317` 을 알고 있으므로 `/restaurant/317` 로 되돌릴 수 있고, 그게 탭 루트보다
 * 명백히 낫다. 이런 경우에만 함수로 적는다.
 *
 * ■ 루트(`null`) 의 의미
 *
 * `null` 은 "부모가 없다" 가 아니라 **"뒤로가기를 눌러도 아무 일도 일어나지 않아야
 * 한다"** 는 뜻이다. 홈 탭, 로그인, 온보딩, 탈퇴 완료가 여기 해당한다. 이 화면들에서
 * 폴백을 돌면 무한 루프(`/(auth)/login` → `/(auth)/login`)가 된다.
 */
import type { Href } from "expo-router"

/**
 * 라우트 키. `useSegments()` 가 돌려주는 세그먼트를 `/` 로 이은 것이며
 * **그룹(`(tabs)`)과 동적 세그먼트(`[id]`)를 원형 그대로** 담는다.
 *
 * 그룹을 지우지 않는 이유: `app/index.tsx` 와 `app/(settings)/index.tsx` 는 URL 이
 * 둘 다 `/` 라 pathname 으로는 구분되지 않는다(`tests/recipeRouteCollision.test.ts`
 * 머리말 참고). 세그먼트는 `[]` 와 `["(settings)"]` 로 갈라진다.
 *
 * **꼬리의 `index` 는 세그먼트에 없다.** expo-router 가 잘라 내기 때문이다
 * (`global-state/routeInfo.js`: `if (segments.at(-1) === 'index') segments.pop()`).
 * 그래서 파일이 `app/recipe/[id]/index.tsx` 여도 키는 `recipe/[id]` 다 — 파일명을
 * 그대로 옮겨 적으면 표에 있어도 안 맞는다. `tests/routeGraph.test.ts` 가 이 규칙까지
 * 포함해서 파일 트리와 표를 대조한다.
 */
export type RouteKey = string

type ParentRoute = Href | null
type ParentResolver = ParentRoute | ((params: RouteParams) => ParentRoute)

/** `useLocalSearchParams()` 의 값. 동적 세그먼트와 쿼리스트링이 섞여 들어온다. */
export type RouteParams = Record<string, string | string[] | undefined>

function param(params: RouteParams, key: string): string | undefined {
  const value = params[key]
  if (Array.isArray(value)) return value[0]
  return value
}

/**
 * 라우트 키 → 뒤로가기 폴백 목적지.
 *
 * `app/` 의 모든 라우트가 여기 있어야 한다(테스트가 강제한다). 값이 `null` 이면
 * 루트 화면 — 뒤로가기가 아무 일도 하지 않는다.
 */
const ROUTE_PARENT: Record<RouteKey, ParentResolver> = {
  // ── 진입 ───────────────────────────────────────────────────────────────────
  "": null,

  // ── 인증 ───────────────────────────────────────────────────────────────────
  // 로그인은 인증 그룹의 루트다. 여기서 더 뒤로 갈 곳은 앱 바깥뿐이다.
  "(auth)/login": null,
  "(auth)/email-login": "/(auth)/login",
  "(auth)/email-login-link-password": "/(auth)/email-login",
  "(auth)/forgot-password": "/(auth)/email-login",
  "(auth)/social-link-email": "/(auth)/login",
  "(auth)/terms-agreement": "/(auth)/login",
  "(auth)/signup-email": "/(auth)/terms-agreement",
  "(auth)/signup-password": "/(auth)/signup-email",
  // 프로필 입력은 게이트 화면이다 — 끝내기 전에는 루트 가드가 여기로 되돌려 놓는다.
  // 폴백을 로그인으로 두는 것은 "가입을 그만둔다" 는 뜻이고, 실제로
  // `useSignupSteps` 의 첫 스텝 뒤로가기가 그렇게 동작한다.
  "(auth)/profile-setup": "/(auth)/login",
  // 가입 완료는 종착지다(`gestureEnabled: false`). 되돌아갈 곳이 없다.
  "(auth)/signup-complete": null,

  // 온보딩도 게이트 화면이라 뒤로가기 자체가 없다(하드웨어 백은 `useOnboarding` 이 막는다).
  onboarding: null,

  // ── 탭 ─────────────────────────────────────────────────────────────────────
  // 홈이 앱의 루트다. 나머지 탭에서의 뒤로가기는 안드로이드 하드웨어 백의 관례대로 홈.
  "(tabs)/home": null,
  "(tabs)/community": "/(tabs)/home",
  "(tabs)/community-popular": "/(tabs)/community",
  "(tabs)/recipe": "/(tabs)/home",
  "(tabs)/restaurant": "/(tabs)/home",
  "(tabs)/all": "/(tabs)/home",

  // ── 루트 위에 얹히는 화면 ──────────────────────────────────────────────────
  consult: "/(tabs)/home",
  statistics: "/(tabs)/home",
  "meal-report": "/(tabs)/home",
  "food-camera": "/(tabs)/home",
  // 기록 페이지 셋은 홈에서만 열린다 — 딥링크로 들어와도 홈으로 되돌린다.
  "record/medication": "/(tabs)/home",
  "medication/add": "/record/medication",
  "medication/search": "/record/medication",
  "medication/manage": "/record/medication",
  "medication/edit": "/record/medication",
  "medication/photo": "/record/medication",
  "medication/candidates": "/record/medication",
  "record/water": "/(tabs)/home",
  "record/blood-pressure": "/(tabs)/home",
  "record/weight": "/(tabs)/home",
  "record/blood-glucose": "/(tabs)/home",
  "record/edema": "/(tabs)/home",
  stories: "/(tabs)/community",
  "community-library": "/(tabs)/community",
  // 검색은 퍼널 중간이다. 딥링크로 들어온 사람을 빈 검색으로 되돌리는 것은
  // 나가는 게 아니므로 피드(탭 루트)로 보낸다 — 식당 검색과 같은 규칙.
  "community/search": "/(tabs)/community",
  "community/author/[id]": "/(tabs)/community",
  "community/connections": (params) => communityAuthor(params),
  "community/report": (params) => communityReportPost(params),
  "post/[id]": "/(tabs)/community",
  "v2-showcase": "/(tabs)/home",

  // ── 레시피 ─────────────────────────────────────────────────────────────────
  "recipe/[id]": "/(tabs)/recipe",
  "recipe/saved": "/(tabs)/recipe",
  "recipe/recent": "/(tabs)/recipe",

  // ── 식당 ───────────────────────────────────────────────────────────────────
  "restaurant/[id]": "/(tabs)/restaurant",
  // 사진 뷰어와 후기 작성은 상세 위에 모달로 얹힌다. id 를 알고 있으므로
  // 탭 루트가 아니라 **그 식당의 상세**로 되돌리는 것이 옳다.
  "restaurant/[id]/photos": (params) => restaurantDetail(params),
  "restaurant/[id]/review": (params) => restaurantDetail(params),
  "restaurant/reviewer/[id]": "/(tabs)/restaurant",
  // 검색·목록은 퍼널 중간이다. 딥링크로 들어온 사람을 검색어 없는 목록으로
  // 되돌리는 것은 나가는 게 아니므로 지도(탭 루트)로 보낸다.
  "restaurant/search": "/(tabs)/restaurant",
  "restaurant/list": "/(tabs)/restaurant",
  "restaurant/bookmarks": "/(tabs)/restaurant",
  "restaurant/report": "/(tabs)/restaurant",

  // ── 작성 ───────────────────────────────────────────────────────────────────
  "(write)/free/new": "/(tabs)/community",
  // 수정은 그 글의 상세에서만 들어간다. id 로 복원할 수 있다.
  "(write)/free/[id]": (params) => post(params),
  "(write)/story/new": "/(tabs)/community",
  "(write)/recipe/new": "/(tabs)/recipe",
  "(write)/recipe/edit/[id]": (params) => recipeDetail(params),

  // ── 설정 · 마이페이지 ──────────────────────────────────────────────────────
  // `(tabs)/all` 이 마이페이지, `(settings)`(index) 가 설정이다. 둘은 다른 화면이다.
  "(settings)": "/(tabs)/all",
  "(settings)/profile-edit": "/(tabs)/all",
  "(settings)/nickname-edit": "/(settings)/profile-edit",
  "(settings)/name-edit": "/(settings)/profile-edit",
  "(settings)/phone-number-edit": "/(settings)/profile-edit",
  "(settings)/password-edit": "/(settings)/profile-edit",
  "(settings)/kidney-profile-edit": "/(tabs)/all",
  "(settings)/notification-settings": "/(settings)",
  "(settings)/subscription": "/(settings)",
  "(settings)/notifications": "/(tabs)/all",
  "(settings)/announcements": "/(tabs)/all",
  "(settings)/announcement-detail": "/(settings)/announcements",
  "(settings)/inquiry": "/(tabs)/all",
  "(settings)/ask-doctor": "/(tabs)/all",
  "(settings)/medical-reference": "/(tabs)/all",
  "(settings)/privacy-settings": "/(settings)",
  "(settings)/app-info": "/(settings)",
  // 약관은 로그인 전에도 열린다(루트 가드가 명시적으로 통과시킨다). 비로그인 상태에서
  // `/(settings)` 로 되돌리면 가드가 한 번 더 로그인으로 보낸다 — 한 홉 더 돌 뿐
  // 목적지는 맞고, 막다른 길이 되지 않는다.
  "(settings)/legal-document": "/(settings)",
  "(settings)/withdrawal": "/(settings)",
  "(settings)/withdrawal-terms": "/(settings)/withdrawal",
  // 탈퇴 완료는 종착지다. 화면 자체가 로그인으로 replace 한다.
  "(settings)/withdrawal-complete": null,

  // ── 건강검진 ───────────────────────────────────────────────────────────────
  "(settings)/health-data": "/(tabs)/all",
  "(settings)/health-dashboard": "/(settings)/health-data",
  "(settings)/health-data-upload": "/(settings)/health-data",
  "(settings)/health-ocr-review": "/(settings)/health-data-upload",
  "(settings)/health-results": "/(settings)/health-data",
  "(settings)/health-result-detail": "/(settings)/health-results",
  "(settings)/health-nhis-auth": "/(settings)/health-data",
  "(settings)/health-nhis-request": "/(settings)/health-nhis-auth",
  "(settings)/health-nhis-confirm": "/(settings)/health-nhis-request",

  // ── 검진 분석 ──────────────────────────────────────────────────────────────
  // 목록이 이 기능의 입구다(마이페이지에서 들어온다).
  "(settings)/checkup-list": "/(tabs)/all",
  "(settings)/checkup-auth": "/(settings)/checkup-list",
  "(settings)/checkup-detail": "/(settings)/checkup-list",
  // 캘린더는 상세에서만 들어가고, 어느 회차를 보고 있었는지가 `resultIds` 로 넘어와
  // 있다. 그 값을 그대로 되돌려주면 목록이 아니라 **보던 상세**로 돌아간다.
  // 인코딩(`encodeResultIds`)을 여기서 알 필요는 없다 — 받은 문자열을 그대로 쓴다.
  "(settings)/checkup-calendar": (params) => checkupDetail(params),

  // ── 의사 연결 ──────────────────────────────────────────────────────────────
  // 연결 목록이 이 기능의 홈이다(화면 머리말 참고).
  "(settings)/doctor-connections": "/(tabs)/all",
  "(settings)/doctor-intro": "/(settings)/doctor-connections",
  "(settings)/doctor-search": "/(settings)/doctor-intro",
  "(settings)/doctor-preview": "/(settings)/doctor-search",
  "(settings)/doctor-sharing": "/(settings)/doctor-connections",
}

function restaurantDetail(params: RouteParams): ParentRoute {
  const id = param(params, "id")
  if (!id) return "/(tabs)/restaurant"
  return `/restaurant/${id}` as Href
}

function communityAuthor(params: RouteParams): ParentRoute {
  const id = param(params, "id")
  if (!id) return "/(tabs)/community"
  return `/community/author/${id}` as Href
}

function communityReportPost(params: RouteParams): ParentRoute {
  const postId = param(params, "postId")
  if (!postId) return "/(tabs)/community"
  return `/post/${postId}` as Href
}

function post(params: RouteParams): ParentRoute {
  const id = param(params, "id")
  if (!id) return "/(tabs)/community"
  return `/post/${id}` as Href
}

function checkupDetail(params: RouteParams): ParentRoute {
  const resultIds = param(params, "resultIds")
  if (!resultIds) return "/(settings)/checkup-list"
  return {
    pathname: "/(settings)/checkup-detail",
    params: { resultIds },
  } as Href
}

function recipeDetail(params: RouteParams): ParentRoute {
  const id = param(params, "id")
  if (!id) return "/(tabs)/recipe"
  return `/recipe/${id}` as Href
}

/**
 * 표에 없는 라우트의 안전망. 첫 세그먼트가 속한 **구역의 탭 루트**로 보낸다.
 *
 * 표가 비어 있는 상태로 릴리스되는 것을 막는 것은 테스트의 몫이고, 이 규칙은
 * "테스트를 통과한 뒤에 추가된 라우트" 나 "라우터가 예상 밖의 세그먼트를 준 경우"
 * 에도 화면이 막다른 길이 되지 않게 하는 최후 방어선이다.
 */
const SECTION_FALLBACK: [prefix: string, parent: Href][] = [
  ["(auth)", "/(auth)/login"],
  ["(settings)", "/(tabs)/all"],
  ["(write)/recipe", "/(tabs)/recipe"],
  ["(write)", "/(tabs)/community"],
  ["restaurant", "/(tabs)/restaurant"],
  ["recipe", "/(tabs)/recipe"],
  ["post", "/(tabs)/community"],
  ["stories", "/(tabs)/community"],
  ["community-library", "/(tabs)/community"],
]

/** `useSegments()` 결과를 라우트 키로. */
export function toRouteKey(segments: readonly string[]): RouteKey {
  return segments.join("/")
}

/** 라우트 키가 표에 있는가. 테스트가 쓰는 검사. */
export function hasRouteParent(key: RouteKey): boolean {
  return key in ROUTE_PARENT
}

/** 표에 등록된 모든 라우트 키. 테스트가 쓰는 목록. */
export function knownRouteKeys(): RouteKey[] {
  return Object.keys(ROUTE_PARENT)
}

/**
 * 뒤로가기 폴백 목적지. `null` 이면 **아무 데도 가지 않는다**(루트 화면).
 *
 * 히스토리가 있을 때는 이 함수를 쓰지 않는다 — `useGoBack` 이 히스토리를 먼저 본다.
 */
export function resolveBackRoute(
  segments: readonly string[],
  params: RouteParams = {},
): Href | null {
  const key = toRouteKey(segments)

  if (key in ROUTE_PARENT) {
    const parent = ROUTE_PARENT[key]
    return typeof parent === "function" ? parent(params) : parent
  }

  for (const [prefix, parent] of SECTION_FALLBACK) {
    if (key === prefix || key.startsWith(`${prefix}/`)) return parent
  }

  return "/(tabs)/home"
}
