/**
 * 시드 스톡 사진 판정.
 *
 * 실측(2026-07-31, dev DB): `restaurant.image_urls` 376행 · `restaurant_photo` 2,072행 ·
 * `restaurant_menu.image_url` 2,013행이 전부 채워져 있지만 **고유 URL 은 10개**다.
 * 전부 `.../static/food/food_0X.jpg` 형태의 시드 스톡이고, 그래서 목록에서 서로 다른
 * 가게 셋이 **같은 순대국 사진**을 달고 나온다.
 *
 * 이건 미관 문제가 아니다. 사진은 카드에서 `제한`·`나트륨 기준` 배지 바로 위에 있고,
 * 사용자는 그 사진을 "이 집 음식이 이렇게 나온다" 로 읽는다. 레시피 쪽은 이미 같은 이유로
 * 스톡을 금지했고(`RecipeCategoryArt` 머리말), 그 근거 문장이 하필 이 데이터를 반례로
 * 인용한다 — "restaurant_menu 는 사진 10장을 2,013행에 돌려 쓴다".
 *
 * ponytail: 판정은 경로 한 조각이다. 실사진이 들어오면 이 파일을 지우면 된다
 * (판정이 틀려도 스톡을 한 장 더 보여줄 뿐, 실사진을 가리지 않는다).
 */

/** 시드 스톡이 사는 곳. 백엔드 static 경로이고 실사진은 업로드 스토리지로 온다. */
const STOCK_PATH = "/static/food/"

export function isStockPhotoUrl(url: string): boolean {
  return url.includes(STOCK_PATH)
}

/** 실사진만 남긴다. 하나도 없으면 빈 배열 — 호출부가 대체 표시를 고른다. */
export function realPhotoUrls(urls: readonly string[]): string[] {
  return urls.filter((url) => !isStockPhotoUrl(url))
}
