/**
 * 위치 권한 거부 배너. `BUILD_CONTRACT §3.5`.
 *
 * ## `denied` 에서만 뜬다
 *
 * `undetermined` 는 아직 아무 것도 묻지 않은 상태다. 그때 배너를 띄우면 사용자가 거부한
 * 적도 없는데 "위치가 꺼져 있다" 고 말하는 셈이고, 진입 즉시 권한을 재촉하는 것과 다르지
 * 않다. 물어보는 시점은 `내 위치` FAB 하나로 고정한다.
 *
 * ## `canAskAgain` 을 반드시 구분한다
 *
 * iOS 는 한 번 거부하면 앱이 다시 물어볼 수 없다. 그 상태(`blockedForever`)에서
 * `위치 사용하기` 를 주면 눌러도 아무 일이 없어 앱이 고장 난 것처럼 보인다. 그때만
 * `설정 열기` 로 바꿔 OS 설정으로 보낸다.
 *
 * ## 닫을 수 있어야 한다
 *
 * 거부는 사용자의 선택이고, 지도는 폴백 중심으로 정상 동작한다. 닫을 수 없는 배너는
 * 화면 상단을 영구히 먹으면서 "당신의 선택이 틀렸다" 고 반복한다.
 */

import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import type { ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2Icon,
  iconSize,
  radius,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

import type { LocationPermissionState } from "../types"

export interface LocationPermissionBannerProps {
  status: LocationPermissionState
  /** `canAskAgain === false`. 이때만 `설정 열기` 를 띄운다. */
  blockedForever: boolean
  /** 다시 물어볼 수 있을 때의 액션. */
  onRequest: () => void
  onDismiss?: () => void
  style?: ViewStyle
}

export function LocationPermissionBanner({
  status,
  blockedForever,
  onRequest,
  onDismiss,
  style,
}: LocationPermissionBannerProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  if (status !== "denied") return null

  const actionLabel = blockedForever
    ? t("restaurant.permission.openSettings")
    : t("restaurant.permission.allow")
  const onAction = blockedForever
    ? () => {
        // 실패해도 사용자가 할 수 있는 일이 없다(설정 앱이 없는 환경). 조용히 넘긴다.
        void Linking.openSettings()
      }
    : onRequest

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.root,
        { backgroundColor: colors.primary.primaryWeak },
        style,
      ]}
    >
      <V2Icon
        name="crosshair"
        size={iconSize.sm}
        color={colors.primary.primary}
      />
      <Text
        style={[
          typography.subtext.medium,
          styles.message,
          { color: colors.label.neutral },
        ]}
      >
        {t("restaurant.permission.deniedBanner")}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        hitSlop={spacing[8]}
        onPress={onAction}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Text
          style={[
            typography.label.xSmall,
            styles.action,
            { color: colors.primary.primary },
          ]}
        >
          {actionLabel}
        </Text>
      </Pressable>
      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          hitSlop={(touchTarget.min - iconSize.xs) / 2}
          onPress={onDismiss}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <V2Icon
            name="close"
            size={iconSize.xs}
            color={colors.label.alternative}
          />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
    borderRadius: radius.md,
  },
  // 문구가 길어도 액션 버튼을 화면 밖으로 밀지 않는다.
  message: { flex: 1 },
  action: { textDecorationLine: "underline" },
  pressed: { opacity: 0.6 },
})
