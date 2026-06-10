import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as FileSystem from "expo-file-system/legacy"

import { getBackendUrl } from "@/src/config/appConfig"
import { ApiError } from "@/src/services/core/apiError"
import { tokenService } from "@/src/services/core/tokenService"

type UploadContext = "community" | "recipe" | "profile" | "general"

export interface ImageUploadResult {
  objectPath: string
  imageUrl: string
  contentType: string
  size: number
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
      },
      body: formData,
    })

    let json: {
      isSuccess?: boolean
      code?: string
      message?: string
      result?: ImageUploadResult
    } | null = null
    try {
      json = await response.json()
    } catch {
      // Non-JSON responses are handled by status below.
    }

    if (!response.ok || json?.isSuccess === false || !json?.result) {
      throw new ApiError(
        json?.message ||
          `이미지 업로드에 실패했습니다. HTTP ${response.status}`,
        json?.code || `HTTP_${response.status}`,
        response.status,
      )
    }
    return json.result
  },
}
