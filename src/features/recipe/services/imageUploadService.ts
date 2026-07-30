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
    const response = await fetch(`${getBackendUrl()}/uploads/images`, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
        "Accept-Language": getAppLanguage() === "en" ? "en-US" : "ko-KR",
      },
      body: formData as unknown as RequestInit["body"],
    })

    let json: ImageUploadResponse | null = null
    try {
      json = (await response.json()) as ImageUploadResponse
    } catch {
      // Non-JSON responses are handled by status below.
    }

    if (!response.ok || json?.isSuccess === false || !json?.result) {
      throw new ApiError(
        getAppLanguage() === "en"
          ? "We couldn’t upload the photo. Check your connection and try again."
          : "사진을 올리지 못했어요. 인터넷 연결을 확인한 뒤 다시 올려 주세요.",
        json?.code || `HTTP_${response.status}`,
        response.status,
      )
    }
    return json.result
  },
}
