const ALLOWED_SCHEMES = new Set(["http:", "https:", "sinsin:"])
const WEB_HOST_WITHOUT_SCHEME =
  /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i

export function normalizeAnnouncementLink(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const candidate = WEB_HOST_WITHOUT_SCHEME.test(trimmed)
    ? `https://${trimmed}`
    : trimmed

  try {
    const url = new URL(candidate)
    if (!ALLOWED_SCHEMES.has(url.protocol)) return null
    if ((url.protocol === "http:" || url.protocol === "https:") && !url.host) {
      return null
    }
    if (url.protocol === "sinsin:" && !url.host && !url.pathname) return null
    return url.toString()
  } catch {
    return null
  }
}
