import {
  normalizeHttpsUrl,
  normalizeStoreUrl,
  phoneUrl,
} from "../src/shared/utils/externalUrl"
import {
  isAllowedMapNavigation,
  MAP_ORIGIN_WHITELIST,
} from "../src/features/restaurant/map/mapNavigation"

describe("external URL boundaries", () => {
  it("allows only credential-free HTTPS web links", () => {
    expect(normalizeHttpsUrl("example.com/path")).toBe(
      "https://example.com/path",
    )
    expect(normalizeHttpsUrl("http://example.com/path")).toBeNull()
    expect(normalizeHttpsUrl("javascript:alert(1)")).toBeNull()
    expect(normalizeHttpsUrl("https://user:secret@example.com/")).toBeNull()
  })

  it("allows only store-safe schemes and strict phone numbers", () => {
    expect(normalizeStoreUrl("https://apps.apple.com/app/id123")).toBe(
      "https://apps.apple.com/app/id123",
    )
    expect(normalizeStoreUrl("market://details?id=kr.sinsin")).toBe(
      "market://details?id=kr.sinsin",
    )
    // TestFlight 초대 링크 — 테스트 빌드 차단 화면의 유일한 출구다.
    expect(normalizeStoreUrl("https://testflight.apple.com/join/abc123")).toBe(
      "https://testflight.apple.com/join/abc123",
    )
    // 안드로이드 내부 테스트 옵트인은 호스트가 play.google.com 이라 그대로 통과한다.
    expect(
      normalizeStoreUrl(
        "https://play.google.com/apps/testing/com.mediology.sinsinapp",
      ),
    ).toBe("https://play.google.com/apps/testing/com.mediology.sinsinapp")
    expect(normalizeStoreUrl("https://evil.example/fake-store")).toBeNull()
    // 허용 호스트를 하위 도메인으로 흉내 내는 주소는 계속 막힌다.
    expect(
      normalizeStoreUrl("https://testflight.apple.com.evil.example/join/x"),
    ).toBeNull()
    expect(normalizeStoreUrl("market://evil?id=kr.sinsin")).toBeNull()
    expect(normalizeStoreUrl("intent://details?id=kr.sinsin")).toBeNull()
    expect(phoneUrl("+82 10-1234-5678")).toBe("tel:+821012345678")
    expect(phoneUrl("123;postd=456")).toBeNull()
  })
})

describe("restaurant map WebView navigation boundary", () => {
  const base = "https://maps.example.test/embedded/map"

  it("allows only the inline document and the base document itself", () => {
    expect(isAllowedMapNavigation("about:blank", base)).toBe(true)
    expect(isAllowedMapNavigation(base, base)).toBe(true)
    // iOS 가 최초 loadHTMLString 내비게이션에 싣는 url 은 끝 `/` 가 붙을 수 있다.
    expect(isAllowedMapNavigation(`${base}/`, base)).toBe(true)
  })

  it.each([
    // baseUrl 의 origin 은 실존하는 웹사이트다. 하위 경로·쿼리를 허용하면 그 사이트가
    // 브릿지 권한을 가진 채 WebView 안에 렌더될 수 있다 — 문서 그 자체만 허용한다.
    `${base}/child?x=1`,
    `${base}?x=1`,
    `${base}#fragment`,
    "http://maps.example.test/embedded/map",
    "https://evil.example/embedded/map",
    "https://maps.example.test/other",
    "https://user:secret@maps.example.test/embedded/map",
    "javascript:alert(1)",
  ])("rejects untrusted top-level navigation: %s", (target) => {
    expect(isAllowedMapNavigation(target, base)).toBe(false)
  })
})

describe("restaurant map WebView originWhitelist", () => {
  /**
   * react-native-webview v13.16.0 의 whitelist 매칭을 **그대로** 복제한다
   * (node_modules/react-native-webview/src/WebViewShared.tsx).
   *
   * 핵심 의미 두 가지 — 이걸 몰라서 지도가 죽었다(2026-08-05):
   * 1. 패턴은 URL 전체가 아니라 origin(`scheme://host[:port]`, 경로·끝 슬래시 없음)에
   *    `^패턴` 정규식으로 매칭된다.
   * 2. 탈락한 내비게이션은 차단이 아니라 **Linking.openURL 로 앱 밖 브라우저에 열린다.**
   *    iOS 는 최초 loadHTMLString(url = baseUrl)도 이 매처에 넣으므로, 최초 로드가
   *    탈락하면 식당 탭이 사파리(앱 다운로드 랜딩)로 튕기고 지도는 회색으로 남는다.
   */
  const extractOrigin = (url: string): string => {
    const result = /^[A-Za-z][A-Za-z0-9+\-.]+:(\/\/)?[^/]*/.exec(url)
    return result === null ? "" : result[0]
  }
  const escapeRegExp = (text: string) =>
    text.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")
  const originWhitelistToRegex = (originWhitelist: string): string =>
    `^${escapeRegExp(originWhitelist).replace(/\\\*/g, ".*")}`
  const passesWhitelist = (whitelist: readonly string[], url: string) => {
    const origin = extractOrigin(url)
    return ["about:blank", ...whitelist]
      .map(originWhitelistToRegex)
      .some((x) => new RegExp(x).test(origin))
  }

  it.each([
    "https://sinsincare.kr",
    "https://sinsincare.kr/",
    "https://localhost:8081",
    "https://localhost:8081/",
    "about:blank",
  ])("initial document load passes the library matcher: %s", (url) => {
    expect(passesWhitelist(MAP_ORIGIN_WHITELIST, url)).toBe(true)
  })

  it("regression: the old `origin/*` pattern never matches an origin", () => {
    // 예전 값이 왜 잘못이었는지 고정한다 — origin 에는 경로도 끝 슬래시도 없어서
    // `/*` 로 끝나는 패턴은 무엇과도 일치하지 않고, 모든 로드가 사파리로 튕긴다.
    expect(
      passesWhitelist(["https://sinsincare.kr/*"], "https://sinsincare.kr"),
    ).toBe(false)
  })
})
