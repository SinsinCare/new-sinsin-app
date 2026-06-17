import { useState } from "react"
import {
  ScrollView,
  StyleSheet,
  View,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from "react-native"
import { Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

import { ThemedView } from "@/components/themed-view"
import { ThemedText } from "@/components/themed-text"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { useNotifications } from "@/src/hooks/useNotifications"
import { useAuth } from "@/src/hooks/useAuth"
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
  const router = useRouter()
  const c = useSettingsColors()
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
        Alert.alert(
          "알림 권한 필요",
          "설정 앱에서 신신당부 알림 권한을 허용해주세요.",
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
        Alert.alert(
          "알림 권한 필요",
          "설정 앱에서 신신당부 알림 권한을 허용해주세요.",
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
        Alert.alert(
          "알림 권한 필요",
          "설정 앱에서 신신당부 알림 권한을 허용해주세요.",
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
        return "아침 체크 시간 선택"
      case "waterStart":
        return "시작 시간 선택"
      case "waterEnd":
        return "종료 시간 선택"
      case "breakfast":
        return "아침 시간 선택"
      case "lunch":
        return "점심 시간 선택"
      case "dinner":
        return "저녁 시간 선택"
      default:
        return ""
    }
  })()

  const fmt = (h: number) =>
    `${h < 12 ? "오전" : "오후"} ${h === 0 ? 12 : h > 12 ? h - 12 : h}시`

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
        title="알림 설정"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 아침 건강 체크 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: c.textSub }]}>
            아침 건강 체크 알림
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
                  알림 켜기
                </ThemedText>
                <ThemedText style={[styles.rowSub, { color: c.textTertiary }]}>
                  첫 소변 후 물 마시기 전 혈압·체중 기록을 알려드려요
                </ThemedText>
              </View>
              <Switch
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
                  알림 시간
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
            수분 섭취 알림
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
                  알림 켜기
                </ThemedText>
                <ThemedText style={[styles.rowSub, { color: c.textTertiary }]}>
                  설정한 주기마다 수분 섭취를 알려드려요
                </ThemedText>
              </View>
              <Switch
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
                    알림 주기
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
                        <Text
                          fontSize={13}
                          fontWeight="500"
                          color={
                            categories.waterReminder.intervalHours === h
                              ? "white"
                              : c.textSub
                          }
                        >
                          {h}시간
                        </Text>
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
                    시작 시간
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
                    종료 시간
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
            식사 기록 알림
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
                  알림 켜기
                </ThemedText>
                <ThemedText style={[styles.rowSub, { color: c.textTertiary }]}>
                  식사 시간에 맞춰 기록을 알려드려요
                </ThemedText>
              </View>
              <Switch
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
                      label: "아침",
                      target: "breakfast" as PickerTarget,
                      hour: categories.mealReminder.breakfastHour,
                    },
                    {
                      label: "점심",
                      target: "lunch" as PickerTarget,
                      hour: categories.mealReminder.lunchHour,
                    },
                    {
                      label: "저녁",
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
      <Modal
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
                <Ionicons name="close" size={22} color={c.textSub} />
              </TouchableOpacity>
            </View>
            <ScrollView
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
      </Modal>
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
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 13 },
  chipRow: { flexDirection: "row", gap: 6 },
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
