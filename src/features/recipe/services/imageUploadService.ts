/**
 * 사진 업로드 — 커뮤니티 글·스토리·후기가 모두 이 한 곳을 쓴다.
 *
 * ## 여기서 나가는 실패 문구가 전부 "인터넷 연결" 이었다
 *
 * 이 파일은 `axios` 가 아니라 맨 `fetch` 를 쓴다(FormData 를 그대로 보내야 해서).
 * 그래서 `apiClient` 의 오류 인터셉터를 타지 않고, 실패를 **직접** `ApiError` 로
 * 만들어 던진다. 그 자리에 문구가 하나 박혀 있었다.
 *
 * ```ts
 * throw new ApiError("사진을 올리지 못했어요. 인터넷 연결을 확인한 뒤 다시 올려 주세요.", …)
 * ```
 *
 * 이 엔드포인트가 실제로 내는 오류는 대부분 연결과 무관하다 — `FOOD_CAMERA_001`
 * (JPG·PNG 가 아님) · `002`(5MB 초과) · `006`(업로드 실패). 앞의 둘은 사용자가 **사진을
 * 바꾸면 바로 해결되는** 실패인데, 화면은 와이파이를 확인하라고 말한 뒤 같은 사진으로
 * 다시 올리게 했다. 5MB 짜리 사진은 몇 번을 눌러도 5MB 다.
 *
 * 그래서 여기서는 **판정을 하지 않는다.** 서버가 준 코드와 문구를 그대로 실어 보내고,
 * 무엇을 보여줄지는 `resolveError`(src/lib/errorMessage) 가 코드로 고른다.
 * 연결 문구는 **응답이 아예 오지 않았을 때**(아래 `isNetworkError: true`)만 나온다.
 */

import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as FileSystem from "expo-file-system/legacy"

import { getBackendUrl } from "@/src/config/appConfig"
import { getAppLanguage } from "@/src/i18n"
import { ApiError } from "@/src/services/core/apiError"
import { tokenService } from "@/src/services/core/tokenService"

type UploadContext = "community" | "recipe" | "profile" | "general"

export interface ImageUploadResult {
  objectPath: string
  imageUrl: string
  contentType: string
  size: number
}

type ImageUploadResponse = {
  isSuccess?: boolean
  code?: string
  message?: string
  result?: ImageUploadResult
}

async function prepareImage(uri: string): Promise<string> {
  try {
    let sourceUri = uri
    if (uri.startsWith("file://")) {
      const dest = `${FileSystem.cacheDirectory}upload_tmp_${Date.now()}.jpg`
      await FileSystem.copyAsync({ from: uri, to: dest })
      sourceUri = dest
    }

    const context = ImageManipulator.manipulate(sourceUri)
    context.resize({ width: 1280 })
    const image = await context.renderAsync()
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.72,
    })
    context.release()
    image.release()
    return result.uri
  } catch {
    return uri
  }
}

export const imageUploadService = {
  async uploadImage(
    imageUri: string,
    context: UploadContext,
  ): Promise<ImageUploadResult> {
    const uploadUri = await prepareImage(imageUri)
    const formData = new FormData()
    formData.append("context", context)
    formData.append("image", {
      uri: uploadUri,
      name: `${context}_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as unknown as Blob)

    const token = await tokenService.getAccessToken()
    let response: Response
    try {
      response = await fetch(`${getBackendUrl()}/uploads/images`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/json",
          "Accept-Language": getAppLanguage() === "en" ? "en-US" : "ko-KR",
        },
        body: formData as unknown as RequestInit["body"],
      })
    } catch (cause) {
      // 응답이 아예 오지 않았다 — 이 파일에서 연결을 언급해도 되는 유일한 자리다.
      // `isNetworkError` 를 세워 두면 문구는 `resolveError` 가 고른다.
      throw new ApiError(
        cause instanceof Error ? cause.message : String(cause),
        "NETWORK_ERROR",
        undefined,
        true,
      )
    }

    let json: ImageUploadResponse | null = null
    try {
      json = (await response.json()) as ImageUploadResponse
    } catch {
      // Non-JSON responses are handled by status below.
    }

    if (!response.ok || json?.isSuccess === false || !json?.result) {
      // 문구를 지어내지 않는다. 코드(`FOOD_CAMERA_002` 등)가 있으면 앱 카탈로그가,
      // 없으면 서버 문구가 이긴다 — 둘 다 없을 때만 상태코드로 말한다.
      throw new ApiError(
        json?.message ?? "",
        json?.code || `HTTP_${response.status}`,
        response.status,
      )
    }
    return json.result
  },
}
