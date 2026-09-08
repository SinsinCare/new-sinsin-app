import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import {
  V2Text,
  V2Skeleton,
  V2SkeletonGroup,
  borderWidth,
  radius,
  spacing,
  useV2Theme,
} from "@/src/design-system-v2"
import type { RecipeBrowseScreenModel } from "../../hooks/useRecipeBrowseScreen"
import type { MealSlot } from "../../types/recipeHome"
import { RecipePhotoCard } from "./RecipePhotoCard"
import {
  mealSectionCopyKeys,
  mealSlotWordKey,
  resolveMealSectionDay,
  resolveMealSectionBadgeKey,
} from "./recipeHomePresentation"
import { selectRecipeMealSection } from "./recipeDiscoveryModel"

/** One meal rail keeps the full recipe list within reach; server ordering still chooses the first meal. */
export function RecipeMealDiscovery({
  model: m,
}: {
  model: RecipeBrowseScreenModel
}) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const [selectedSlot, setSelectedSlot] = useState<MealSlot | null>(null)
  const section = selectRecipeMealSection(m.homeSections, selectedSlot)
  if (m.homeIsError && !section)
    return (
      <View style={styles.state}>
        <V2Text token="subtext.medium" color={colors.label.neutral}>
          {t("list.errorTitle")}
        </V2Text>
        <Pressable
          onPress={() => void m.refetchHome()}
          accessibilityRole="button"
          style={styles.retry}
        >
          <V2Text token="label.xSmall" color={colors.label.normal}>
            {t("list.retry")}
          </V2Text>
        </Pressable>
      </View>
    )
  if (!section)
    return m.homeIsLoading ? (
      <V2SkeletonGroup style={styles.loading}>
        <V2Skeleton width="48%" height={21} />
        <V2Skeleton width="65%" height={32} />
        <V2Skeleton height={112} radius="lg" />
      </V2SkeletonGroup>
    ) : null
  const day = resolveMealSectionDay(section.slot, m.homeSlotDecision)
  const copy = mealSectionCopyKeys(section.slot, day)
  const badge = resolveMealSectionBadgeKey({ state: section.state, day })
  return (
    <View
      style={[styles.section, { borderBottomColor: colors.background.lower }]}
    >
      <View style={styles.heading}>
        <V2Text
          token="label.smallStrong"
          color={colors.label.normal}
          accessibilityRole="header"
        >
          {t(copy.title)}
        </V2Text>
        {badge && (
          <V2Text token="subtext.small" color={colors.label.neutral}>
            {t(badge)}
          </V2Text>
        )}
      </View>
      <View style={styles.tabs}>
        {m.homeSections.map((meal) => {
          const selected = meal.slot === section.slot
          return (
            <Pressable
              key={meal.slot}
              onPress={() => setSelectedSlot(meal.slot)}
              accessibilityRole="tab"
              accessibilityLabel={t(mealSlotWordKey(meal.slot))}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.tab,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <View
                style={[
                  styles.tabFace,
                  {
                    borderBottomColor: selected
                      ? colors.label.normal
                      : "transparent",
                  },
                ]}
              >
                <V2Text
                  token={selected ? "label.xSmall" : "subtext.medium"}
                  color={selected ? colors.label.normal : colors.label.neutral}
                >
                  {t(mealSlotWordKey(meal.slot))}
                </V2Text>
              </View>
            </Pressable>
          )
        })}
      </View>
      {m.slotReason && (
        <V2Text
          token="subtext.small"
          style={styles.reason}
          color={colors.label.neutral}
        >
          {t(m.slotReason.key, {
            meal: t(mealSlotWordKey(m.slotReason.mealSlot)),
          })}
        </V2Text>
      )}
      <View style={styles.preview}>
        {section.items.length ? (
          <ScrollView
            key={section.slot}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.track}
          >
            {section.items.map((card) => (
              <View
                key={card.id}
                style={[styles.card, { borderColor: colors.line.normal }]}
              >
                <RecipePhotoCard
                  card={card}
                  variant="row"
                  onPress={m.handleOpenRecipe}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.empty}>
            <V2Text token="subtext.medium" color={colors.label.neutral}>
              {t("home.section.empty")}
            </V2Text>
          </View>
        )}
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  section: {
    paddingTop: spacing[20],
    paddingBottom: spacing[20],
    borderBottomWidth: spacing[8],
  },
  heading: {
    paddingHorizontal: spacing[20],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  tabs: {
    paddingHorizontal: spacing[20],
    flexDirection: "row",
    gap: spacing[6],
    marginTop: spacing[6],
  },
  tab: { paddingVertical: spacing[6] },
  tabFace: {
    minHeight: 32,
    paddingHorizontal: spacing[16],
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: borderWidth.thick,
  },
  preview: { minHeight: 112, marginTop: spacing[6] },
  track: { paddingHorizontal: spacing[20], gap: spacing[12] },
  card: {
    width: 280,
    paddingHorizontal: spacing[12],
    borderWidth: borderWidth.thin,
    borderRadius: radius.lg,
    justifyContent: "center",
  },
  reason: { marginHorizontal: spacing[20], marginBottom: spacing[4] },
  empty: {
    minHeight: 112,
    paddingHorizontal: spacing[20],
    justifyContent: "center",
  },
  loading: { padding: spacing[20], gap: spacing[12] },
  state: { padding: spacing[20], gap: spacing[4] },
  retry: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
})
