/**
 * 지도 WebView 의 내비게이션 정책. **판정은 `isAllowedMapNavigation` 한 곳만 한다.**
 *
 * ## `originWhitelist` 는 전부 통과시킨다 — 왜 `"*"` 하나인가 (실측 2026-08-05)
 *
 * react-native-webview 의 `originWhitelist` 는 우리 `onShouldStartLoadWithRequest` 와
 * **별개로 먼저 도는 매처**인데, 의미가 두 가지 면에서 다르다
 * (node_modules/react-native-webview/src/WebViewShared.tsx, v13.16.0):
 *
 * 1. 패턴을 URL 전체가 아니라 **origin**(`scheme://host[:port]` — 경로도, 끝 `/` 도
 *    없다)에 `^패턴` 정규식으로 댄다. 예전 값 `https://sinsincare.kr/*` 는 `.kr` 뒤에
 *    리터럴 `/` 를 요구하므로 origin 과 **절대 일치할 수 없었다.**
 * 2. 탈락의 처리가 차단이 아니라 **`Linking.openURL` — 앱 밖 사파리로 연다.**
 *
 * iOS 는 최초 `loadHTMLString` 의 내비게이션(url = baseUrl)도 이 매처에 넣는다
 * (안드로이드는 최초 로드에 `shouldOverrideUrlLoading` 을 부르지 않아 무사했다).
 * 그래서 iOS 에서 식당 탭을 여는 순간 whitelist 탈락 → WebView 로드는 취소되고(회색)
 * → 사파리가 baseUrl(sinsincare.kr = 앱 다운로드 랜딩)을 열었다. 사용자 보고
 * "식당 탭이 앱 다운로드 페이지로 이어진다" 의 정체가 이것이다.
 *
 * 매처를 둘 두면 의미가 이렇게 미묘하게 어긋난다. whitelist 는 아무것도 거르지 않게
 * 두고("*"), 모든 판정을 아래 함수가 한다 — 여기서 거른 내비게이션은 사파리로 새지
 * 않고 조용히 버려진다. `tests/externalBoundarySecurity.test.ts` 가 라이브러리의
 * 매칭 코드를 그대로 복제해 "최초 로드가 whitelist 를 통과한다" 를 고정한다.
 */
// readonly 가 아닌 이유: WebView 의 prop 타입이 mutable string[] 이다.
export const MAP_ORIGIN_WHITELIST: string[] = ["*"]

/**
 * WebView 의 브릿지 권한을 가진 최상위 문서를 **최초 문서 하나로** 못 박습니다.
 *
 * 허용하는 것은 `about:blank` 와 baseUrl 그 자체(끝 `/` 유무만 무시)뿐입니다.
 * baseUrl 의 origin 은 실제로 존재하는 웹사이트(랜딩 페이지)라서, 경로·쿼리가 붙은
 * 주소를 허용하면 그 사이트가 **브릿지 권한을 가진 채** WebView 안에 렌더될 수
 * 있습니다. 지도의 정상 동작에는 최초 로드 외의 최상위 내비게이션이 없습니다.
 */
export function isAllowedMapNavigation(
  targetUrl: string,
  baseUrl: string,
): boolean {
  if (targetUrl === "about:blank") return true
  try {
    const target = new URL(targetUrl)
    const base = new URL(baseUrl)
    const trimSlash = (path: string) => path.replace(/\/+$/u, "")
    return (
      base.protocol === "https:" &&
      target.protocol === "https:" &&
      target.origin === base.origin &&
      !target.username &&
      !target.password &&
      !target.search &&
      !target.hash &&
      trimSlash(target.pathname) === trimSlash(base.pathname)
    )
  } catch {
    return false
  }
}
