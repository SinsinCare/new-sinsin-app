import { Pressable, StyleSheet, View } from "react-native"
import type { ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2DotLoader,
  V2Icon,
  iconSize,
  radius,
  spacing,
  touchTarget,
  useV2Theme,
  type V2IconName,
} from "@/src/design-system-v2"

import { FLOATING_SHADOW, mapOverlayChrome } from "./mapFloating"

const SIZE = touchTarget.min // 44

export interface MapFabStackProps {
  onPressMyLocation: () => void
  /** 위치 권한/좌표 요청 중. 내 위치 FAB 가 점 로더로 바뀐다. */
  locating?: boolean
  style?: ViewStyle
}

export function MapFabStack({
  onPressMyLocation,
  locating = false,
  style,
}: MapFabStackProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  return (
    <View style={[styles.stack, style]}>
      <Fab
        name="crosshair"
        color={colors.label.normal}
        label={t("restaurant.map.myLocation")}
        busy={locating}
        onPress={onPressMyLocation}
      />
    </View>
  )
}

function Fab({
  name,
  color,
  label,
  selected,
  busy = false,
  onPress,
}: {
  name: V2IconName
  color: string
  label: string
  /** `undefined` = 토글이 아니다. */
  selected?: boolean
  busy?: boolean
  onPress: () => void
}) {
  const { colors, mode } = useV2Theme()
  const chrome = mapOverlayChrome({ mode, ...colors })
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={
        selected === undefined ? { busy } : { selected, busy }
      }
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        FLOATING_SHADOW,
        chrome,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <V2DotLoader size="s" color={colors.primary.primary} />
      ) : (
        <V2Icon name={name} size={iconSize.md} color={color} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  stack: { gap: spacing[8], alignItems: "flex-end" },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
})
