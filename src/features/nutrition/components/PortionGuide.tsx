import { PersonalPortionCalculator } from "./PersonalPortionCalculator"
import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Animated, {
  FadeIn,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { Text } from "@/src/design-system-v2/primitives/NativeText"
import { spacing, typography, V2Icon, useV2Theme } from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"
import {
  portionLabel,
  readPortionReference,
  type PersonalPortionSelection,
} from "../utils/portionReference"

export function PortionGuide({
  reference,
  menu = false,
  onConsult,
  isRefreshing = false,
}: {
  reference: unknown
  menu?: boolean
  isRefreshing?: boolean
  onConsult?: (selection: PersonalPortionSelection) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const value = readPortionReference(reference)
  if (!value)
    return (
      <Text
        style={[typography.subtext.medium, { color: colors.label.alternative }]}
      >
        {t("portionGuide.unavailable")}
      </Text>
    )
  const unit = t(menu ? "portionGuide.menuUnit" : "portionGuide.recipeUnit")
  const title = menu
    ? value.fraction === null
      ? t("portionGuide.menuBelowQuarter")
      : value.fraction === 1
        ? t("portionGuide.menuWhole")
        : t("portionGuide.menuAmount", {
            amount:
              value.fraction === 0.5
                ? t("portionGuide.half")
                : portionLabel(value.fraction),
          })
    : value.fraction === null
      ? t("portionGuide.belowQuarter", { unit })
      : t("portionGuide.amount", { amount: portionLabel(value.fraction), unit })
  return (
    <Animated.View
      layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)}
      style={styles.root}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${value.personal ? t("portionGuide.personalOpen") : title}, ${t("portionGuide.driver", { nutrient: t(dynamicKey(`mealReport.nutrients.${value.driver}`)) })}, ${t("portionGuide.basis")}`}
        accessibilityState={{ expanded }}
        style={styles.toggle}
      >
        <View style={styles.copy}>
          <Text
            style={[typography.label.small, { color: colors.label.normal }]}
          >
            {value.personal ? t("portionGuide.personalOpen") : title}
          </Text>
          <Text
            style={[typography.subtext.small, { color: colors.label.neutral }]}
          >
            {value.personal
              ? title
              : t("portionGuide.driver", {
                  nutrient: t(
                    dynamicKey(`mealReport.nutrients.${value.driver}`),
                  ),
                })}
          </Text>
        </View>
        <V2Icon
          name="chevronDown"
          size={14}
          color={colors.label.alternative}
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </Pressable>
      {!menu && (
        <Text
          style={[typography.subtext.small, { color: colors.label.neutral }]}
        >
          {t("portionGuide.otherFood")}
        </Text>
      )}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
          style={styles.details}
        >
          {value.personal && (
            <PersonalPortionCalculator
              key={JSON.stringify(value.personal)}
              onConsult={onConsult}
              isRefreshing={isRefreshing}
              input={value.personal}
              menu={menu}
            />
          )}
          <Text
            style={[typography.subtext.small, { color: colors.label.neutral }]}
          >
            {t("portionGuide.explanation", {
              percent: Math.round(value.mealFraction * 100),
            })}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  )
}
const styles = StyleSheet.create({
  root: { gap: spacing[4] },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minHeight: 44,
  },
  copy: { flex: 1, gap: spacing[4] },
  details: { paddingTop: spacing[4] },
})
