import type * as ImagePicker from "expo-image-picker"
import { api, ApiError, authenticatedFetch } from "../core"
import {
  MAX_RESTAURANT_REPORT_PHOTOS,
  validateRestaurantReportDraft,
} from "@/src/features/restaurant/utils/restaurantReportValidation"
import { prepareImageUpload } from "@/src/shared/utils/preparedImageUpload"
import { getBackendUrl } from "@/src/config/appConfig"

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_UPLOAD_CONCURRENCY = 2

export interface RestaurantReportDraft {
  name: string
  address: string
  category: string
  recommendedMenu: string
  reason: string
  externalLink?: string
}

export interface RestaurantReportSubmitInput {
  draft: RestaurantReportDraft
  photos: ImagePicker.ImagePickerAsset[]
}

function normalizeMimeType(asset: ImagePicker.ImagePickerAsset): string {
  const mimeType = asset.mimeType?.toLowerCase()
  if (mimeType && ALLOWED_PHOTO_TYPES.has(mimeType)) return mimeType
  if (asset.uri.toLowerCase().endsWith(".png")) return "image/png"
  if (asset.uri.toLowerCase().endsWith(".webp")) return "image/webp"
  return "image/jpeg"
}

function buildFileName(asset: ImagePicker.ImagePickerAsset, index: number) {
  if (asset.fileName) return asset.fileName
  const extension = normalizeMimeType(asset).split("/")[1] ?? "jpg"
  return `restaurant-report-${index + 1}.${extension}`
}

function assertPhotoConstraints(photos: ImagePicker.ImagePickerAsset[]) {
  if (photos.length > MAX_RESTAURANT_REPORT_PHOTOS) {
    throw new Error("TOO_MANY_RESTAURANT_REPORT_PHOTOS")
  }
  for (const photo of photos) {
    const mimeType = normalizeMimeType(photo)
    if (!ALLOWED_PHOTO_TYPES.has(mimeType)) {
      throw new Error("UNSUPPORTED_RESTAURANT_REPORT_PHOTO_TYPE")
    }
    if (photo.fileSize && photo.fileSize > MAX_PHOTO_BYTES) {
      throw new Error("RESTAURANT_REPORT_PHOTO_TOO_LARGE")
    }
  }
}

async function uploadPhoto(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
): Promise<string> {
  const prepared = await prepareImageUpload(asset.uri, {
    width: 1600,
    compress: 0.78,
    cachePrefix: "restaurant_report_tmp",
  })
  try {
    const originalName = buildFileName(asset, index)
    const uploadName = /\.[^.]+$/u.test(originalName)
      ? originalName.replace(/\.[^.]+$/u, ".jpg")
      : `${originalName}.jpg`
    const response = await authenticatedFetch(
      `${getBackendUrl()}/restaurant-reports/photo`,
      () => {
        const retryFormData = new FormData()
        retryFormData.append("image", {
          uri: prepared.uri,
          name: uploadName,
          type: "image/jpeg",
        } as unknown as Blob)
        return {
          method: "POST",
          headers: { Accept: "application/json" },
          body: retryFormData as unknown as RequestInit["body"],
        }
      },
      { timeoutMs: 60_000 },
    )
    const json = (await response.json()) as {
      isSuccess?: boolean
      code?: string
      message?: string
      result?: { objectPath?: string }
    }
    const objectPath = json.result?.objectPath
    if (!response.ok || json.isSuccess === false || !objectPath) {
      throw new ApiError(
        json.message ?? "",
        json.code || `HTTP_${response.status}`,
        response.status,
      )
    }
    return objectPath
  } finally {
    await prepared.cleanup()
  }
}

async function uploadPhotosBounded(
  photos: ImagePicker.ImagePickerAsset[],
): Promise<string[]> {
  const objectPaths = new Array<string>(photos.length)
  let nextIndex = 0
  let firstError: unknown

  const worker = async () => {
    while (firstError === undefined) {
      const index = nextIndex
      nextIndex += 1
      if (index >= photos.length) return

      try {
        objectPaths[index] = await uploadPhoto(photos[index], index)
      } catch (error) {
        firstError = error
      }
    }
  }

  const workerCount = Math.min(PHOTO_UPLOAD_CONCURRENCY, photos.length)
  await Promise.all(Array.from({ length: workerCount }, worker))
  if (firstError !== undefined) throw firstError
  return objectPaths
}

export const restaurantReportService = {
  async submitReport({ draft, photos }: RestaurantReportSubmitInput) {
    const validation = validateRestaurantReportDraft({
      ...draft,
      photoCount: photos.length,
    })
    if (validation) throw new Error(validation)
    assertPhotoConstraints(photos)

    // 두 작업만 동시에 prepare→upload→cleanup 하여 native image buffer를 제한하면서
    // 완전 순차 처리의 지연은 피한다. 결과 배열은 사용자가 고른 순서를 보존한다.
    const photoObjectPaths = await uploadPhotosBounded(photos)

    const response = await api.post("/restaurant-reports", {
      name: draft.name.trim(),
      address: draft.address.trim(),
      category: draft.category.trim(),
      recommendedMenu: draft.recommendedMenu.trim(),
      reason: draft.reason.trim(),
      externalLink: draft.externalLink?.trim() || null,
      photoObjectPaths,
    })
    return response.data.result.report
  },
}
