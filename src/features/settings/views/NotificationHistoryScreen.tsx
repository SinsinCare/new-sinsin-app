import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import Ionicons from "@expo/vector-icons/Ionicons"

import { ThemedView } from "@/components/themed-view"
import { ThemedText } from "@/components/themed-text"
import { ScreenHeader } from "@/src/shared/components/ScreenHeader"
import { useSettingsColors } from "@/src/features/settings/hooks/useSettingsColors"
import { tokens } from "@/src/theme/tokens"
import {
  useNotificationHistoryStore,
  type NotificationItem,
} from "@/src/stores/notificationHistoryStore"

export function NotificationHistoryScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useSettingsColors()

  const { items, markAsRead, markAllAsRead, clearAll } =
    useNotificationHistoryStore()

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader
        title="알림"
        paddingTop={insets.top + 8}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={() => router.push("/(settings)/notification-settings")}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={22} color={c.textSub} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
                    { text: "삭제", style: "destructive", onPress: clearAll },
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
              <Ionicons name="notifications-off-outline" size={32} color={c.textTertiary} />
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
      </ScrollView>
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
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
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
})
