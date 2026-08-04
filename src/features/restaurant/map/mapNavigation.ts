export function mapOriginWhitelist(baseUrl: string): string[] {
  try {
    const base = new URL(baseUrl)
    if (
      base.protocol !== "https:" ||
      !base.hostname ||
      base.username ||
      base.password
    ) {
      return ["about:*"]
    }
    return [`${base.origin}/*`, "about:*"]
  } catch {
    return ["about:*"]
  }
}

/** WebView의 브릿지 권한을 가진 최상위 문서는 지정한 HTTPS 지도 경로에만 둡니다. */
export function isAllowedMapNavigation(
  targetUrl: string,
  baseUrl: string,
): boolean {
  if (targetUrl === "about:blank") return true
  try {
    const target = new URL(targetUrl)
    const base = new URL(baseUrl)
    const basePath = base.pathname.replace(/\/+$/u, "")
    return (
      base.protocol === "https:" &&
      target.protocol === "https:" &&
      target.origin === base.origin &&
      !target.username &&
      !target.password &&
      (target.pathname === basePath ||
        target.pathname.startsWith(`${basePath}/`))
    )
  } catch {
    return false
  }
}
