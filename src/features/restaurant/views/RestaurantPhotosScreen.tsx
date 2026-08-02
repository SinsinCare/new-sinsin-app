/**
 * 사진 뷰어 route 의 데이터 컨테이너.
 *
 * `RestaurantPhotoViewerScreen` 은 **사진 배열을 주면 그리는** 순수 화면이다(props 로만
 * 산다). route 파일은 API 를 부르지 않는 것이 이 저장소의 규칙(`docs/mobile-frontend-architecture.md`)
 * 이므로, 파라미터를 사진 배열로 바꾸는 일을 여기서 한다.
 *
 * ## 왜 사진 집합을 파라미터로 받는가
 *
 * 상세 화면의 `onOpenPhotos(photos, index)` 는 **호출 지점마다 다른 배열**을 넘긴다:
 * 히어로 캐러셀은 `detail.imageUrls`, 사진 탭은 `/photos` 목록, 후기 카드는 **그 후기의
 * 사진만** 이다(`reviewPhotos()` 의 헤더가 그 이유를 적어 두었다 — 후기 안의 순번을
 * 전체 사진 목록의 인덱스로 넘기면 전혀 다른 사진이 열린다).
 *
 * 즉 `restaurantId + index` 만으로는 집합을 복원할 수 없다. 그래서 호출부가 집합을
 * 직렬화해 넘기고(`app/consult.tsx` 의 `foodConsultContext` 와 같은 방식), 이 컨테이너가
 * 파싱한다.
 *
 * ## 파싱이 실패해도 화면은 뜬다
 *
 * 딥링크(`sinsin://restaurant/42/photos`)로 들어오면 파라미터가 아예 없고, 앱 버전이
 * 바뀌면 옛 형식이 올 수도 있다. 그때 빈 화면을 보여 주는 대신 **그 식당의 전체 사진을
 * 직접 받아** 0번부터 연다. 던지지 않는 이유: 사진 한 장 열려던 사용자에게 크래시는
 * 과한 대가다.
 */

import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { PhotoDto } from "../types"
import { useRestaurantDetail } from "../hooks/useRestaurantDetail"
import { useRestaurantPhotos } from "../hooks/useRestaurantPhotos"
import { useRestaurantReviews } from "../hooks/useRestaurantReviews"
import { RestaurantPhotoViewerScreen } from "./RestaurantPhotoViewerScreen"

export interface RestaurantPhotosScreenProps {
  restaurantId: number | null
  /** 직렬화된 `PhotoDto[]`. 없거나 깨졌으면 전체 사진을 받아 온다. */
  serializedPhotos?: string
  initialIndex?: number
  onClose: () => void
  onPressAuthor?: (reviewerId: number) => void
}

export function RestaurantPhotosScreen({
  restaurantId,
  serializedPhotos,
  initialIndex = 0,
  onClose,
  onPressAuthor,
}: RestaurantPhotosScreenProps) {
  const { t } = useTranslation("common")

  const handoff = useMemo(
    () => parsePhotoHandoff(serializedPhotos),
    [serializedPhotos],
  )

  // 넘겨받은 집합이 있으면 목록 질의는 필요 없다. 같은 사진을 두 번 받지 않는다.
  const fetched = useRestaurantPhotos(
    handoff === null ? restaurantId : null,
    "ALL",
  )
  const detail = useRestaurantDetail(restaurantId)
  // 태그칩(`4번째 방문`·`😋 맛`)은 `sourceReviewId` 로 후기를 찾아 그린다. 첫 페이지만
  // 있으면 최근 후기의 사진은 대부분 맞고, 못 찾으면 뷰어가 날짜만 남긴다.
  const reviews = useRestaurantReviews({ restaurantId })

  const photos = handoff ?? fetched.photos

  return (
    <RestaurantPhotoViewerScreen
      restaurantName={
        detail.detail?.name ??
        detail.cardHint?.name ??
        t("restaurant.photo.title")
      }
      photos={photos}
      initialIndex={clampIndex(initialIndex, photos.length)}
      onClose={onClose}
      reviews={reviews.reviews}
      // 넘겨받은 집합은 그것이 전부다 — 더 받을 것이 없으므로 콜백을 주지 않는다.
      onLoadMore={handoff === null ? fetched.loadMore : undefined}
      /*
        총량. **넘겨받은 경로에서는 주지 않는다** — 그때는 배열이 곧 전부라 뷰어가
        `photos.length` 를 쓰는 것이 맞다. 질의 경로에서만 서버 총량을 준다. 이걸
        구분하지 않으면 30장을 들고 "1 / 50" 이라 쓰거나 그 반대가 된다.
      */
      totalCount={handoff === null ? fetched.totalCount : undefined}
      onPressAuthor={
        onPressAuthor
          ? (author) => {
              // 스크립트로 시드된 후기는 `user_id` 가 NULL 이라 `reviewerId` 가 없다.
              // 프로필 화면으로 갈 수 없는 작성자를 눌렀을 때는 조용히 아무 일도 하지
              // 않는다 — `/reviewer/null` 로 밀어 넣으면 404 를 사용자가 뒤집어쓴다.
              if (author.reviewerId !== null) onPressAuthor(author.reviewerId)
            }
          : undefined
      }
    />
  )
}

/**
 * 파라미터의 JSON 을 `PhotoDto[]` 로 되돌린다. **검증을 최소한만** 한다 —
 * `url` 이 문자열인 항목만 남기고, 나머지 필드는 없으면 뷰어가 견디는 기본값으로 채운다.
 * 엄격하게 거절하면 필드 하나가 추가된 다음 버전에서 사진이 안 열린다.
 */
function parsePhotoHandoff(raw: string | undefined): PhotoDto[] | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null

  const photos = parsed
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .filter((item) => typeof item.url === "string" && item.url.length > 0)
    .map((item, index) => toPhotoDto(item, index))

  return photos.length > 0 ? photos : null
}

function toPhotoDto(item: Record<string, unknown>, index: number): PhotoDto {
  return {
    // 서버 행이 없는 합성 사진(후기 사진)도 있으므로 id 가 없으면 순번으로 대신한다.
    // React key 로만 쓰이고 서버로 되돌아가지 않는다.
    photoId: typeof item.photoId === "number" ? item.photoId : -1 - index,
    url: item.url as string,
    category: (item.category as PhotoDto["category"]) ?? "REVIEW",
    isVideo: item.isVideo === true,
    sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
    // 뷰어의 작성자·태그 칩은 이 id 로 후기를 되찾아 그린다. 옛 형식(작성자를 사진에
    // 복사해 넣던 모양)이 들어와도 그 필드는 그냥 무시된다 — 이 함수가 허용적인 이유다.
    sourceReviewId:
      typeof item.sourceReviewId === "number" ? item.sourceReviewId : null,
    sourceMenuId:
      typeof item.sourceMenuId === "number" ? item.sourceMenuId : null,
    // 075. 치수는 넘어올 수도, 안 올 수도 있다(후기·대표사진은 원래 모른다).
    // 숫자가 아니면 `null` — 여기서 1:1 을 지어내면 뷰어가 잘못된 상자에 사진을 담는다.
    width: typeof item.width === "number" ? item.width : null,
    height: typeof item.height === "number" ? item.height : null,
  }
}

/** 목록이 줄어든 뒤 옛 인덱스로 들어와도 범위 밖을 열지 않는다. */
function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  if (!Number.isFinite(index) || index < 0) return 0
  return Math.min(index, length - 1)
}

/** 호출부가 사진 집합을 route 파라미터로 넘길 때 쓰는 직렬화. 파싱과 짝을 이룬다. */
export function serializePhotoHandoff(photos: readonly PhotoDto[]): string {
  return JSON.stringify(photos)
}
