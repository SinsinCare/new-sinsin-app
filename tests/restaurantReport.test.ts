import {
  MAX_RESTAURANT_REPORT_PHOTOS,
  validateRestaurantReportDraft,
} from "../src/features/restaurant/utils/restaurantReportValidation"

const validDraft = {
  name: "초록김밥",
  address: "서울시 강남구",
  category: "한식",
  recommendedMenu: "저염 김밥",
  reason: "간이 세지 않고 채소가 많아요.",
  photoCount: 0,
}

describe("restaurant report validation", () => {
  it("accepts the required fields with no photos", () => {
    expect(validateRestaurantReportDraft(validDraft)).toBeNull()
  })

  it("requires the restaurant name", () => {
    expect(
      validateRestaurantReportDraft({
        ...validDraft,
        name: " ",
      }),
    ).toContain("식당 이름")
  })

  it("allows a blank optional address", () => {
    expect(
      validateRestaurantReportDraft({
        ...validDraft,
        address: "",
      }),
    ).toBeNull()
  })

  it("limits optional photos to three", () => {
    expect(
      validateRestaurantReportDraft({
        ...validDraft,
        photoCount: MAX_RESTAURANT_REPORT_PHOTOS + 1,
      }),
    ).toContain("사진")
  })
})
