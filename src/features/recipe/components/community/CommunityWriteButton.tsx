import { StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { useAppRouter } from "@/src/shared/navigation"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { floatingAiButtonBottomInScreen } from "@/src/shared/components/floatingAiButtonLayout"
import { V2Text } from "@/src/design-system-v2"
import { spacing, typography } from "@/src/design-system-v2/tokens"
import { COMMUNITY_GUTTER } from "./communityLayout"

/** Community has one primary floating action, positioned immediately above the tab bar. */
export function CommunityWriteButton() {
  const s = useSurface()
  const router = useAppRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation("common")
  return (
    <View
      style={[
        styles.position,
        { bottom: floatingAiButtonBottomInScreen(insets.bottom) },
      ]}
    >
      <SurfacePressable
        onPress={() => router.push("/free/new")}
        accessibilityLabel={t("community.writeAccessibility")}
        baseColor={s.brand}
        pressScale={0.98}
        style={styles.button}
      >
        <Ionicons name="add" size={20} color={s.onBrand} />
        <V2Text style={typography.label.small} color={s.onBrand}>
          {t("community.write")}
        </V2Text>
      </SurfacePressable>
    </View>
  )
}
const styles = StyleSheet.create({
  position: {
    position: "absolute",
    right: COMMUNITY_GUTTER,
  },
  button: {
    minHeight: 48,
    borderRadius: spacing[24],
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    flexDirection: "row",
    gap: spacing[8],
    alignItems: "center",
  },
})
