import { Image, Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"

import { useSurface } from "@/src/hooks/useSurface"

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
  const surface = useSurface()
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
          style={[styles.closeButton, { backgroundColor: surface.textStrong }]}
        >
          {/*
            원은 섬네일 **모서리 밖으로** 6pt 나와 있어서 절반이 화면 바닥 위에 놓인다.
            그래서 잉크 한 벌(라이트에서 어두운 원 + 밝은 ✕)을 고정으로 두면 다크에서
            원과 바닥이 같은 색이 되어 버튼이 통째로 사라진다(#1D1E20 대 다크 캔버스 =
            1.01:1). 잉크를 **뒤집는다** — 면은 언제나 글자색, 내용은 언제나 바닥색이다.
          */}
          <Ionicons name="close" size={12} color={surface.canvas} />
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
    alignItems: "center",
    justifyContent: "center",
  },
})
