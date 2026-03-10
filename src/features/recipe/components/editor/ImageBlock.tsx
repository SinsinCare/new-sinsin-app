import {
  Image,
  Pressable,
  View,
  ActivityIndicator,
  useColorScheme,
  StyleSheet,
  Alert,
} from "react-native"
import { Text } from "tamagui"

const DELETE_BTN_BG = "rgba(0,0,0,0.5)"
const DELETE_BTN_ICON = "#FFFFFF"
const OVERLAY_BG = "rgba(0,0,0,0.4)"
const ERROR_BG = { light: "#FFF5ED", dark: "#3A2A20" }
const ERROR_TEXT = { light: "#E77661", dark: "#E78D7C" }
const RETRY_COLOR = { light: "#44AF94", dark: "#44AF94" }

interface ImageBlockProps {
  localUri: string
  isUploading?: boolean
  uploadFailed?: boolean
  onDelete: () => void
  onRetry?: () => void
  onPress: () => void
}

export function ImageBlock({
  localUri,
  isUploading,
  uploadFailed,
  onDelete,
  onRetry,
  onPress,
}: ImageBlockProps) {
  const scheme = useColorScheme() ?? "light"

  const handleDelete = () => {
    Alert.alert("이미지 삭제", "이미지를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: onDelete },
    ])
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} style={styles.imageWrapper}>
        <Image
          source={{ uri: localUri }}
          style={styles.image}
          resizeMode="cover"
        />

        {isUploading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

        {uploadFailed && (
          <View
            style={[styles.errorOverlay, { backgroundColor: ERROR_BG[scheme] }]}
          >
            <Text
              fontSize={14}
              color={ERROR_TEXT[scheme]}
              fontWeight="600"
              fontFamily="$body"
            >
              업로드 실패
            </Text>
            <View style={styles.errorActions}>
              <Pressable onPress={onRetry} style={styles.errorBtn}>
                <Text
                  fontSize={13}
                  color={RETRY_COLOR[scheme]}
                  fontWeight="600"
                  fontFamily="$body"
                >
                  재시도
                </Text>
              </Pressable>
              <Pressable onPress={onDelete} style={styles.errorBtn}>
                <Text
                  fontSize={13}
                  color={ERROR_TEXT[scheme]}
                  fontWeight="600"
                  fontFamily="$body"
                >
                  삭제
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>

      {!uploadFailed && (
        <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text
            fontSize={14}
            color={DELETE_BTN_ICON}
            fontWeight="700"
            fontFamily="$body"
          >
            ✕
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: "relative",
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorActions: {
    flexDirection: "row",
    gap: 16,
  },
  errorBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DELETE_BTN_BG,
    justifyContent: "center",
    alignItems: "center",
  },
})
