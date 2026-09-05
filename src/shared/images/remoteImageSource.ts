/** Preserve image identity and transformations; only GCS authorization rotates. */
import { localImageUri } from "./localImageUri"

const GCS_AUTH_PARAMS = new Set([
  "googleaccessid",
  "expires",
  "signature",
  "x-goog-algorithm",
  "x-goog-credential",
  "x-goog-date",
  "x-goog-expires",
  "x-goog-signedheaders",
  "x-goog-signature",
])

export function stableImageCacheKey(uri: string): string | undefined {
  if (!uri.startsWith("http://") && !uri.startsWith("https://"))
    return undefined
  let identity = uri
  try {
    const url = new URL(uri)
    const isGcs =
      url.hostname === "storage.googleapis.com" ||
      url.hostname.endsWith(".storage.googleapis.com")
    if (isGcs) {
      // Keep generation, crop and other content parameters even on signed URLs.
      const entries = Array.from(url.searchParams.entries()).filter(
        ([key]) => !GCS_AUTH_PARAMS.has(key.toLowerCase()),
      )
      url.search = ""
      for (const [key, value] of entries) url.searchParams.append(key, value)
      identity = url.toString()
    }
  } catch {
    // A malformed remote URI still must not collapse into another photo's key.
  }
  // Do not reuse files cached under the old, query-blind identity.
  return `image:v2:${identity}`
}

/** `<Image source={remoteImageSource(url)}>` 로 그대로 꽂는 모양. */
export function remoteImageSource(uri: string): {
  uri: string
  cacheKey?: string
} {
  uri = localImageUri(
    uri,
    process.env.EXPO_PUBLIC_BACKEND_URL,
    typeof __DEV__ !== "undefined" && __DEV__,
  )
  const cacheKey = stableImageCacheKey(uri)
  return cacheKey === undefined ? { uri } : { uri, cacheKey }
}
