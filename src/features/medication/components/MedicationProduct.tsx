import { Image, Pressable, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { medStyles, FORM } from "./medicationStyles"
import type { Drug } from "../types"
export function MedicationProduct({
  drug,
  onPress,
  trailing,
}: {
  drug: Drug
  onPress?: () => void
  trailing?: string
}) {
  const s = useSurface()
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[
        medStyles.row,
        {
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: s.border,
        },
      ]}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          backgroundColor: s.surfaceSunken,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {drug.imageUrl ? (
          <Image
            source={{ uri: drug.imageUrl }}
            style={{ width: 52, height: 52 }}
            resizeMode="contain"
          />
        ) : (
          <Ionicons name="medical-outline" size={24} color={s.textMuted} />
        )}
      </View>
      <View style={[medStyles.grow, { gap: 4 }]}>
        <V2Text style={FORM.option} color={s.textStrong}>
          {drug.name}
        </V2Text>
        <V2Text style={FORM.hint} color={s.text}>
          {[drug.manufacturer, drug.ingredients].filter(Boolean).join(" · ")}
        </V2Text>
      </View>
      {trailing ? (
        <V2Text style={FORM.hint} color={s.textStrong}>
          {trailing}
        </V2Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={s.textMuted} />
      ) : null}
    </Pressable>
  )
}
