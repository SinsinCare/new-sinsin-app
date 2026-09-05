/**
 * 스톡 사진 판정.
 *
 * dev DB 실측: 사진 2,072행 + image_urls 376행 + 메뉴 2,013행의 **고유 URL 이 10개**다.
 * 그래서 서로 다른 가게가 같은 순대국 사진을 단다. 사진은 카드에서 `제한`·`나트륨 기준`
 * 배지 바로 위에 있어 "이 집 음식이 이렇게 나온다" 로 읽힌다.
 */
import {
  isStockPhotoUrl,
  realPhotoUrls,
} from "../src/features/restaurant/utils/stockPhoto"

const STOCK =
  "https://sinsin-test-be-ummry5dxda-du.a.run.app/static/food/food_05.jpg"
const REAL =
  "https://storage.googleapis.com/sinsin/uploads/restaurant/912/a1b2.jpg"

describe("stockPhoto", () => {
  it("시드 스톡을 알아본다", () => {
    expect(isStockPhotoUrl(STOCK)).toBe(true)
  })

  it("업로드된 실사진은 스톡이 아니다", () => {
    expect(isStockPhotoUrl(REAL)).toBe(false)
  })

  it("실사진만 남기고 순서를 지킨다", () => {
    expect(realPhotoUrls([STOCK, REAL, STOCK])).toEqual([REAL])
  })

  it("전부 스톡이면 빈 배열 — 호출부가 대체 표시를 고른다", () => {
    expect(realPhotoUrls([STOCK, STOCK])).toEqual([])
  })

  it("중복 URL과 빈 URL을 제거하고 실제 사진 순서를 보존한다", () => {
    const second = REAL + "?second"
    expect(realPhotoUrls([REAL, "", STOCK, REAL, second])).toEqual([
      REAL,
      second,
    ])
  })

  it("빈 목록도 그대로 빈 목록", () => {
    expect(realPhotoUrls([])).toEqual([])
  })
})
