import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { reportService } from "@/src/services/reportService"
import type { ReportReason } from "@/src/services/reportService"
import { formatTimeAgo } from "../utils/timeAgo"
import { TagChips } from "./TagChips"
import { useTranslation } from "react-i18next"

interface PostListItemProps {
  category: string
  createdAt: Date
  title: string
  summary: string
  imageUri?: string | null
  authorName: string
  likeCount: number
  commentCount: number
  tags?: string[]
  onPress?: () => void
  onPressTag?: (tag: string) => void
  onBlock?: (authorName: string) => void
  isWithdrawnAuthor?: boolean
}

/** 피드 카드 — 회색 바닥 위의 흰 카드. 제목·미리보기 왼쪽, 사진은 오른쪽 섬네일. */
export function PostListItem({
  category,
  createdAt,
  title,
  summary,
  imageUri,
  authorName,
  likeCount,
  commentCount,
  tags = [],
  onPress,
  onPressTag,
  onBlock,
  isWithdrawnAuthor = false,
}: PostListItemProps) {
  const { t, i18n } = useTranslation("recipe")
  const surface = useSurface()
  const displayAuthorName = isWithdrawnAuthor
    ? t("post.withdrawnUser")
    : authorName === "나"
      ? t("freePost.selfName")
      : authorName

  const handleReport = () => {
    const reasons: { label: string; value: ReportReason }[] = [
      { label: t("post.reportReason.spam"), value: "SPAM" },
      { label: t("post.reportReason.harassment"), value: "HARASSMENT" },
      {
        label: t("post.reportReason.inappropriate"),
        value: "INAPPROPRIATE_CONTENT",
      },
      {
        label: t("post.reportReason.falseInformation"),
        value: "FALSE_INFORMATION",
      },
      { label: t("post.reportReason.other"), value: "OTHER" },
    ]
    Alert.alert(t("post.reportTitle"), undefined, [
      ...reasons.map((r) => ({
        text: r.label,
        onPress: async () => {
          try {
            await reportService.reportUser({
              targetNickName: authorName,
              reason: r.value,
            })
            Alert.alert(
              t("post.reportReceivedTitle"),
              t("post.reportReceivedBody"),
            )
          } catch {
            Alert.alert(t("post.reportErrorTitle"), t("post.reportErrorBody"))
          }
        },
      })),
      { text: t("action.cancel"), style: "cancel" as const },
    ])
  }

  const handleMorePress = () => {
    Alert.alert(authorName, undefined, [
      {
        text: t("post.reportPost"),
        onPress: handleReport,
      },
      {
        text: t("post.blockUser"),
        style: "destructive",
        onPress: () => {
          Alert.alert(
            t("post.blockTitle", { author: displayAuthorName }),
            t("post.blockBody"),
            [
              { text: t("action.cancel"), style: "cancel" },
              {
                text: t("post.block"),
                style: "destructive",
                onPress: () => onBlock?.(authorName),
              },
            ],
          )
        },
      },
      { text: t("action.cancel"), style: "cancel" },
    ])
  }

  return (
    <SurfacePressable
      onPress={() => onPress?.()}
      accessibilityLabel={title}
      baseColor={surface.card}
      style={styles.card}
    >
      <View style={styles.metaRow}>
        <Text
          style={[styles.metaText, { color: surface.textWeak }]}
          numberOfLines={1}
        >
          {category} · {formatTimeAgo(createdAt, i18n.language)}
        </Text>
        {!isWithdrawnAuthor && (
          <Pressable
            onPress={handleMorePress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("post.more")}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={16}
              color={surface.textWeak}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.bodyText}>
          <Text
            style={[styles.title, { color: surface.textStrong }]}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {title}
          </Text>
          <Text
            style={[styles.summary, { color: surface.text }]}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
          >
            {summary}
          </Text>
        </View>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.thumbnail, { backgroundColor: surface.surface }]}
            resizeMode="cover"
          />
        ) : null}
      </View>

      {tags.length > 0 && <TagChips tags={tags} onPressTag={onPressTag} />}

      <View style={styles.footerRow}>
        <Text
          style={[styles.metaText, { color: surface.textWeak }]}
          numberOfLines={1}
        >
          {displayAuthorName}
        </Text>
        <View style={styles.counts}>
          <View style={styles.countItem}>
            <Ionicons name="heart-outline" size={14} color={surface.textWeak} />
            <Text style={[styles.countText, { color: surface.textMuted }]}>
              {likeCount}
            </Text>
          </View>
          <View style={styles.countItem}>
            <Ionicons
              name="chatbubble-outline"
              size={13}
              color={surface.textWeak}
            />
            <Text style={[styles.countText, { color: surface.textMuted }]}>
              {commentCount}
            </Text>
          </View>
        </View>
      </View>
    </SurfacePressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
    flexShrink: 1,
  },
  bodyRow: {
    flexDirection: "row",
    gap: 12,
  },
  bodyText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: -0.31,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  summary: {
    fontSize: 13.5,
    lineHeight: 20,
    letterSpacing: -0.27,
    fontFamily: "Pretendard-Regular",
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  counts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  countText: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
})
