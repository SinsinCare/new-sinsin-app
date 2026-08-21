/**
 * 후기 정렬 시트 (목업 -33). `최신순 / 별점순 / 재방문순` + `다음`.
 *
 * ## 왜 `SortSheet` 와 따로인가
 *
 * 목록 정렬(`SortOption` 6종)과 후기 정렬(`ReviewSortOption` 3종)은 **다른 열거형**이고
 * 서버 파라미터도 다르다. 한 컴포넌트에 제네릭으로 합치면 잘못된 값이 잘못된 엔드포인트로
 * 갈 수 있는 통로가 열린다. 시트 껍데기는 `V2BottomSheet` 로 공유하고 값 축만 분리한다.
 *
 * ## 열 때마다 현재 값을 다시 심는다
 *
 * `useState(current)` 초기값만 믿으면 두 번째로 열었을 때 **첫 번째 선택이 남는다**.
 * 프로토타입의 두 필터 시트가 정확히 그 버그였다(Modal 이 마운트된 채 남아 initializer 가
 * 다시 돌지 않는다). `visible` 이 켜질 때 동기화한다.
 *
 * ## `다음` 을 눌러야 확정된다
 *
 * 행을 누르는 즉시 적용하지 않는다 — 목업에 CTA 가 있고, 즉시 적용은 시트가 열린 채
 * 뒤 목록이 다시 불러와지는 것을 사용자가 못 본다.
 */

import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { V2BottomSheet, V2Option, spacing } from "@/src/design-system-v2"

import type { ReviewSortOption } from "../types"
import { REVIEW_SORT_OPTIONS } from "../data/filterCatalog"
import { dynamicKey } from "@/src/i18n/dynamicKey"

export interface ReviewSortSheetProps {
  visible: boolean
  onClose: () => void
  value: ReviewSortOption
  onConfirm: (value: ReviewSortOption) => void
}

export function ReviewSortSheet({
  visible,
  onClose,
  value,
  onConfirm,
}: ReviewSortSheetProps) {
  const { t } = useTranslation("common")
  const [pending, setPending] = useState<ReviewSortOption>(value)

  useEffect(() => {
    if (visible) setPending(value)
  }, [visible, value])

  return (
    <V2BottomSheet
      surface="restaurant_review_sort"
      visible={visible}
      onClose={onClose}
      title={t("restaurant.sort.title")}
      primaryLabel={t("restaurant.sort.next")}
      onPrimary={() => onConfirm(pending)}
    >
      <View style={styles.list}>
        {REVIEW_SORT_OPTIONS.map((option) => (
          <V2Option
            key={option.value}
            selected={pending === option.value}
            label={t(dynamicKey(option.labelKey))}
            onPress={() => setPending(option.value)}
          />
        ))}
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing[8], paddingVertical: spacing[8] },
})
