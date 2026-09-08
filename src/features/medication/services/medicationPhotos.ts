import { prepareImageUpload } from "@/src/shared/utils/preparedImageUpload"

/**
 * 알약 사진을 인식 업로드용으로 다듬는다 — 다른 업로더(식단·검사지·후기)와 같은 경로를
 * 탄다. 각인(글자)이 판독의 전부라 식단 사진(1024px)보다 큰 1600px 을 남기고 압축도 덜 한다.
 * 결과는 캐시 파일이며, 플로우 스토어가 사진을 버릴 때 함께 지운다.
 */
export const PILL_PHOTO_WIDTH = 1600
export const PILL_PHOTO_COMPRESS = 0.85
export async function preparePillPhoto(uri: string): Promise<{ uri: string }> {
  const prepared = await prepareImageUpload(uri, {
    width: PILL_PHOTO_WIDTH,
    compress: PILL_PHOTO_COMPRESS,
    cachePrefix: "pill_tmp",
  })
  return { uri: prepared.uri }
}
