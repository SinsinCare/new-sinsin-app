import { borderWidth } from "@/src/design-system-v2/tokens/size"
import { memo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"
import {
  V2Icon,
  V2Text,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import {
  remoteImageSource,
  stableImageCacheKey,
} from "@/src/shared/images/remoteImageSource"
import type { CommunityMealPost } from "../../types"
import { formatCount } from "../../utils/displayNumber"
import { formatTimeAgo } from "../../utils/timeAgo"
import { isWithdrawnAuthor } from "../../utils/contentOwnership"
import { ROW } from "./communityLayout"

/** Discussion recommendation: title first, with author and actual conversation activity. */
export const RelatedDiscussionRow = memo(function RelatedDiscussionRow({
  post,
  category,
  onPress,
  divider,
}: {
  post: CommunityMealPost
  category: string
  onPress: () => void
  divider: boolean
}) {
  const { t, i18n } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const thumbnail = post.imageUris[0] ?? post.imageUri
  const author = isWithdrawnAuthor(post)
    ? t("post.withdrawnUser")
    : post.authorName
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${post.title}, ${author}, ${t("post.commentCount", { count: post.comments })}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? colors.fill.control
            : colors.background.default,
          borderBottomColor: colors.line.normal,
          borderBottomWidth: divider ? borderWidth.thin : 0,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.copy}>
          <V2Text
            token="subtext.small"
            color={colors.label.neutral}
            numberOfLines={1}
          >
            {category} · {formatTimeAgo(post.createdAt, i18n.language)}
          </V2Text>
          <V2Text
            token="caption.medium"
            style={styles.title}
            color={colors.label.normal}
            numberOfLines={2}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
          >
            {post.title}
          </V2Text>
          <View style={styles.footer}>
            <V2Text
              token="subtext.small"
              color={colors.label.neutral}
              numberOfLines={1}
              style={styles.author}
            >
              {author}
            </V2Text>
            <View style={styles.activity}>
              <V2Icon
                name="heartOutline"
                size="xs"
                color={colors.label.neutral}
              />
              <V2Text token="subtext.small" color={colors.label.neutral}>
                {formatCount(post.likes, i18n.language)}
              </V2Text>
            </View>
            <View style={styles.activity}>
              <V2Icon
                name="chatOutline"
                size="xs"
                color={colors.label.neutral}
              />
              <V2Text token="subtext.small" color={colors.label.neutral}>
                {formatCount(post.comments, i18n.language)}
              </V2Text>
            </View>
          </View>
        </View>
        {thumbnail ? (
          <Image
            source={remoteImageSource(thumbnail)}
            recyclingKey={stableImageCacheKey(thumbnail) ?? thumbnail}
            style={[styles.thumbnail, { backgroundColor: colors.fill.control }]}
            contentFit="cover"
          />
        ) : null}
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  row: { paddingVertical: spacing[12], gap: spacing[8] },
  content: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  copy: { flex: 1, minWidth: 0, gap: spacing[4] },
  title: {
    fontFamily: typography.label.small.fontFamily,
    lineHeight: typography.subtext.large.lineHeight,
  },
  thumbnail: {
    width: ROW.thumbSmall,
    height: ROW.thumbSmall,
    borderRadius: radius.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    marginTop: spacing[4],
  },
  author: { flex: 1, minWidth: 0 },
  activity: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
})
