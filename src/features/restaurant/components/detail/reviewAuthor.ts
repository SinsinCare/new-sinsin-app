/**
 * 후기의 평평한 작성자 필드 → 카드·뷰어가 읽는 한 덩어리.
 *
 * ## 왜 변환 한 겹을 두는가
 *
 * 서버는 작성자를 `authorName`/`authorProfileImageUrl`/`authorReviewCount`/
 * `authorFollowerCount`/`reviewerId` **다섯 개의 평평한 필드**로 준다. 이 값을 그리는 곳이
 * 셋(`ReviewCard`, `RestaurantPhotoViewerScreen`, 후기 사진 뷰어의 헤더)인데, 세 곳이
 * 각자 `review.authorName` 을 읽으면 "작성자" 라는 개념이 코드에 존재하지 않게 되고
 * 팔로워를 감추는 규칙 같은 것이 세 번 복사된다. 한 곳에서 모아 준다.
 *
 * 반대로 이걸 `types/index.ts` 의 `ReviewDto` 에 중첩 객체로 선언하지는 **않는다** —
 * 그게 정확히 이 기능을 못 쓰게 만들었던 거짓말이다(응답에 `author` 키가 없는데
 * `review.author.reviewerId` 를 읽어 후기 탭이 죽었다). 선(wire)은 평평하고,
 * 화면 모양은 여기서 만든다.
 */

import type { ReviewDto } from "../../types"

/** 화면이 읽는 작성자. `ReviewerProfileDto`(E13 응답)와 **다른 물건**이다. */
export interface ReviewAuthorView {
  /** 프로필 화면으로 갈 수 있는 id. 오늘은 전 행이 `null` 이라 이름이 눌리지 않는다. */
  reviewerId: number | null
  name: string
  avatarUrl: string | null
  reviewCount: number
  /**
   * 팔로우 표가 없어 서버가 `null` 로 준다. 화면은 이때 팔로워 칸을 **빼고**
   * `후기 20` 만 그린다 — `팔로워 0` 은 "아무도 안 따른다" 를 없는 데이터로 주장한다.
   */
  followerCount: number | null
}

export function reviewAuthorOf(review: ReviewDto): ReviewAuthorView {
  return {
    reviewerId: review.reviewerId,
    name: review.authorName,
    avatarUrl: review.authorProfileImageUrl,
    reviewCount: review.authorReviewCount,
    followerCount: review.authorFollowerCount,
  }
}
