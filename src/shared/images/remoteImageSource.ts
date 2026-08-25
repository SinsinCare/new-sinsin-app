/**
 * 원격 이미지 source 를 **안정 캐시 키**와 함께 만든다.
 *
 * 서버가 주는 사진 URL 은 전부 GCS **서명 URL** 이라 쿼리(서명·만료)가 15분마다 돈다
 * (`sinsin-be-bun/src/storage/gcs.ts` — 재사용 창이 만료 60분의 1/4). expo-image 는
 * 기본으로 URL 전체를 캐시 키로 쓰므로, 아무것도 안 하면 **모든 사진의 디스크 캐시가
 * 15분마다 전량 미스**가 된다 — 피드를 다시 열 때마다 같은 사진을 다시 내려받는 이유.
 *
 * 경로(쿼리 제거)를 키로 쓰면 서명이 돌아도 같은 객체는 같은 키다. 객체 경로는
 * 업로드마다 고유해서(타임스탬프+무작위) 한 번 올라간 사진은 절대 안 바뀐다 —
 * 그래서 이 키는 신선도를 해치지 않는다.
 *
 * http(s) 가 아닌 uri(file:·data:·ph: — 갤러리 픽커 미리보기)는 키를 만들지 않는다:
 * 원격 캐시의 문제가 없고, data: 는 키 자체가 수 MB 가 된다.
 *
 * 레시피 목록의 `stablePhotoCacheKey`(recipeCardFormat.ts)와 같은 규칙이다 —
 * 거기서 실측으로 확립된 처방을 앱 전역으로 넓힌 것.
 */
export function stableImageCacheKey(uri: string): string | undefined {
  if (!uri.startsWith("http://") && !uri.startsWith("https://")) return undefined
  const queryStart = uri.indexOf("?")
  return queryStart === -1 ? uri : uri.slice(0, queryStart)
}

/** `<Image source={remoteImageSource(url)}>` 로 그대로 꽂는 모양. */
export function remoteImageSource(uri: string): { uri: string; cacheKey?: string } {
  const cacheKey = stableImageCacheKey(uri)
  return cacheKey === undefined ? { uri } : { uri, cacheKey }
}
