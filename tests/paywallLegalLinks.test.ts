import { readFileSync } from "fs"
import { join } from "path"

/**
 * App Store 3.1.2(a): 자동 갱신 구독 결제 화면에는 이용약관(EULA)·개인정보 처리방침으로 가는
 * 동작하는 링크가 있어야 한다(2026-09-14 심사 거절: 메타데이터 EULA 링크 부재). 페이월 footer 의
 * 두 링크와 두 언어 문구를 고정한다.
 */
const ROOT = join(__dirname, "..")
const src = readFileSync(
  join(ROOT, "src/features/billing/components/PaywallSheet.tsx"),
  "utf8",
)
// 주의: `//` 줄주석 제거를 하면 URL 의 `//` 뒤가 잘린다 — 블록 주석만 뗀다.
const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "")

describe("paywall legal links", () => {
  it("opens Apple's standard EULA and the published privacy policy", () => {
    expect(codeOnly).toMatch(
      /PAYWALL_TERMS_URL =\s*"https:\/\/www\.apple\.com\/legal\/internet-services\/itunes\/dev\/stdeula\/"/,
    )
    expect(codeOnly).toMatch(
      /PAYWALL_PRIVACY_URL =\s*"https:\/\/healthier\.notion\.site\/[a-z0-9]+"/,
    )
    expect(codeOnly).toMatch(/Linking\.openURL\(PAYWALL_TERMS_URL\)/)
    expect(codeOnly).toMatch(/Linking\.openURL\(PAYWALL_PRIVACY_URL\)/)
    expect(codeOnly).toMatch(/legalLink: \{ minHeight: 44/)
    expect(codeOnly).toContain('{t("paywall.termsLink")}')
    expect(codeOnly).toContain('{t("paywall.privacyLink")}')
  })

  it.each(["ko", "en"])("%s copy exists", (lang) => {
    const billing = JSON.parse(
      readFileSync(join(ROOT, `src/i18n/locales/${lang}/billing.json`), "utf8"),
    ) as { paywall: Record<string, string> }
    expect(billing.paywall.termsLink.length).toBeGreaterThan(0)
    expect(billing.paywall.privacyLink.length).toBeGreaterThan(0)
  })
})
