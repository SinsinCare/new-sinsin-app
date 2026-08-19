import { useState } from "react"
import {
  ScrollView,
  StyleSheet,
  View,
  Switch,
  TouchableOpacity,
  Platform,
} from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import { V2Text } from "@/src/design-system-v2"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppRouter } from "@/src/shared/navigation"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { ThemedText } from "@/components/themed-text"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { useNotifications } from "@/src/hooks/useNotifications"
import { useAuth } from "@/src/hooks/useAuth"
import { showOpenSettingsAlert } from "@/src/features/settings/utils/openAppSettings"
import { tokens } from "@/src/theme/tokens"
import type { NotificationSettings } from "@/src/types/notification"

const WATER_INTERVALS = [1, 2, 3, 4] as const
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)

type PickerTarget =
  | "morning"
  | "waterStart"
  | "waterEnd"
  | "breakfast"
  | "lunch"
  | "dinner"

export function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const c = useSettingsColors()
  const { t } = useTranslation("settings")
  const { isAuthenticated } = useAuth()
  const { settings, updateSettings, requestAndEnable } =
    useNotifications(isAuthenticated)

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)
  const categories = settings.categories

  const update = async (next: NotificationSettings) => {
    await updateSettings(next)
  }

  const handleMorningToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestAndEnable()
      if (!granted) {
        void showOpenSettingsAlert(
          t("notifications.permissionTitle"),
          t("notifications.permissionBody"),
        )
        return
      }
    }
    update({
      ...settings,
      categories: {
        ...categories,
        morningCheck: { ...categories.morningCheck, enabled: value },
      },
    })
  }

  const handleWaterToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestAndEnable()
      if (!granted) {
        void showOpenSettingsAlert(
          t("notifications.permissionTitle"),
          t("notifications.permissionBody"),
        )
        return
      }
    }
    update({
      ...settings,
      categories: {
        ...categories,
        waterReminder: { ...categories.waterReminder, enabled: value },
      },
    })
  }

  const handleMealToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestAndEnable()
      if (!granted) {
        void showOpenSettingsAlert(
          t("notifications.permissionTitle"),
          t("notifications.permissionBody"),
        )
        return
      }
    }
    update({
      ...settings,
      categories: {
        ...categories,
        mealReminder: { ...categories.mealReminder, enabled: value },
      },
    })
  }

  const handleHourSelect = (hour: number) => {
    if (!pickerTarget) return
    const s = settings
    const c = categories
    switch (pickerTarget) {
      case "morning":
        update({
          ...s,
          categories: { ...c, morningCheck: { ...c.morningCheck, hour } },
        })
        break
      case "waterStart":
        update({
          ...s,
          categories: {
            ...c,
            waterReminder: { ...c.waterReminder, startHour: hour },
          },
        })
        break
      case "waterEnd":
        update({
          ...s,
          categories: {
            ...c,
            waterReminder: { ...c.waterReminder, endHour: hour },
          },
        })
        break
      case "breakfast":
        update({
          ...s,
          categories: {
            ...c,
            mealReminder: { ...c.mealReminder, breakfastHour: hour },
          },
        })
        break
      case "lunch":
        update({
          ...s,
          categories: {
            ...c,
            mealReminder: { ...c.mealReminder, lunchHour: hour },
          },
        })
        break
      case "dinner":
        update({
          ...s,
          categories: {
            ...c,
            mealReminder: { ...c.mealReminder, dinnerHour: hour },
          },
        })
        break
    }
    setPickerTarget(null)
  }

  const pickerCurrentHour = (() => {
    switch (pickerTarget) {
      case "morning":
        return categories.morningCheck.hour
      case "waterStart":
        return categories.waterReminder.startHour
      case "waterEnd":
        return categories.waterReminder.endHour
      case "breakfast":
        return categories.mealReminder.breakfastHour
      case "lunch":
        return categories.mealReminder.lunchHour
      case "dinner":
        return categories.mealReminder.dinnerHour
      default:
        return 0
    }
  })()

  const pickerTitle = (() => {
    switch (pickerTarget) {
      case "morning":
        return t("notifications.picker.morning")
      case "waterStart":
        return t("notifications.picker.waterStart")
      case "waterEnd":
        return t("notifications.picker.waterEnd")
      case "breakfast":
        return t("notifications.picker.breakfast")
      case "lunch":
        return t("notifications.picker.lunch")
      case "dinner":
        return t("notifications.picker.dinner")
      default:
        return ""
    }
  })()

  const fmt = (h: number) =>
    t("notifications.time.format", {
      period:
        h < 12
          ? t("notifications.time.periodAm")
          : t("notifications.time.periodPm"),
      hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
    })

  const switchColors = {
    track: {
      false: c.isDark ? "#3A3A42" : "#E5E7EB",
      true: tokens.color.sub8.val,
    },
    thumb: "#FFFFFF",
    ios_bg: c.isDark ? "#3A3A42" : "#E5E7EB",
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title={t("notifications.title")}
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 아침 건강 체크 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: c.textSub }]}>
            {t("notifications.morning.section")}
          </ThemedText>
          <View
            style={[
              styles.card,
              { backgroundColor: c.cardBg, borderColor: c.border },
            ]}
          >
            <View
              style={[styles.row, styles.rowBorder, { borderColor: c.divider }]}
            >
              <View style={styles.rowLeft}>
                <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                  {t("notifications.enable")}
                </ThemedText>
                <ThemedText style={[styles.rowSub, { color: c.textTertiary }]}>
                  {t("notifications.morning.body")}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel={t("notifications.morning.section")}
                value={categories.morningCheck.enabled}
                onValueChange={handleMorningToggle}
                trackColor={switchColors.track}
                thumbColor={switchColors.thumb}
                ios_backgroundColor={switchColors.ios_bg}
              />
            </View>
            {categories.morningCheck.enabled && (
              <View style={styles.row}>
                <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                  {t("notifications.time.label")}
                </ThemedText>
                <TouchableOpacity
                  style={[styles.timePill, { backgroundColor: c.inputBg }]}
                  onPress={() => setPickerTarget("morning")}
                >
                  <ThemedText style={[styles.timePillText, { color: c.text }]}>
                    {fmt(categories.morningCheck.hour)}
                  </ThemedText>
                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={c.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* 수분 섭취 알림 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: c.textSub }]}>
            {t("notifications.water.section")}
          </ThemedText>
          <View
            style={[
              styles.card,
              { backgroundColor: c.cardBg, borderColor: c.border },
            ]}
          >
            <View
              style={[styles.row, styles.rowBorder, { borderColor: c.divider }]}
            >
              <View style={styles.rowLeft}>
                <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                  {t("notifications.enable")}
                </ThemedText>
                <ThemedText style={[styles.rowSub, { color: c.textTertiary }]}>
                  {t("notifications.water.body")}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel={t("notifications.water.section")}
                value={categories.waterReminder.enabled}
                onValueChange={handleWaterToggle}
                trackColor={switchColors.track}
                thumbColor={switchColors.thumb}
                ios_backgroundColor={switchColors.ios_bg}
              />
            </View>
            {categories.waterReminder.enabled && (
              <>
                <View
                  style={[
                    styles.row,
                    styles.rowBorder,
                    { borderColor: c.divider },
                  ]}
                >
                  <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                    {t("notifications.water.interval")}
                  </ThemedText>
                  <View style={styles.chipRow}>
                    {WATER_INTERVALS.map((h) => (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.chip,
                          {
                            backgroundColor:
                              categories.waterReminder.intervalHours === h
                                ? tokens.color.sub8.val
                                : c.inputBg,
                          },
                        ]}
                        onPress={() =>
                          update({
                            ...settings,
                            categories: {
                              ...categories,
                              waterReminder: {
                                ...categories.waterReminder,
                                intervalHours: h,
                              },
                            },
                          })
                        }
                      >
                        <V2Text
                          color={
                            categories.waterReminder.intervalHours === h
                              ? "white"
                              : c.textSub
                          }
                          style={{ fontSize: 13, fontWeight: "500" }}
                        >
                          {t("notifications.water.intervalHours", { count: h })}
                        </V2Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View
                  style={[
                    styles.row,
                    styles.rowBorder,
                    { borderColor: c.divider },
                  ]}
                >
                  <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                    {t("notifications.time.start")}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.timePill, { backgroundColor: c.inputBg }]}
                    onPress={() => setPickerTarget("waterStart")}
                  >
                    <ThemedText
                      style={[styles.timePillText, { color: c.text }]}
                    >
                      {fmt(categories.waterReminder.startHour)}
                    </ThemedText>
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color={c.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                    {t("notifications.time.end")}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.timePill, { backgroundColor: c.inputBg }]}
                    onPress={() => setPickerTarget("waterEnd")}
                  >
                    <ThemedText
                      style={[styles.timePillText, { color: c.text }]}
                    >
                      {fmt(categories.waterReminder.endHour)}
                    </ThemedText>
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color={c.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 식사 기록 알림 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: c.textSub }]}>
            {t("notifications.meal.section")}
          </ThemedText>
          <View
            style={[
              styles.card,
              { backgroundColor: c.cardBg, borderColor: c.border },
            ]}
          >
            <View
              style={[styles.row, styles.rowBorder, { borderColor: c.divider }]}
            >
              <View style={styles.rowLeft}>
                <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                  {t("notifications.enable")}
                </ThemedText>
                <ThemedText style={[styles.rowSub, { color: c.textTertiary }]}>
                  {t("notifications.meal.body")}
                </ThemedText>
              </View>
              <Switch
                accessibilityLabel={t("notifications.meal.section")}
                value={categories.mealReminder.enabled}
                onValueChange={handleMealToggle}
                trackColor={switchColors.track}
                thumbColor={switchColors.thumb}
                ios_backgroundColor={switchColors.ios_bg}
              />
            </View>
            {categories.mealReminder.enabled && (
              <>
                {(
                  [
                    {
                      label: t("notifications.meal.breakfast"),
                      target: "breakfast" as PickerTarget,
                      hour: categories.mealReminder.breakfastHour,
                    },
                    {
                      label: t("notifications.meal.lunch"),
                      target: "lunch" as PickerTarget,
                      hour: categories.mealReminder.lunchHour,
                    },
                    {
                      label: t("notifications.meal.dinner"),
                      target: "dinner" as PickerTarget,
                      hour: categories.mealReminder.dinnerHour,
                    },
                  ] as const
                ).map(({ label, target, hour }, i, arr) => (
                  <View
                    key={label}
                    style={[
                      styles.row,
                      i < arr.length - 1 && styles.rowBorder,
                      i < arr.length - 1 && { borderColor: c.divider },
                    ]}
                  >
                    <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                      {label}
                    </ThemedText>
                    <TouchableOpacity
                      style={[styles.timePill, { backgroundColor: c.inputBg }]}
                      onPress={() => setPickerTarget(target)}
                    >
                      <ThemedText
                        style={[styles.timePillText, { color: c.text }]}
                      >
                        {fmt(hour)}
                      </ThemedText>
                      <Ionicons
                        name="chevron-down"
                        size={14}
                        color={c.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 시간 선택 모달 */}
      <AppModal
        visible={pickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerTarget(null)}
        >
          <View
            style={[styles.modalSheet, { backgroundColor: c.modalBg }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: c.text }]}>
                {pickerTitle}
              </ThemedText>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Ionicons
                  name="close"
                  size={22}
                  color={c.textSub}
                  accessibilityLabel={t("notifications.time.closePicker")}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              bounces={false}
              overScrollMode="never"
              style={styles.hourList}
              showsVerticalScrollIndicator={false}
            >
              {HOUR_OPTIONS.map((h) => {
                const selected = h === pickerCurrentHour
                return (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.hourItem,
                      selected && {
                        backgroundColor: tokens.color.sub8.val + "22",
                      },
                    ]}
                    onPress={() => handleHourSelect(h)}
                  >
                    <ThemedText
                      style={[
                        styles.hourText,
                        {
                          color: selected ? tokens.color.sub8.val : c.text,
                          fontWeight: selected ? "600" : "400",
                        },
                      ]}
                    >
                      {fmt(h)}
                    </ThemedText>
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={tokens.color.sub8.val}
                      />
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </AppModal>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginHorizontal: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flex: 1, gap: 3, paddingRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: "500", flexShrink: 1 },
  rowSub: { fontSize: 13 },
  // 칩 라벨은 한국어로 "1시간"(≈34pt)이지만 영어로는 "Every 3 hours"(≈95pt)다.
  // 줄바꿈 없이 한 줄에 밀어 넣으면 카드(overflow:hidden)를 넘어가 뒤쪽 칩이
  // 아예 안 보였다 — 영어 사용자는 3·4시간 간격을 **고를 수 없었다**.
  chipRow: {
    flexDirection: "row",
    gap: 6,
    flexShrink: 1,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  timePillText: { fontSize: 14, fontWeight: "500" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: "60%",
    ...Platform.select({ android: { elevation: 24 } }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: "600" },
  hourList: { paddingHorizontal: 8 },
  hourItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 2,
  },
  hourText: { fontSize: 16 },
})
