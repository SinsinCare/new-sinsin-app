export const MAX_RESTAURANT_REPORT_PHOTOS = 3

export interface RestaurantReportValidationDraft {
  name: string
  address: string
  category: string
  recommendedMenu: string
  reason: string
  photoCount: number
}

export type RestaurantReportValidationError =
  | "nameRequired"
  | "categoryRequired"
  | "tooManyPhotos"

export function validateRestaurantReportDraft(
  draft: RestaurantReportValidationDraft,
): RestaurantReportValidationError | null {
  if (!draft.name.trim()) return "nameRequired"
  if (!draft.category.trim()) return "categoryRequired"
  if (draft.photoCount > MAX_RESTAURANT_REPORT_PHOTOS) {
    return "tooManyPhotos"
  }
  return null
}
