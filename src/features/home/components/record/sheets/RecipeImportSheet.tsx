import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import { Image } from "expo-image"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import {
  V2BottomSheet,
  V2Button,
  V2DotLoader,
  V2SheetScrollView,
} from "@/src/design-system-v2"
import { radius, spacing, typography } from "@/src/design-system-v2/tokens"
import { Text } from "@/src/shared/components/AppText"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import { useSavedRecipes } from "@/src/features/recipe/hooks/useSavedRecipes"
import { EMPTY_RECIPE_FILTERS } from "@/src/features/recipe/components/list/recipeListFilterModel"
import type { RecipeCard } from "@/src/features/recipe/types/recipeListV2"

interface RecipeImportSheetProps {
  visible: boolean
  onClose: () => void
  onPick: (recipe: RecipeCard) => void
  onText: () => void
  importingId: number | null
}

export function RecipeImportSheet({
  visible,
  onClose,
  onPick,
  onText,
  importingId,
}: RecipeImportSheetProps) {
  const { t } = useTranslation("common")
  const s = useSurface()
  const { height } = useWindowDimensions()
  const {
    recipes,
    isLoading,
    isError,
    retry,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
  } = useSavedRecipes({ q: "", filter: EMPTY_RECIPE_FILTERS, enabled: visible })
  return (
    <V2BottomSheet
      surface="home_meal_record"
      visible={visible}
      onClose={onClose}
      title={t("home.sheet.recipeImport.title")}
      subTitle={t("home.sheet.recipeImport.body")}
    >
      {recipes.length === 0 ? (
        <View style={styles.empty}>
          {isLoading ? (
            <V2DotLoader size="m" color={s.textMuted} />
          ) : (
            <View
              style={[styles.emptyIcon, { backgroundColor: s.surfaceSunken }]}
            >
              <Ionicons
                name={isError ? "refresh-outline" : "book-outline"}
                size={28}
                color={s.text}
              />
            </View>
          )}
          <Text
            style={[styles.emptyLabel, { color: s.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t(
              isLoading
                ? "home.sheet.recipeImport.loading"
                : isError
                  ? "home.sheet.recipeImport.error"
                  : "home.sheet.recipeImport.empty",
            )}
          </Text>
          {!isLoading && (
            <V2Button
              color="neutral"
              variant="weak"
              size="l"
              multilineLabel
              onPress={isError ? retry : onText}
            >
              {t(
                isError
                  ? "home.sheet.recipeImport.retry"
                  : "home.sheet.meal.writeText",
              )}
            </V2Button>
          )}
        </View>
      ) : (
        <V2SheetScrollView
          style={{ maxHeight: Math.min(420, height * 0.5) }}
          contentContainerStyle={styles.list}
        >
          {recipes.map((recipe) => {
            const importing = importingId === recipe.id
            return (
              <Pressable
                key={recipe.id}
                accessibilityRole="button"
                accessibilityLabel={recipe.name}
                accessibilityState={{
                  disabled: importingId !== null,
                  busy: importing,
                }}
                disabled={importingId !== null}
                onPress={() => {
                  hapticSelection()
                  onPick(recipe)
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? s.surfacePressed : "transparent",
                    opacity: importingId !== null && !importing ? 0.5 : 1,
                  },
                ]}
              >
                {recipe.thumbnailUrl ? (
                  <Image
                    source={remoteImageSource(recipe.thumbnailUrl)}
                    style={[styles.thumb, { backgroundColor: s.surfaceSunken }]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.thumb,
                      styles.thumbFallback,
                      { backgroundColor: s.surfaceSunken },
                    ]}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={22}
                      color={s.textMuted}
                    />
                  </View>
                )}
                <Text
                  style={[styles.name, { color: s.textStrong }]}
                  numberOfLines={2}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {recipe.name}
                </Text>
                {importing ? (
                  <V2DotLoader size="s" color={s.brand} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={s.textMuted}
                  />
                )}
              </Pressable>
            )
          })}
          {importingId !== null && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.status, { color: s.text }]}
            >
              {t("home.sheet.recipeImport.importing")}
            </Text>
          )}
          {isError ? (
            <V2Button color="neutral" variant="weak" onPress={retry}>
              {t("home.sheet.recipeImport.retry")}
            </V2Button>
          ) : hasNextPage ? (
            <V2Button
              color="neutral"
              variant="weak"
              loading={isFetchingNextPage}
              disabled={importingId !== null}
              onPress={loadMore}
            >
              {t("home.sheet.recipeImport.more")}
            </V2Button>
          ) : null}
        </V2SheetScrollView>
      )}
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[16],
    gap: spacing[8],
  },
  row: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[12],
    borderRadius: radius.xl,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.xl },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  name: { ...typography.title.xSmallWeak, flex: 1 },
  empty: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[20],
    paddingBottom: spacing[24],
    alignItems: "center",
    gap: spacing[16],
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyLabel: { ...typography.subtext.large, textAlign: "center" },
  status: {
    ...typography.subtext.medium,
    paddingVertical: spacing[8],
    textAlign: "center",
  },
})
