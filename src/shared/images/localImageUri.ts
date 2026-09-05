/** Old local results may still contain the retired Python server's image origin. */
export function localImageUri(
  uri: string,
  backendUrl: string | undefined,
  development: boolean,
): string {
  if (!development || !backendUrl) return uri
  try {
    const image = new URL(uri)
    const backend = new URL(backendUrl)
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"])
    if (
      !loopback.has(image.hostname) ||
      !loopback.has(backend.hostname) ||
      !image.pathname.startsWith("/static/") ||
      image.protocol !== "http:" ||
      backend.protocol !== "http:"
    )
      return uri
    return `${backend.origin}${image.pathname}${image.search}`
  } catch {
    return uri
  }
}
