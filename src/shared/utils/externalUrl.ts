const SCHEME_LESS_WEB_HOST =
  /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/iu
/**
 * 스토어로 나가는 주소만 통과시킨다. **`testflight.apple.com` 이 여기 있는 이유**:
 * 테스트 빌드를 강제 업데이트로 막을 때 정책의 `default_store_url` 이 TestFlight 초대
 * 링크여야 한다 — App Store 링크를 주면 테스터가 스토어 판으로 넘어가 테스트에서
 * 이탈한다. 이 호스트가 빠져 있으면 `normalizeStoreUrl` 이 null 을 내고 차단 화면에
 * 버튼이 사라져서, 나갈 문 없는 벽이 된다(2026-08-30).
 * 안드로이드 내부 테스트 옵트인은 `play.google.com/apps/testing/…` 이라 이미 통과한다.
 */
const HTTPS_STORE_HOSTS = new Set([
  "apps.apple.com",
  "itunes.apple.com",
  "play.google.com",
  "testflight.apple.com",
])

export function normalizeHttpsUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 2_048) return null
  const candidate = SCHEME_LESS_WEB_HOST.test(trimmed)
    ? `https://${trimmed}`
    : trimmed
  try {
    const url = new URL(candidate)
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export function normalizeStoreUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 2_048) return null
  try {
    const url = new URL(trimmed)
    if (url.username || url.password) return null
    const hostname = url.hostname.toLowerCase()
    if (url.protocol === "https:" && HTTPS_STORE_HOSTS.has(hostname)) {
      return url.toString()
    }
    if (url.protocol === "itms-apps:" && HTTPS_STORE_HOSTS.has(hostname)) {
      return url.toString()
    }
    if (url.protocol === "market:" && hostname === "details") {
      return url.toString()
    }
    return null
  } catch {
    return null
  }
}

export function phoneUrl(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/gu, "")
  if (!/^\+?\d{7,15}$/u.test(compact)) return null
  return `tel:${compact}`
}
