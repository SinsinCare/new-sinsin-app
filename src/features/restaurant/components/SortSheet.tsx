/**
 * 정렬 바텀시트 (목업 -25). 6종 + CTA `다음`.
 *
 * ## 열릴 때 초안을 되맞춘다 (프로토타입 버그)
 *
 * 프로토타입의 정렬 시트는 `useState(current)` 로 초기화했다. Modal 은 닫혀도 마운트가
 * 남아 있으므로 초기화 함수는 **딱 한 번** 돈다 — 그래서 두 번째로 열면 지난번에 고르고
 * 취소한 값이 그대로 선택돼 있었다. `visible` 이 켜지는 순간 확정값을 다시 복사한다.
 *
 * ## `거리순` 은 위치가 없으면 고를 수 없다
 *
 * 좌표가 없으면 서버가 `distanceKm` 을 계산하지 못해 정렬이 무의미해진다. 칩을 감추지 않고
 * disabled 로 두고 이유를 적는다 — 목록에서 옵션이 사라지면 사용자는 기능이 없는 줄 안다.
 *
 * ## `V2Option` 을 쓰는 이유
 *
 * 목업의 선택 상태(연한 주황 면 + 주황 테두리, 글자색은 그대로)가 `V2Option` 의
 * `selected`(= Figma `state=pressed`)와 정확히 같다. 반경만 목업(12)에 맞춰 덮는다 —
 * DS 기본값 24 는 시트 폭 전체를 쓰는 행에서 너무 둥글다.
 */

import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  radius,
  spacing,
  V2BottomSheet,
  V2Option,
} from "@/src/design-system-v2"

import { SHEET_GUTTER } from "../layout"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import { SORT_OPTIONS } from "../data/filterCatalog"
import type { SortOption } from "../types"

export interface SortSheetProps {
  visible: boolean
  onClose: () => void
  /** 확정된 현재 정렬. 열릴 때마다 이 값으로 되맞춘다. */
  value: SortOption
  /** `다음` 을 눌렀을 때만 확정된다. 행을 누르는 것만으로는 질의가 나가지 않는다. */
  onSubmit: (sort: SortOption) => void
  /** 위치 권한이 없다. `거리순` 을 비활성한다. */
  distanceDisabled?: boolean
}

/** 목업의 옵션 행 높이(72). `controlHeight` 에 대응 값이 없어 리터럴 + 주석으로 둔다. */
const OPTION_HEIGHT = 72

/**
 * 옵션 목록이 차지할 수 있는 최대 높이의 비율. 시트의 고정부(핸들·제목·푸터)를 픽셀로
 * 빼는 대신 비율로 잡는 이유는 이 시트의 고정부가 항상 같은 모양이기 때문이다 —
 * 6행이 다 들어가는 화면에서는 스크롤이 생기지 않고, 작은 화면에서만 스크롤이 붙는다.
 */
const MAX_LIST_RATIO = 0.52

export function SortSheet({
  visible,
  onClose,
  value,
  onSubmit,
  distanceDisabled = false,
}: SortSheetProps) {
  const { t } = useTranslation("common")
  const { height: windowHeight } = useWindowDimensions()
  const [selected, setSelected] = useState<SortOption>(value)

  // 열릴 때마다 확정값을 다시 복사한다(위 헤더의 프로토타입 버그).
  useEffect(() => {
    if (visible) setSelected(value)
  }, [visible, value])

  const handleSubmit = () => {
    onSubmit(selected)
    onClose()
  }

  return (
    <V2BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("restaurant.sort.title")}
      primaryLabel={t("restaurant.sort.next")}
      onPrimary={handleSubmit}
    >
      <ScrollView
        bounces={false}
        overScrollMode="never"
        style={{ maxHeight: Math.round(windowHeight * MAX_LIST_RATIO) }}
        contentContainerStyle={styles.list}
      >
        <View style={styles.listInner}>
          {SORT_OPTIONS.map((option) => {
            const isDisabled = option.requiresLocation && distanceDisabled
            return (
              <V2Option
                key={option.value}
                label={t(dynamicKey(option.labelKey))}
                description={
                  isDisabled ? t("restaurant.sort.distanceDisabled") : undefined
                }
                selected={selected === option.value}
                disabled={isDisabled}
                onPress={() => setSelected(option.value)}
                style={styles.option}
              />
            )
          })}
        </View>
      </ScrollView>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  list: { paddingTop: spacing[20] },
  listInner: {
    gap: spacing[12],
    paddingHorizontal: SHEET_GUTTER,
  },
  option: {
    minHeight: OPTION_HEIGHT,
    // 목업 r12. DS 기본 radius['3xl'](24)은 시트 폭 전체 행에서 과하게 둥글다.
    borderRadius: radius.lg,
  },
})
