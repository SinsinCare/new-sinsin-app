/**
 * 후기 작성 route 의 데이터 컨테이너.
 *
 * `ReviewWriteScreen` 은 `restaurantName` 을 **필수**로 받는다 — 목업 -26 의 타이틀이
 * `신신국밥` + `후기를 남겨주세요!` 두 줄이고, 상호명이 브랜드 색으로 들어간다. 이름 없이
 * 열면 타이틀 한 줄이 비어 그 화면이 무엇에 대한 후기인지 알 수 없다.
 *
 * 그래서 상세 화면이 이미 알고 있는 이름을 파라미터로 넘기고, 딥링크처럼 이름이 없는
 * 경로로 들어온 경우에만 `useRestaurantDetail` 로 채운다. 이름을 기다리는 동안 폼을
 * 열어 두면 사용자가 별점을 다 고른 뒤에 타이틀이 바뀌므로, **이름이 정해질 때까지는
 * 로딩**을 보여 준다.
 */

import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2ErrorState,
  V2Skeleton,
  V2SkeletonGroup,
  spacing,
} from "@/src/design-system-v2"

import type { ReviewDto } from "../types"
import { useRestaurantDetail } from "../hooks/useRestaurantDetail"
import { ReviewWriteScreen } from "./ReviewWriteScreen"

export interface RestaurantReviewWriteScreenProps {
  restaurantId: number | null
  /** 상세 화면에서 넘어올 때는 이미 알고 있다. 딥링크면 비어 있다. */
  restaurantName?: string
  onClose: () => void
  onSubmitted?: (review: ReviewDto) => void
}

export function RestaurantReviewWriteScreen({
  restaurantId,
  restaurantName,
  onClose,
  onSubmitted,
}: RestaurantReviewWriteScreenProps) {
  const { t } = useTranslation("common")
  // 이름을 이미 받았으면 질의를 걸지 않는다 — 후기 작성에 상세 응답이 필요하지 않다.
  const shouldFetch = restaurantId !== null && !restaurantName
  const detail = useRestaurantDetail(shouldFetch ? restaurantId : null)

  const name = restaurantName ?? detail.detail?.name ?? detail.cardHint?.name

  if (restaurantId === null) {
    return (
      <V2ErrorState
        title={t("restaurant.notFound")}
        description={t("restaurant.error.detailBody")}
        retryLabel={t("action.back")}
        onRetry={onClose}
      />
    )
  }

  if (!name) {
    if (detail.isError) {
      return (
        <V2ErrorState
          title={t("restaurant.error.detailTitle")}
          description={t("restaurant.error.detailBody")}
          retryLabel={t("restaurant.error.detailRetry")}
          onRetry={detail.refetch}
        />
      )
    }
    // 곧 작성 폼이 들어오는 자리다. 별점 줄 · 본문 상자 · 사진 칸의 위치를 미리 잡는다.
    return (
      <V2SkeletonGroup style={writeSkeletonStyles.root}>
        <V2Skeleton width="52%" height={22} />
        <V2Skeleton width={168} height={32} radius="full" />
        <V2Skeleton height={132} radius="lg" />
        <View style={writeSkeletonStyles.photos}>
          {[0, 1, 2].map((index) => (
            <V2Skeleton key={index} width={72} height={72} radius="lg" />
          ))}
        </View>
      </V2SkeletonGroup>
    )
  }

  return (
    <ReviewWriteScreen
      restaurantId={restaurantId}
      restaurantName={name}
      onClose={onClose}
      onSubmitted={onSubmitted}
    />
  )
}

const writeSkeletonStyles = StyleSheet.create({
  root: { flex: 1, padding: spacing[20], gap: spacing[20] },
  photos: { flexDirection: "row", gap: spacing[8] },
})
