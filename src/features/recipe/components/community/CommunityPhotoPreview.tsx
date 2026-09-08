import { Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { AppModal } from "@/src/shared/components/AppModal"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { useSurface } from "@/src/hooks/useSurface"

export function CommunityPhotoPreview({
  uri,
  onClose,
}: {
  uri: string | null
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const s = useSurface()
  const { t } = useTranslation("common")
  return (
    <AppModal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: s.textStrong }]}>
        {uri && (
          <Image
            source={remoteImageSource(uri)}
            style={styles.image}
            contentFit="contain"
          />
        )}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("action.close")}
          style={[
            styles.close,
            { top: insets.top + 8, backgroundColor: s.canvas },
          ]}
        >
          <Ionicons name="close" size={24} color={s.textStrong} />
        </Pressable>
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "80%" },
  close: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
})
