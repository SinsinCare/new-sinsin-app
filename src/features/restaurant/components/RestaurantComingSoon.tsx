/**
 * `restaurantTab` 피처 플래그가 꺼져 있을 때의 탭 화면.
 *
 * ## 왜 제보 폼을 그대로 두지 않았는가 (§F.1 / D11)
 *
 * 기존 코드는 플래그가 꺼져 있으면 **제보 폼을 탭 본체로 렌더**했다:
 *
 * ```tsx
 * if (!restaurantTabEnabled) return <RestaurantReportForm paddingTop={insets.top} />
 * ```
 *
 * 두 가지가 동시에 잘못됐다. (1) `식당` 탭을 눌렀는데 입력 폼이 뜨는 것은 탭 라벨과
 * 화면이 어긋난 상태다 — 사용자는 식당을 **보러** 왔다. (2) 그 자리가 제보 폼의 유일한
 * 진입점이었기 때문에, 플래그를 켜면 제보 기능이 조용히 사라진다.
 *
 * 그래서 여기서는 **준비 중임을 말하고**, 제보는 그 화면의 CTA(별도 route)로 내린다.
 * 플래그를 켜도 그 route 는 남아 있으므로 기능이 사라지지 않는다.
 *
 * 오류 시각언어(`V2ErrorState`)를 쓰지 않는다 — 준비 중은 고장이 아니다.
 */

import { StyleSheet, View, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { V2EmptyState, useV2Theme } from "@/src/design-system-v2"

import { GUTTER } from "../layout"

export interface RestaurantComingSoonProps {
  /** 제보 폼으로 이동. 없으면 CTA 를 그리지 않는다(눌러도 아무 일 없는 버튼 금지). */
  onPressReport?: () => void
  style?: ViewStyle
}

export function RestaurantComingSoon({
  onPressReport,
  style,
}: RestaurantComingSoonProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background.default, paddingTop: insets.top },
        style,
      ]}
    >
      <V2EmptyState
        icon="mapPin"
        title={t("restaurant.comingSoon.title")}
        description={t("restaurant.comingSoon.body")}
        actionLabel={
          onPressReport ? t("restaurant.comingSoon.action") : undefined
        }
        onAction={onPressReport}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: GUTTER,
  },
})
