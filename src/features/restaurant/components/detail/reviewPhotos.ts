/**
 * 후기의 사진 URL 배열을 사진 뷰어가 읽는 `PhotoDto` 로 감싼다.
 *
 * ## 왜 변환이 필요한가
 *
 * 후기 카드의 사진은 `/photos` 목록과 **다른 배열**이다. 후기 안에서의 순번(0,1,2)을
 * 사진 목록의 인덱스로 그대로 넘기면 뷰어가 전혀 다른 사진에서 열린다. 그래서
 * 그 후기의 사진만으로 된 배열을 만들어 넘기고, 뷰어는 그 안에서만 좌우로 넘어간다.
 *
 * `photoId` 는 대응하는 서버 행이 없어 후기 id 로 합성한다. 뷰어에서 React key 로만
 * 쓰이고 서버로 되돌아가지 않으므로 한 후기 안에서 겹치지 않으면 충분하다.
 * (`* 100` 은 한 후기의 사진이 100장을 넘지 않는다는 가정이고, 실제 상한은 5장이다.)
 */

import type { PhotoDto, ReviewDto } from "../../types"

export function reviewPhotos(review: ReviewDto): PhotoDto[] {
  return review.imageUrls.map((url, index) => ({
    photoId: review.reviewId * 100 + index,
    url,
    category: "REVIEW",
    isVideo: false,
    sortOrder: index,
    // 뷰어는 이 id 로 후기를 되찾아 작성자·방문 회차·키워드·날짜를 그린다.
    // 작성자를 사진에 복사해 넣지 않는다 — 서버 사진 항목에도 그 필드가 없고,
    // 두 곳에 두면 후기 쪽이 갱신될 때 사진 쪽이 옛 값을 들고 남는다.
    sourceReviewId: review.reviewId,
    sourceMenuId: null,
    // 후기 응답은 사진을 URL 문자열로만 준다 — 치수를 **모른다**. 1:1 로 가정하지 않고
    // `null` 로 둔다(뷰어는 `contain` 이라 비율을 몰라도 정확히 그린다).
    width: null,
    height: null,
  }))
}
