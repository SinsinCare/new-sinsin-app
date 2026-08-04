import {
  normalizeHttpsUrl,
  normalizeStoreUrl,
  phoneUrl,
} from "../src/shared/utils/externalUrl"
import {
  isAllowedMapNavigation,
  mapOriginWhitelist,
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
    expect(normalizeStoreUrl("https://evil.example/fake-store")).toBeNull()
    expect(normalizeStoreUrl("market://evil?id=kr.sinsin")).toBeNull()
    expect(normalizeStoreUrl("intent://details?id=kr.sinsin")).toBeNull()
    expect(phoneUrl("+82 10-1234-5678")).toBe("tel:+821012345678")
    expect(phoneUrl("123;postd=456")).toBeNull()
  })
})

describe("restaurant map WebView navigation boundary", () => {
  const base = "https://maps.example.test/embedded/map"

  it("allows the inline document and same-origin base path only", () => {
    expect(isAllowedMapNavigation("about:blank", base)).toBe(true)
    expect(isAllowedMapNavigation(base, base)).toBe(true)
    expect(isAllowedMapNavigation(`${base}/child?x=1`, base)).toBe(true)
  })

  it.each([
    "http://maps.example.test/embedded/map",
    "https://evil.example/embedded/map",
    "https://maps.example.test/other",
    "https://user:secret@maps.example.test/embedded/map",
    "javascript:alert(1)",
  ])("rejects untrusted top-level navigation: %s", (target) => {
    expect(isAllowedMapNavigation(target, base)).toBe(false)
  })

  it("does not whitelist invalid or plaintext base URLs", () => {
    expect(mapOriginWhitelist(base)).toEqual([
      "https://maps.example.test/*",
      "about:*",
    ])
    expect(mapOriginWhitelist("http://maps.example.test/")).toEqual(["about:*"])
  })
})
