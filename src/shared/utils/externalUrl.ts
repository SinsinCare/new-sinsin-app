const SCHEME_LESS_WEB_HOST =
  /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/iu
const HTTPS_STORE_HOSTS = new Set([
  "apps.apple.com",
  "itunes.apple.com",
  "play.google.com",
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
