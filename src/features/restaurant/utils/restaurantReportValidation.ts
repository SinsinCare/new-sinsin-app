export const MAX_RESTAURANT_REPORT_PHOTOS = 3

export interface RestaurantReportValidationDraft {
  name: string
  address: string
  category: string
  recommendedMenu: string
  reason: string
  photoCount: number
}

export function validateRestaurantReportDraft(
  draft: RestaurantReportValidationDraft,
): string | null {
  if (!draft.name.trim()) return "식당 이름을 입력해주세요."
  if (!draft.category.trim()) return "음식 종류를 입력해주세요."
  if (draft.photoCount > MAX_RESTAURANT_REPORT_PHOTOS) {
    return `사진은 최대 ${MAX_RESTAURANT_REPORT_PHOTOS}장까지 첨부할 수 있어요.`
  }
  return null
}
