import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Animated, {
  FadeIn,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
import {
  spacing,
  typography,
  useV2Theme,
  V2Icon,
  iconSize,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import type { MenuItemDto } from "../../types"

const NUTRIENTS = [
  ["calories", "kcal"],
  ["sodium", "mg"],
  ["potassium", "mg"],
  ["phosphorus", "mg"],
  ["protein", "g"],
] as const

export function MenuNutritionDisclosure({ menu }: { menu: MenuItemDto }) {
  const [expanded, setExpanded] = useState(false)
  const { t, i18n } = useTranslation("common")
  const { colors } = useV2Theme()
  return (
    <Animated.View
      layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("restaurant.detail.menuNutritionToggle", {
          name: menu.name,
        })}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text
          style={[typography.subtext.medium, { color: colors.label.neutral }]}
        >
          {t("restaurant.detail.menuNutrition")}
        </Text>
        <V2Icon
          name="chevronDown"
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          size={iconSize.xs}
          color={colors.label.alternative}
        />
      </Pressable>
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
          style={styles.details}
        >
          {NUTRIENTS.map(([key, unit]) => {
            const value = menu[key]
            const formatted =
              typeof value === "number" && Number.isFinite(value) && value >= 0
                ? `${value.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} ${unit}`
                : t("restaurant.detail.menuNutritionUnknown")
            return (
              <View key={key} style={styles.nutrient}>
                <Text
                  style={[
                    typography.subtext.medium,
                    { color: colors.label.alternative },
                  ]}
                >
                  {t(dynamicKey(`mealReport.nutrients.${key}`))}
                </Text>
                <Text
                  style={[
                    typography.subtext.medium,
                    { color: colors.label.normal },
                  ]}
                >
                  {formatted}
                </Text>
              </View>
            )
          })}
          <Text
            style={[
              typography.subtext.small,
              { color: colors.label.alternative },
            ]}
          >
            {t(
              menu.confidence === "VERIFIED"
                ? "restaurant.safety.verified"
                : "restaurant.safety.estimated",
            )}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    alignSelf: "flex-start",
  },
  details: { gap: spacing[8], paddingBottom: spacing[16] },
  nutrient: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing[16],
  },
})
