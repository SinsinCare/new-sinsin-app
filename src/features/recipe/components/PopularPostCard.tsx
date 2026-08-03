import { StyleSheet, Text, View } from "react-native"
// 원격 사진은 expo-image — 디스크 캐시·다운스케일 디코드로 목록 스크롤이 가볍다
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { useTranslation } from "react-i18next"

interface PopularPostCardProps {
  rank: number
  category: string
  title: string
  imageUri?: string | null
  likeCount: number
  commentCount: number
  onPress?: () => void
}

/** 인기글 카드 — 순위 숫자가 액센트, 사진이 있으면 미리보기가 붙는다. */
export function PopularPostCard({
  rank,
  category,
  title,
  imageUri,
  likeCount,
  commentCount,
  onPress,
}: PopularPostCardProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  return (
    <SurfacePressable
      onPress={() => onPress?.()}
      accessibilityLabel={t("post.popularAccessibility", { rank, title })}
      baseColor={surface.card}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.rank, { color: surface.brand }]}>{rank}</Text>
        <Text
          style={[styles.category, { color: surface.textMuted }]}
          numberOfLines={1}
        >
          {category}
        </Text>
      </View>

      <View style={styles.bodyRow}>
        <Text
          style={[styles.title, { color: surface.textStrong }]}
          numberOfLines={2}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {title}
        </Text>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.thumbnail, { backgroundColor: surface.surface }]}
            contentFit="cover"
          />
        ) : null}
      </View>

      <View style={styles.counts}>
        <View style={styles.countItem}>
          <Ionicons name="heart-outline" size={13} color={surface.textWeak} />
          <Text style={[styles.countText, { color: surface.textMuted }]}>
            {likeCount}
          </Text>
        </View>
        <View style={styles.countItem}>
          <Ionicons
            name="chatbubble-outline"
            size={12}
            color={surface.textWeak}
          />
          <Text style={[styles.countText, { color: surface.textMuted }]}>
            {commentCount}
          </Text>
        </View>
      </View>
    </SurfacePressable>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 224,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rank: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    fontFamily: "Pretendard-Bold",
  },
  category: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
    flexShrink: 1,
  },
  bodyRow: {
    flexDirection: "row",
    gap: 10,
    minHeight: 42,
  },
  title: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    letterSpacing: -0.29,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 10,
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
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "600",
    fontFamily: "Pretendard-SemiBold",
  },
})
