import { ConsultChevron, ConsultDisclosure } from "./ConsultDisclosure"
import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { V2Icon, V2Text, spacing, useV2Theme } from "@/src/design-system-v2"
import { useAppRouter } from "@/src/shared/navigation"
import { recipeSourceRoute, type ConsultSource } from "@/src/types/chat"

/** Recipe facts come from the read receipt, never from generated prose. */
export function ConsultRecipeCard({
  source,
  onDisclosure,
}: {
  source: ConsultSource
  onDisclosure?: () => void
}) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  const router = useAppRouter()
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)
  const card = source.recipe
  const meta = [
    card?.timeMin != null
      ? t("consult.recipeCard.minutes", { count: card.timeMin })
      : null,
    card?.servings != null
      ? t("consult.recipeCard.servings", { count: card.servings })
      : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const section = (
    kind: "ingredients" | "steps",
    open: boolean,
    toggle: () => void,
    count: number,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={t(`consult.recipeCard.${kind}`, { count })}
      onPress={() => {
        onDisclosure?.()
        toggle()
      }}
      style={({ pressed }) => [
        styles.disclosure,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <V2Text
        token="label.xSmall"
        color={colors.label.normal}
        style={styles.grow}
      >
        {t(`consult.recipeCard.${kind}`, { count })}
      </V2Text>
      <ConsultChevron open={open} />
    </Pressable>
  )
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: colors.line.normal,
          backgroundColor: colors.background.default,
        },
      ]}
    >
      <View style={styles.heading}>
        <V2Icon name="book" size={18} color={colors.label.neutral} />
        <View style={styles.headingCopy}>
          <V2Text
            token="label.small"
            color={colors.label.normal}
            lineBreakStrategyIOS="hangul-word"
          >
            {source.title}
          </V2Text>
          {!!meta && (
            <V2Text token="subtext.medium" color={colors.label.neutral}>
              {meta}
            </V2Text>
          )}
        </View>
      </View>
      {card && (
        <View style={[styles.sections, { borderColor: colors.line.normal }]}>
          {section(
            "ingredients",
            ingredientsOpen,
            () => setIngredientsOpen(!ingredientsOpen),
            card.ingredients.length,
          )}
          <ConsultDisclosure open={ingredientsOpen}>
            <View style={styles.ingredients}>
              {card.ingredients.length === 0 && (
                <V2Text token="subtext.medium" color={colors.label.neutral}>
                  {t("consult.recipeCard.noIngredients")}
                </V2Text>
              )}
              {card.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredient}>
                  <V2Text
                    token="subtext.medium"
                    style={styles.grow}
                    color={colors.label.normal}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {ingredient.name}
                  </V2Text>
                  <V2Text
                    token="subtext.medium"
                    color={colors.label.neutral}
                    style={styles.amount}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {ingredient.amount}
                  </V2Text>
                </View>
              ))}
            </View>
          </ConsultDisclosure>
          <View
            style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line.normal,
            }}
          >
            {section(
              "steps",
              stepsOpen,
              () => setStepsOpen(!stepsOpen),
              card.steps.length,
            )}
          </View>
          <ConsultDisclosure open={stepsOpen}>
            <View style={styles.steps}>
              {card.steps.length === 0 && (
                <V2Text token="subtext.medium" color={colors.label.neutral}>
                  {t("consult.recipeCard.noSteps")}
                </V2Text>
              )}
              {card.steps.map((step, index) => (
                <View key={index} style={styles.step}>
                  <V2Text
                    token="label.xSmall"
                    color={colors.label.neutral}
                    style={styles.ordinal}
                  >
                    {index + 1}
                  </V2Text>
                  <V2Text
                    token="body.xSmall"
                    color={colors.label.normal}
                    style={styles.grow}
                    lineBreakStrategyIOS="hangul-word"
                  >
                    {step}
                  </V2Text>
                </View>
              ))}
            </View>
          </ConsultDisclosure>
        </View>
      )}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t("consult.sources.openRecipe", {
          title: source.title,
        })}
        onPress={() => router.push(recipeSourceRoute(source))}
        style={({ pressed }) => [
          styles.link,
          {
            borderColor: colors.line.normal,
            backgroundColor: pressed
              ? colors.fill.normal
              : colors.fill.alternative,
          },
        ]}
      >
        <V2Text
          token="label.xSmall"
          color={colors.label.normal}
          style={styles.grow}
        >
          {t("consult.recipeCard.open")}
        </V2Text>
        <V2Icon name="chevronRight" size={16} color={colors.label.neutral} />
      </Pressable>
    </View>
  )
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  heading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[10],
    padding: spacing[16],
  },
  headingCopy: { flex: 1, gap: spacing[6] },
  grow: { flex: 1 },
  sections: {
    marginHorizontal: spacing[16],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disclosure: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingVertical: spacing[12],
  },
  ingredients: { gap: spacing[10], paddingBottom: spacing[16] },
  ingredient: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
  },
  amount: { maxWidth: "42%", textAlign: "right" },
  steps: { gap: spacing[12], paddingBottom: spacing[16] },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing[8] },
  ordinal: { minWidth: spacing[16], paddingTop: spacing[2] },
  link: {
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
})
