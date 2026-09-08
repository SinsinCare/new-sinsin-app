/**
 * `식당 알려주기` 화면 — 제보 폼에 **자기 route 를 주기 위한** 껍데기 (§F.1).
 *
 * 없던 것은 폼이 아니라 **거기까지 가는 길**이었다. 지금까지 폼은 `restaurantTab` 플래그가
 * 꺼져 있을 때만 탭 본체로 렌더됐고, 그래서 지도를 켜는 순간 사라지는 구조였다.
 *
 * 이 화면이 더하는 것은 두 가지뿐이다.
 * 1. **뒤로 갈 길.** 탭 본체였을 때는 필요 없었지만 스택 화면에는 반드시 있어야 한다.
 * 2. **안전 영역 소유권.** 헤더가 상태바를 먹으므로 폼에는 `paddingTop={0}` 을 준다 —
 *    두 곳에서 각자 보정하면 여백이 두 번 들어간다.
 *
 * 폼은 이제 design-system-v2 프리미티브만 쓴다(예전에는 Tamagui `YStack`/`Text` +
 * legacy `TextField` 였다). 두 번 탭이면 닿는 배포 화면에 두 개의 디자인 시스템을 남겨 둘
 * 수 없어서 함께 옮겼다 — 근거는 `components/RestaurantReportForm.tsx` 헤더에 있다.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { StyleSheet, View, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { V2Divider, V2ScreenHeader, useV2Theme } from "@/src/design-system-v2"
import { useNavigation, usePreventRemove } from "@react-navigation/native"
import { showConfirm } from "@/src/lib/dialog"

import { RestaurantReportForm } from "../components/RestaurantReportForm"

export interface RestaurantReportScreenProps {
  onBack: () => void
  style?: ViewStyle
}

export function RestaurantReportScreen({
  onBack,
  style,
}: RestaurantReportScreenProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const [dirty, setDirty] = useState(false)

  const navigation = useNavigation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const busy = useRef(false)
  const prompting = useRef(false)
  const allowExit = useRef(false)
  const onSubmittingChange = useCallback((value: boolean) => {
    busy.current = value
    setIsSubmitting(value)
  }, [])
  usePreventRemove(dirty || isSubmitting, async ({ data }) => {
    if (!mounted.current) return
    if (allowExit.current) {
      navigation.dispatch(data.action)
      return
    }
    if (busy.current || prompting.current) return
    prompting.current = true
    try {
      const confirmed = await showConfirm({
        title: t("restaurant.report.discardTitle"),
        description: t("restaurant.report.discardBody"),
        confirmLabel: t("restaurant.report.discard"),
        cancelLabel: t("restaurant.report.keepWriting"),
        destructive: true,
        buttonLayout: "vertical",
      })
      if (confirmed && mounted.current && !busy.current) {
        allowExit.current = true
        navigation.dispatch(data.action)
      }
    } finally {
      prompting.current = false
    }
  })

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background.default },
        style,
      ]}
    >
      <V2ScreenHeader
        title={t("restaurant.report.formTitle")}
        onBack={() => {
          if (!busy.current) onBack()
        }}
        safeAreaTop
      />
      <V2Divider tone="alternative" />
      <RestaurantReportForm
        paddingTop={0}
        onDirtyChange={setDirty}
        onSubmittingChange={onSubmittingChange}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
