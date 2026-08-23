import { useMemo, useRef, useState } from "react"
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated"

import type { Chat } from "@/src/types/chat"
import i18n from "@/src/i18n"
import { Icon } from "@/src/shared/components/Icon"
import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { useTranslation } from "react-i18next"

const DRAG_DISMISS_THRESHOLD = 60

// -----------------------------------------
// 시간 그룹 — LLM 챗 히스토리 관례: 오늘 / 어제 / 최근 7일 / 이전.
// 목록이 길어져도 "언제 했더라"로 바로 내려갈 수 있다.
// -----------------------------------------

type Bucket = "today" | "yesterday" | "week" | "older"

const BUCKET_ORDER: Bucket[] = ["today", "yesterday", "week", "older"]
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function bucketOf(date: Date, now: Date): Bucket {
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (dayDiff <= 0) return "today"
  if (dayDiff === 1) return "yesterday"
  if (dayDiff < 7) return "week"
  return "older"
}

/** 행 오른쪽의 짧은 시각 — 오늘은 시각, 어제는 "어제", 그 외엔 날짜만. */
function formatRowTime(date: Date, now: Date, language: string): string {
  const bucket = bucketOf(date, now)
  const isEnglish = language.toLowerCase().startsWith("en")
  const locale = isEnglish ? "en-US" : "ko-KR"
  if (bucket === "today") {
    return date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }
  if (bucket === "yesterday") {
    // Hermes 에는 Intl.RelativeTimeFormat 이 없다 — 문구는 i18n 에서 가져온다.
    return i18n.getFixedT(isEnglish ? "en" : "ko", "common")("time.yesterday")
  }
  if (!isEnglish && date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  })
}

// -----------------------------------------
// Layout — 풀시트. 서피스 층 규칙(회색 바닥 위 흰 카드)을 그대로 따른다.
// Tamagui Sheet(포털)는 iOS pageSheet(상담 모달) 뒤에 깔려 보이지 않는다 —
// 화면 트리 안에서 직접 그리는 자체 오버레이 시트로 만든다.
// -----------------------------------------

const ChatHistorySheetLayout = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) => {
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const { t } = useTranslation("common")

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > DRAG_DISMISS_THRESHOLD) {
            onCloseRef.current()
          }
        },
      }),
    [],
  )

  if (!isOpen) return null

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      style={StyleSheet.absoluteFill}
    >
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: surface.isDark
              ? "rgba(0,0,0,0.70)"
              : "rgba(0,0,0,0.28)",
          },
        ]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("consult.history.close")}
      />
      <Animated.View
        entering={SlideInDown.duration(320)}
        style={[
          styles.sheetFrame,
          {
            top: Math.max(insets.top, 12) + 8,
            backgroundColor: surface.bed,
          },
        ]}
      >
        <View
          {...panResponder.panHandlers}
          style={{ paddingVertical: 12, alignItems: "center" }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: surface.isDark ? "#3A3B40" : "#D9DADF",
            }}
          />
        </View>
        {children}
      </Animated.View>
    </Animated.View>
  )
}

// -----------------------------------------
// Header — 큰 제목 좌측, 닫기 우측. 새 대화 CTA 는 본문 최상단이 갖는다.
// -----------------------------------------

const ChatHistoryHeader = ({ onClose }: { onClose: () => void }) => {
  const surface = useSurface()
  const { t } = useTranslation("common")
  return (
    <View style={styles.header}>
      <Text
        style={[styles.headerTitle, { color: surface.textStrong }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("consult.history.title")}
      </Text>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("consult.history.close")}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.headerClose,
              {
                backgroundColor: pressed
                  ? surface.surfacePressed
                  : surface.isDark
                    ? surface.surface
                    : surface.card,
              },
            ]}
          >
            <Icon name="x" size={18} color={surface.textMuted} />
          </View>
        )}
      </Pressable>
    </View>
  )
}

// -----------------------------------------
// Content — 새 상담 CTA + 시간 그룹 리스트 + 빈 상태 + 인시트 액션 시트.
// RN Modal 은 iOS pageSheet 위에서 프레젠트되지 않아, 행 액션 메뉴는
// 시트 안 오버레이(하단 액션 카드)로 띄운다.
// -----------------------------------------

interface ChatHistoryContentProps {
  chats: Chat[]
  isLoading: boolean
  onNewChat: () => void
  onSelect: (id: number) => void
  onRename: (chat: Chat) => void
  onDelete: (chat: Chat) => void
}

const ChatHistoryContent = ({
  chats,
  isLoading,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}: ChatHistoryContentProps) => {
  const insets = useSafeAreaInsets()
  const surface = useSurface()
  const { t, i18n } = useTranslation("common")
  const language = i18n.resolvedLanguage ?? i18n.language
  const [actionTarget, setActionTarget] = useState<Chat | null>(null)

  const now = new Date()
  const grouped = useMemo(() => {
    const buckets: Record<Bucket, Chat[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: [],
    }
    for (const chat of chats) {
      buckets[bucketOf(chat.createdAt, now)].push(chat)
    }
    return BUCKET_ORDER.map((key) => ({
      key,
      label: t(`consult.history.${key}`),
      items: buckets[key],
    })).filter((section) => section.items.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, t])

  const cardBg = surface.card
  const isEmpty = !isLoading && chats.length === 0

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        bounces={false}
        overScrollMode="never"
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* 새 상담 — 히스토리의 제1 액션. 잉크 버튼(플로팅 AI 버튼과 같은 아이덴티티)으로
            아래 리스트 카드와 위계를 확실히 가른다. */}
        <Pressable
          onPress={() => {
            hapticSelection()
            onNewChat()
          }}
          accessibilityRole="button"
          accessibilityLabel={t("consult.history.new")}
        >
          {({ pressed }) => {
            const inkBg = surface.isDark ? "#F4F4F6" : "#1D1E20"
            const inkContent = surface.isDark ? "#17181C" : "#FFFFFF"
            return (
              <View
                style={[
                  styles.newChatCard,
                  {
                    backgroundColor: inkBg,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Icon name="plus" size={18} color={inkContent} />
                <Text
                  style={[styles.newChatLabel, { color: inkContent }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("consult.history.new")}
                </Text>
              </View>
            )
          }}
        </Pressable>

        {isLoading && (
          <View style={[styles.group, { backgroundColor: cardBg }]}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <View
                  style={[
                    styles.skeletonLine,
                    { width: "55%", backgroundColor: surface.surface },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    {
                      width: "80%",
                      height: 10,
                      backgroundColor: surface.surface,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        )}

        {isEmpty && (
          <View style={styles.empty}>
            <Text
              style={[styles.emptyTitle, { color: surface.textMuted }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("consult.history.emptyTitle")}
            </Text>
            <Text
              style={[styles.emptySub, { color: surface.placeholder }]}
              lineBreakStrategyIOS="hangul-word"
            >
              {t("consult.history.emptyBody")}
            </Text>
          </View>
        )}

        {grouped.map((section) => (
          <View key={section.key}>
            <Text style={[styles.sectionLabel, { color: surface.textMuted }]}>
              {section.label}
            </Text>
            <View style={[styles.group, { backgroundColor: cardBg }]}>
              {section.items.map((chat, index) => (
                <Pressable
                  key={chat.id}
                  onPress={() => onSelect(chat.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t("consult.history.openChat", {
                    title: chat.title,
                  })}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { backgroundColor: surface.surfacePressed },
                  ]}
                >
                  <View style={styles.rowBody}>
                    <Text
                      style={[styles.rowTitle, { color: surface.textStrong }]}
                      numberOfLines={1}
                      lineBreakStrategyIOS="hangul-word"
                    >
                      {chat.title}
                    </Text>
                    <Text
                      style={[styles.rowSub, { color: surface.textMuted }]}
                      numberOfLines={1}
                    >
                      {formatRowTime(chat.createdAt, now, language)}
                      {chat.summary ? `  ·  ${chat.summary}` : ""}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      hapticSelection()
                      setActionTarget(chat)
                    }}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t("consult.history.manageChat", {
                      title: chat.title,
                    })}
                  >
                    {({ pressed }) => (
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={18}
                        color={surface.textWeak}
                        style={{ opacity: pressed ? 0.5 : 1 }}
                      />
                    )}
                  </Pressable>
                  {index < section.items.length - 1 && (
                    <View
                      style={[
                        styles.rowHairline,
                        { backgroundColor: surface.hairline },
                      ]}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 행 액션 — 시트 안 하단 액션 카드. */}
      {actionTarget && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.35)" },
            ]}
            onPress={() => setActionTarget(null)}
            accessibilityRole="button"
            accessibilityLabel={t("consult.history.closeMenu")}
          />
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={[styles.actionWrap, { bottom: insets.bottom + 16 }]}
            pointerEvents="box-none"
          >
            <View
              style={[styles.actionCard, { backgroundColor: surface.card }]}
            >
              <Text
                style={[styles.actionTitle, { color: surface.textMuted }]}
                numberOfLines={1}
              >
                {actionTarget.title}
              </Text>
              <View
                style={[
                  styles.actionHairline,
                  { backgroundColor: surface.hairline },
                ]}
              />
              <Pressable
                onPress={() => {
                  const target = actionTarget
                  setActionTarget(null)
                  onRename(target)
                }}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && { backgroundColor: surface.surfacePressed },
                ]}
              >
                <Text
                  style={[styles.actionLabel, { color: surface.textStrong }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("consult.history.rename")}
                </Text>
                <Icon name="pencil" size={18} color={surface.textMuted} />
              </Pressable>
              <View
                style={[
                  styles.actionHairline,
                  { backgroundColor: surface.hairline },
                ]}
              />
              <Pressable
                onPress={() => {
                  const target = actionTarget
                  setActionTarget(null)
                  onDelete(target)
                }}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && { backgroundColor: surface.surfacePressed },
                ]}
              >
                <Text
                  style={[styles.actionLabel, { color: surface.danger }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t("consult.history.delete")}
                </Text>
                <Icon name="trashcan" size={18} color={surface.danger} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => setActionTarget(null)}
              style={({ pressed }) => [
                styles.actionCancel,
                {
                  backgroundColor: surface.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionCancelLabel,
                  { color: surface.textStrong },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("action.cancel")}
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  )
}

export const ChatHistorySheet = {
  Layout: ChatHistorySheetLayout,
  Header: ChatHistoryHeader,
  Content: ChatHistoryContent,
}

const styles = StyleSheet.create({
  sheetFrame: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.4,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  headerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  newChatCard: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  newChatLabel: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },

  sectionLabel: {
    paddingTop: 18,
    paddingBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  group: {
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontFamily: "Pretendard-Regular",
  },
  rowHairline: {
    position: "absolute",
    left: 16,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },

  skeletonRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },

  empty: {
    alignItems: "center",
    gap: 6,
    paddingTop: 72,
  },
  emptyTitle: {
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  emptySub: {
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: "Pretendard-Regular",
  },

  actionWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    gap: 10,
  },
  actionCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  actionTitle: {
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    fontFamily: "Pretendard-Regular",
  },
  actionHairline: {
    height: StyleSheet.hairlineWidth,
  },
  actionRow: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  actionLabel: {
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: -0.31,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
  actionCancel: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCancelLabel: {
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
})
