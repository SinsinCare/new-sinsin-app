import { Image, Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

const IMAGE_CARD_SIZE = 72

interface ImageThumbnailCardProps {
  uri: string
  onPress: () => void
  onRemove?: () => void
}

/** 첨부 이미지 섬네일 — 제거 버튼은 잉크 원. */
export function ImageThumbnailCard({
  uri,
  onPress,
  onRemove,
}: ImageThumbnailCardProps) {
  const { t } = useTranslation("recipe")
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="imagebutton"
        accessibilityLabel={t("media.openPhoto")}
      >
        <Image source={{ uri }} style={styles.image} />
      </Pressable>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("media.deletePhoto")}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={12} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  image: {
    width: IMAGE_CARD_SIZE,
    height: IMAGE_CARD_SIZE,
    borderRadius: 12,
  },
  closeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1D1E20",
    alignItems: "center",
    justifyContent: "center",
  },
})
