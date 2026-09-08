/** Choose a map app; failed launches keep the sheet available for retry. */

import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"

import {
  typography,
  useV2Theme,
  radius,
  spacing,
  V2BottomSheet,
  V2Option,
} from "@/src/design-system-v2"
import { Text } from "@/src/shared/components/AppText"
import { useRouteAppLaunch } from "../hooks/useRouteAppLaunch"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import { SHEET_GUTTER } from "../layout"
import { mapAppLinks, type MapAppTarget } from "../utils/mapAppLinks"

export interface RouteAppSheetProps {
  visible: boolean
  onClose: () => void
  /** 목적지. 좌표가 없으면 이 시트를 여는 버튼 자체가 없다(`canRouteTo`). */
  target: MapAppTarget
}

/** 목업의 옵션 행 높이와 같은 값(`SortSheet`). 두 시트의 행이 달라 보이면 안 된다. */
const OPTION_HEIGHT = 64

export function RouteAppSheet({
  visible,
  onClose,
  target,
}: RouteAppSheetProps) {
  const { t } = useTranslation("common")
  const links = mapAppLinks(
    target,
    Platform.OS === "android" ? "android" : "ios",
  )

  const { colors } = useV2Theme()
  const { open, close, opening, failed } = useRouteAppLaunch({
    visible,
    targetKey: JSON.stringify([target.name, target.lat, target.lng]),
    onClose,
  })

  return (
    <V2BottomSheet
      surface="restaurant_route_app"
      visible={visible}
      onClose={close}
      title={t("restaurant.route.title")}
    >
      <ScrollView bounces={false} contentContainerStyle={styles.list}>
        <View style={styles.listInner}>
          {failed ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[
                typography.subtext.medium,
                { color: colors.status.negative },
              ]}
            >
              {t("restaurant.route.openFailed")}
            </Text>
          ) : null}
          {links.map((link) => (
            <V2Option
              key={link.key}
              label={t(dynamicKey(`restaurant.route.app.${link.key}`))}
              /*
                이 목록은 **고르는 곳이 아니라 여는 곳**이다. 누르면 그 자리에서 지도 앱이
                열리고 시트가 닫히므로 남는 선택 상태가 없다 — 그래서 항상 `false` 다.
                (`V2Option` 의 `selected` 는 필수 prop 이라 생략할 수 없다.)
              */
              selected={false}
              disabled={opening !== null}
              trailing={
                opening === link.key ? (
                  <ActivityIndicator
                    accessibilityLabel={t("restaurant.route.opening")}
                    color={colors.label.normal}
                  />
                ) : undefined
              }
              onPress={() => void open(link)}
              style={styles.option}
            />
          ))}
        </View>
      </ScrollView>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  list: { paddingTop: spacing[16], paddingBottom: spacing[8] },
  listInner: { gap: spacing[8], paddingHorizontal: SHEET_GUTTER },
  option: { minHeight: OPTION_HEIGHT, borderRadius: radius.lg },
})
