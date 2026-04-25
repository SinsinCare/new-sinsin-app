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
import {
  useNotificationHistoryStore,
  type NotificationItem,
} from "@/src/stores/notificationHistoryStore"

const WATER_INTERVALS = [1, 2, 3, 4] as const
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)

type PickerTarget =
  | "waterStart"
  | "waterEnd"
  | "breakfast"
  | "lunch"
  | "dinner"

export function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()
  const { isAuthenticated } = useAuth()
  const { settings, updateSettings, requestAndEnable } =
    useNotifications(isAuthenticated)

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)

  const { items, markAsRead, markAllAsRead, clearAll } =
    useNotificationHistoryStore()

  const update = async (next: NotificationSettings) => {
    await updateSettings(next)
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
      waterReminder: { ...settings.waterReminder, enabled: value },
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
      mealReminder: { ...settings.mealReminder, enabled: value },
    })
  }

  const handleHourSelect = (hour: number) => {
    if (!pickerTarget) return
    const s = settings
    switch (pickerTarget) {
      case "waterStart":
        update({
          ...s,
          waterReminder: { ...s.waterReminder, startHour: hour },
        })
        break
      case "waterEnd":
        update({
          ...s,
          waterReminder: { ...s.waterReminder, endHour: hour },
        })
        break
      case "breakfast":
        update({
          ...s,
          mealReminder: { ...s.mealReminder, breakfastHour: hour },
        })
        break
      case "lunch":
        update({
          ...s,
          mealReminder: { ...s.mealReminder, lunchHour: hour },
        })
        break
      case "dinner":
        update({
          ...s,
          mealReminder: { ...s.mealReminder, dinnerHour: hour },
        })
        break
    }
    setPickerTarget(null)
  }

  const pickerCurrentHour = (() => {
    switch (pickerTarget) {
      case "waterStart":
        return settings.waterReminder.startHour
      case "waterEnd":
        return settings.waterReminder.endHour
      case "breakfast":
        return settings.mealReminder.breakfastHour
      case "lunch":
        return settings.mealReminder.lunchHour
      case "dinner":
        return settings.mealReminder.dinnerHour
      default:
        return 0
    }
  })()

  const pickerTitle = (() => {
    switch (pickerTarget) {
      case "waterStart": return "시작 시간 선택"
      case "waterEnd": return "종료 시간 선택"
      case "breakfast": return "아침 시간 선택"
      case "lunch": return "점심 시간 선택"
      case "dinner": return "저녁 시간 선택"
      default: return ""
    }
  })()

  const fmt = (h: number) => `${h < 12 ? "오전" : "오후"} ${h === 0 ? 12 : h > 12 ? h - 12 : h}시`

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
        {/* 알림 히스토리 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <ThemedText style={[styles.sectionTitle, { color: c.textSub }]}>
              받은 알림
            </ThemedText>
            {items.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert("알림 삭제", "모든 알림을 삭제할까요?", [
                    { text: "취소", style: "cancel" },
                    {
                      text: "삭제",
                      style: "destructive",
                      onPress: clearAll,
                    },
                  ])
                }
              >
                <ThemedText style={[styles.clearBtn, { color: c.textTertiary }]}>
                  모두 지우기
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {items.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <Ionicons
                name="notifications-off-outline"
                size={32}
                color={c.textTertiary}
              />
              <ThemedText style={[styles.emptyText, { color: c.textTertiary }]}>
                받은 알림이 없어요
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              {items.map((item, i) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  isLast={i === items.length - 1}
                  onPress={() => markAsRead(item.id)}
                  c={c}
                />
              ))}
              {items.some((n) => !n.read) && (
                <TouchableOpacity
                  style={[styles.markAllRow, { borderTopColor: c.divider }]}
                  onPress={markAllAsRead}
                >
                  <ThemedText style={{ fontSize: 13, color: tokens.color.sub8.val, fontWeight: "500" }}>
                    모두 읽음 표시
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* 수분 섭취 알림 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: c.textSub }]}>
            수분 섭취 알림
          </ThemedText>

          <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <View style={[styles.row, styles.rowBorder, { borderColor: c.divider }]}>
              <View style={styles.rowLeft}>
                <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                  알림 켜기
                </ThemedText>
                <ThemedText style={[styles.rowSub, { color: c.textTertiary }]}>
                  설정한 주기마다 수분 섭취를 알려드려요
                </ThemedText>
              </View>
              <Switch
                value={settings.waterReminder.enabled}
                onValueChange={handleWaterToggle}
                trackColor={{ false: c.isDark ? "#3A3A42" : "#E5E7EB", true: tokens.color.sub8.val }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={c.isDark ? "#3A3A42" : "#E5E7EB"}
              />
            </View>

            {settings.waterReminder.enabled && (
              <>
                <View style={[styles.row, styles.rowBorder, { borderColor: c.divider }]}>
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
                              settings.waterReminder.intervalHours === h
                                ? tokens.color.sub8.val
                                : c.inputBg,
                          },
                        ]}
                        onPress={() =>
                          update({
                            ...settings,
                            waterReminder: {
                              ...settings.waterReminder,
                              intervalHours: h,
                            },
                          })
                        }
                      >
                        <Text
                          fontSize={13}
                          fontWeight="500"
                          color={
                            settings.waterReminder.intervalHours === h
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

                <View style={[styles.row, styles.rowBorder, { borderColor: c.divider }]}>
                  <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                    시작 시간
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.timePill, { backgroundColor: c.inputBg }]}
                    onPress={() => setPickerTarget("waterStart")}
                  >
                    <ThemedText style={[styles.timePillText, { color: c.text }]}>
                      {fmt(settings.waterReminder.startHour)}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={14} color={c.textTertiary} />
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
                    <ThemedText style={[styles.timePillText, { color: c.text }]}>
                      {fmt(settings.waterReminder.endHour)}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={14} color={c.textTertiary} />
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

          <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <View style={[styles.row, styles.rowBorder, { borderColor: c.divider }]}>
              <View style={styles.rowLeft}>
                <ThemedText style={[styles.rowTitle, { color: c.text }]}>
                  알림 켜기
                </ThemedText>
                <ThemedText style={[styles.rowSub, { color: c.textTertiary }]}>
                  식사 시간에 맞춰 기록을 알려드려요
                </ThemedText>
              </View>
              <Switch
                value={settings.mealReminder.enabled}
                onValueChange={handleMealToggle}
                trackColor={{ false: c.isDark ? "#3A3A42" : "#E5E7EB", true: tokens.color.sub8.val }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={c.isDark ? "#3A3A42" : "#E5E7EB"}
              />
            </View>

            {settings.mealReminder.enabled && (
              <>
                {(
                  [
                    { label: "아침", target: "breakfast" as PickerTarget, hour: settings.mealReminder.breakfastHour },
                    { label: "점심", target: "lunch" as PickerTarget, hour: settings.mealReminder.lunchHour },
                    { label: "저녁", target: "dinner" as PickerTarget, hour: settings.mealReminder.dinnerHour },
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
                      <ThemedText style={[styles.timePillText, { color: c.text }]}>
                        {fmt(hour)}
                      </ThemedText>
                      <Ionicons name="chevron-down" size={14} color={c.textTertiary} />
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
                      selected && { backgroundColor: tokens.color.sub8.val + "22" },
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "방금 전"
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

interface NotificationRowProps {
  item: NotificationItem
  isLast: boolean
  onPress: () => void
  c: ReturnType<typeof useSettingsColors>
}

function NotificationRow({ item, isLast, onPress, c }: NotificationRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.notiRow,
        !isLast && styles.rowBorder,
        !isLast && { borderColor: c.divider },
        !item.read && { backgroundColor: tokens.color.sub8.val + "0D" },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.notiDotWrapper}>
        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: tokens.color.sub8.val }]} />
        )}
      </View>
      <View style={styles.notiContent}>
        <ThemedText style={[styles.notiTitle, { color: c.text }]}>
          {item.title}
        </ThemedText>
        <ThemedText style={[styles.notiBody, { color: c.textSub }]}>
          {item.body}
        </ThemedText>
        <ThemedText style={[styles.notiTime, { color: c.textTertiary }]}>
          {relativeTime(item.timestamp)}
        </ThemedText>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 28 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearBtn: { fontSize: 13 },
  emptyBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 36,
  },
  emptyText: { fontSize: 14 },
  notiRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notiDotWrapper: { width: 20, paddingTop: 5, alignItems: "center" },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  notiContent: { flex: 1, gap: 3 },
  notiTitle: { fontSize: 14, fontWeight: "600" },
  notiBody: { fontSize: 13, lineHeight: 18 },
  notiTime: { fontSize: 12, marginTop: 2 },
  markAllRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    paddingVertical: 12,
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
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flex: 1, gap: 3, paddingRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 13 },
  chipRow: { flexDirection: "row", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  timePillText: { fontSize: 14, fontWeight: "500" },
  // 모달
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
    ...Platform.select({
      android: { elevation: 24 },
    }),
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
