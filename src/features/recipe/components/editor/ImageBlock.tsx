import { Image, Pressable, View, StyleSheet } from "react-native"
import { V2Text } from "@/src/design-system-v2"
import { V2DotLoader } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useTranslation } from "react-i18next"

import { showConfirm } from "@/src/lib/dialog"

const DELETE_BTN_BG = "rgba(0,0,0,0.5)"
const DELETE_BTN_ICON = "#FFFFFF"
const OVERLAY_BG = "rgba(0,0,0,0.4)"
const ERROR_BG = { light: "#FFF5ED", dark: "#3A2A20" }
const ERROR_TEXT = { light: "#E77661", dark: "#E78D7C" }
const RETRY_COLOR = {
  light: tokens.color.sub6.val,
  dark: tokens.color.sub6.val,
}

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
  const { t } = useTranslation("recipe")
  const scheme = useAppColorScheme()

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title: t("media.deletePhotoTitle"),
      description: t("media.deletePhotoBody"),
      confirmLabel: t("action.delete"),
      cancelLabel: t("action.cancel"),
      destructive: true,
    })
    if (confirmed) onDelete()
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
            {/* 사진은 이미 보이는 상태다. 링으로 덮는 대신 점만 얹어 사진을 가리지 않는다. */}
            <V2DotLoader size="m" color="#FFFFFF" />
          </View>
        )}

        {uploadFailed && (
          <View
            style={[styles.errorOverlay, { backgroundColor: ERROR_BG[scheme] }]}
          >
            <V2Text color={ERROR_TEXT[scheme]} lineBreakStrategyIOS="hangul-word" style={{ fontSize: 14, fontWeight: "600" }}>
              {t("media.uploadFailed")}
            </V2Text>
            <View style={styles.errorActions}>
              <Pressable onPress={onRetry} style={styles.errorBtn}>
                <V2Text color={RETRY_COLOR[scheme]} lineBreakStrategyIOS="hangul-word" style={{ fontSize: 13, fontWeight: "600" }}>
                  {t("media.retryUpload")}
                </V2Text>
              </Pressable>
              <Pressable onPress={onDelete} style={styles.errorBtn}>
                <V2Text color={ERROR_TEXT[scheme]} lineBreakStrategyIOS="hangul-word" style={{ fontSize: 13, fontWeight: "600" }}>
                  {t("action.delete")}
                </V2Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>

      {!uploadFailed && (
        <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
          <V2Text color={DELETE_BTN_ICON} style={{ fontSize: 14, fontWeight: "700" }}>
            ✕
          </V2Text>
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
