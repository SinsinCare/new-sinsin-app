import { stableImageCacheKey } from "../src/shared/images/remoteImageSource"

describe("remote image cache identity", () => {
  it("does not reuse one restaurant's proxy photo for another", () => {
    const proxy = "https://img.example.com/thumbnail?fname="
    expect(stableImageCacheKey(proxy + "restaurant-a.jpg")).not.toBe(
      stableImageCacheKey(proxy + "restaurant-b.jpg"),
    )
    expect(stableImageCacheKey(proxy + "restaurant-a.jpg")).toBe(
      stableImageCacheKey(proxy + "restaurant-a.jpg"),
    )
  })
  it("preserves transformations on non-GCS URLs", () => {
    const url = "https://cdn.example.com/photo.jpg"
    expect(stableImageCacheKey(url + "?crop=left")).not.toBe(
      stableImageCacheKey(url + "?crop=right"),
    )
    expect(stableImageCacheKey(url + "?id=1&Signature=a")).not.toBe(
      stableImageCacheKey(url + "?id=2&Signature=a"),
    )
  })
  it("reuses a GCS object across authorization rotation", () => {
    const url = "https://storage.googleapis.com/bucket/photo.jpg"
    expect(
      stableImageCacheKey(url + "?X-Goog-Date=one&X-Goog-Signature=a"),
    ).toBe(stableImageCacheKey(url + "?X-Goog-Date=two&X-Goog-Signature=b"))
    expect(
      stableImageCacheKey(url + "?GoogleAccessId=a&Expires=1&Signature=a"),
    ).toBe(stableImageCacheKey(url))
  })
  it("keeps GCS object generations and content parameters distinct", () => {
    const url = "https://bucket.storage.googleapis.com/photo.jpg"
    expect(
      stableImageCacheKey(url + "?generation=1&X-Goog-Signature=a"),
    ).not.toBe(stableImageCacheKey(url + "?generation=2&X-Goog-Signature=b"))
    expect(stableImageCacheKey(url + "?crop=left&Signature=a")).not.toBe(
      stableImageCacheKey(url + "?crop=right&Signature=a"),
    )
  })
  it("does not treat a lookalike hostname as GCS", () => {
    const url = "https://storage.googleapis.com.example.com/image"
    expect(stableImageCacheKey(url + "?Signature=a")).not.toBe(
      stableImageCacheKey(url + "?Signature=b"),
    )
  })
  it("avoids old query-blind keys and leaves local images uncached", () => {
    const remote = "https://cdn.example.com/photo.jpg"
    expect(stableImageCacheKey(remote)).not.toBe(remote)
    expect(stableImageCacheKey("file:///photo.jpg")).toBeUndefined()
    expect(stableImageCacheKey("data:image/png;base64,abc")).toBeUndefined()
  })
})
