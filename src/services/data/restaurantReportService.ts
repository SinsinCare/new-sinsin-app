import type * as ImagePicker from "expo-image-picker"
import { api } from "../core"
import {
  MAX_RESTAURANT_REPORT_PHOTOS,
  validateRestaurantReportDraft,
} from "@/src/features/restaurant/utils/restaurantReportValidation"

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

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
    throw new Error(
      `사진은 최대 ${MAX_RESTAURANT_REPORT_PHOTOS}장까지 첨부할 수 있어요.`,
    )
  }
  for (const photo of photos) {
    const mimeType = normalizeMimeType(photo)
    if (!ALLOWED_PHOTO_TYPES.has(mimeType)) {
      throw new Error("JPEG, PNG, WEBP 형식의 사진만 첨부할 수 있어요.")
    }
    if (photo.fileSize && photo.fileSize > MAX_PHOTO_BYTES) {
      throw new Error("사진은 한 장당 5MB 이하로 첨부해주세요.")
    }
  }
}

async function uploadPhoto(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
): Promise<string> {
  const formData = new FormData()
  formData.append("image", {
    uri: asset.uri,
    name: buildFileName(asset, index),
    type: normalizeMimeType(asset),
  } as unknown as Blob)

  const response = await api.post("/restaurant-reports/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return response.data.result.objectPath as string
}

export const restaurantReportService = {
  async submitReport({ draft, photos }: RestaurantReportSubmitInput) {
    const validation = validateRestaurantReportDraft({
      ...draft,
      photoCount: photos.length,
    })
    if (validation) throw new Error(validation)
    assertPhotoConstraints(photos)

    const photoObjectPaths = await Promise.all(
      photos.map((photo, index) => uploadPhoto(photo, index)),
    )

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
