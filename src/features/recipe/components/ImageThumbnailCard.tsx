import { Image, Pressable, StyleSheet } from "react-native"
import { View } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"

const IMAGE_CARD_SIZE = 64
const IMAGE_CLOSE_BG = "#F5F6FA"
const IMAGE_CLOSE_ICON = "#0B0D0E"

interface ImageThumbnailCardProps {
  uri: string
  onPress: () => void
  onRemove: () => void
}

export function ImageThumbnailCard({
  uri,
  onPress,
  onRemove,
}: ImageThumbnailCardProps) {
  return (
    <View style={{ position: "relative" }}>
      <Pressable onPress={onPress}>
        <Image
          source={{ uri }}
          style={{
            width: IMAGE_CARD_SIZE,
            height: IMAGE_CARD_SIZE,
            borderRadius: 8,
          }}
        />
      </Pressable>
      <Pressable onPress={onRemove} style={styles.closeButton}>
        <Icon name="x" size={12} color={IMAGE_CLOSE_ICON} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: IMAGE_CLOSE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
})
