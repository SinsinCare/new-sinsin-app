/**
 * 1:1 문의 전송.
 *
 * ## 왜 경로가 둘인가
 *
 * 서버 계약이 둘이다. 사진이 없으면 JSON(`POST /user/inquiries`), 있으면
 * 멀티파트(`POST /user/inquiries/with-attachments`) — 후자는 `parse: "none"` 라우트라
 * JSON 을 받지 않고, 전자는 사진 파트를 모른다. 하나로 합쳐 항상 멀티파트로 보내면
 * 사진 없는 문의(대부분)까지 본문 상한 검사를 다르게 타게 되므로 그대로 둔다.
 *
 * ## 사진은 **한 요청에 전부** 간다
 *
 * 식당 제보(`restaurantReportService`)는 사진을 한 장씩 먼저 올리고 경로만 본문에 싣지만,
 * 문의는 서버가 한 요청 안에서 업로드와 행 생성을 함께 한다 — 업로드가 중간에 실패하면
 * 서버가 올린 객체를 지우고 문의를 만들지 않는다(`domains/user/routes.ts`). 그래서
 * "사진 3장 중 2장만 붙은 문의" 가 남지 않는다.
 *
 * ## 보내기 전에 줄인다
 *
 * 한 요청의 본문 상한이 10MB 다(서버 `MAX_MULTIPART_BYTES`). 요즘 폰 사진은 장당 4–8MB 라
 * 두 장이면 넘긴다. 1600px·JPEG 로 줄여 보낸다 — 접수자가 화면을 알아보는 데 충분하고,
 * 5장을 붙여도 상한 근처에 가지 않는다.
 */

import type * as ImagePicker from "expo-image-picker"

import { getBackendUrl } from "@/src/config/appConfig"
import { prepareImageUpload } from "@/src/shared/utils/preparedImageUpload"
import { api } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"
import { authenticatedFetch } from "@/src/services/core/authenticatedFetch"

/** 서버 `MAX_INQUIRY_ATTACHMENTS`. 여기서 임의로 올리면 서버가 400 으로 자른다. */
export const MAX_INQUIRY_PHOTOS = 5

const UPLOAD_TIMEOUT_MS = 60_000

export interface SubmitInquiryInput {
  subject: string
  content: string
  photos: readonly ImagePicker.ImagePickerAsset[]
}

export interface SubmitInquiryResult {
  inquiryId: number
  status: string
  attachmentCount: number
}

export async function submitInquiry({
  subject,
  content,
  photos,
}: SubmitInquiryInput): Promise<SubmitInquiryResult> {
  if (photos.length === 0) {
    const response = await api.post("/user/inquiries", { subject, content })
    return response.data.result as SubmitInquiryResult
  }
  if (photos.length > MAX_INQUIRY_PHOTOS) {
    throw new Error("TOO_MANY_INQUIRY_PHOTOS")
  }

  /*
    한 장씩 순서대로 줄인다. 동시에 하면 네이티브 이미지 버퍼가 장수만큼 동시에 뜬다 —
    5장이면 저사양 기기에서 그대로 메모리 압박이다.
  */
  const prepared: { uri: string; cleanup: () => Promise<void> }[] = []
  try {
    for (const photo of photos) {
      prepared.push(
        await prepareImageUpload(photo.uri, {
          width: 1600,
          compress: 0.78,
          cachePrefix: "inquiry_tmp",
        }),
      )
    }

    // `authenticatedFetch` 는 토큰 갱신 후 재시도할 수 있다. FormData 는 한 번 소비되면
    // 다시 쓸 수 없으므로 **매 시도마다 새로 만든다**(식당 제보와 같은 이유).
    const response = await authenticatedFetch(
      `${getBackendUrl()}/user/inquiries/with-attachments`,
      () => {
        const form = new FormData()
        form.append("subject", subject)
        form.append("content", content)
        prepared.forEach((file, index) => {
          form.append("images", {
            uri: file.uri,
            name: `inquiry_${index + 1}.jpg`,
            type: "image/jpeg",
          } as unknown as Blob)
        })
        return {
          method: "POST",
          headers: { Accept: "application/json" },
          body: form as unknown as RequestInit["body"],
        }
      },
      { timeoutMs: UPLOAD_TIMEOUT_MS },
    )

    const json = (await response.json()) as {
      isSuccess?: boolean
      code?: string
      message?: string
      result?: SubmitInquiryResult
    }
    if (!response.ok || json.isSuccess === false || !json.result) {
      throw new ApiError(
        json.message ?? "",
        json.code || `HTTP_${response.status}`,
        response.status,
      )
    }
    return json.result
  } finally {
    // 줄인 복사본은 캐시에 남는다. 성공이든 실패든 치운다.
    await Promise.all(prepared.map((file) => file.cleanup()))
  }
}
