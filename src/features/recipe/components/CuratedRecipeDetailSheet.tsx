import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import type { CuratedRecipe } from "../data/curatedRecipeTypes"

const COLORS = {
  light: {
    bg: "#FFFFFF",
    overlay: "rgba(0,0,0,0.45)",
    title: tokens.color.textLight.val,
    sub: "#8E8E93",
    sectionTitle: tokens.color.textLight.val,
    label: "#636366",
    value: tokens.color.textLight.val,
    aiBoxBg: "#F2F2F7",
    divider: "#E5E5EA",
    badgeBg: "#F2F2F7",
    badgeText: "#636366",
    categoryBg: "#EEF7F4",
    categoryText: tokens.color.sub8.val,
    nutritionBg: "#F9F9FB",
    nutritionBorder: "#E5E5EA",
  },
  dark: {
    bg: tokens.color.cardBgDark.val,
    overlay: "rgba(0,0,0,0.65)",
    title: tokens.color.textDark.val,
    sub: tokens.color.textDarkSub.val,
    sectionTitle: tokens.color.textDark.val,
    label: tokens.color.textDarkSub.val,
    value: tokens.color.textDark.val,
    aiBoxBg: "#26262D",
    divider: "#3A3A42",
    badgeBg: "#3A3A42",
    badgeText: tokens.color.textDarkSub.val,
    categoryBg: "#1B3830",
    categoryText: "#44AF94",
    nutritionBg: "#26262D",
    nutritionBorder: "#3A3A42",
  },
} as const

const FRIENDLINESS_CONFIG = {
  low_risk: { label: "신장 안전", bg: "#D1FAE5", text: "#065F46" },
  moderate: { label: "적당히 섭취", bg: "#FEF3C7", text: "#92400E" },
  high_risk: { label: "주의 필요", bg: "#FEE2E2", text: "#991B1B" },
  caution: { label: "주의 필요", bg: "#FEE2E2", text: "#991B1B" },
} as const

interface CuratedRecipeDetailSheetProps {
  recipe: CuratedRecipe | null
  visible: boolean
  onClose: () => void
}

function NutrientBox({
  label,
  value,
  palette,
}: {
  label: string
  value: string
  palette: (typeof COLORS)["light" | "dark"]
}) {
  return (
    <YStack
      flex={1}
      backgroundColor={palette.nutritionBg}
      borderRadius={10}
      padding={10}
      gap={4}
      borderWidth={1}
      borderColor={palette.nutritionBorder}
      alignItems="center"
    >
      <Text fontSize={12} fontFamily="$body" color={palette.label}>
        {label}
      </Text>
      <Text fontSize={15} fontWeight="700" fontFamily="$body" color={palette.value}>
        {value}
      </Text>
    </YStack>
  )
}

export function CuratedRecipeDetailSheet({
  recipe,
  visible,
  onClose,
}: CuratedRecipeDetailSheetProps) {
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light
  const insets = useSafeAreaInsets()
  const { height: screenHeight } = useWindowDimensions()

  if (!recipe) return null

  const friendlinessKey = recipe.nutrition.ckd_friendliness as keyof typeof FRIENDLINESS_CONFIG
  const friendlinessConfig =
    FRIENDLINESS_CONFIG[friendlinessKey] ?? FRIENDLINESS_CONFIG.moderate

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Overlay tap to close */}
      <Pressable style={[styles.overlay, { backgroundColor: palette.overlay }]} onPress={onClose} />

      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={palette.bg}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        style={{ maxHeight: screenHeight * 0.85 }}
        paddingBottom={insets.bottom + 16}
      >
        {/* Handle bar */}
        <YStack alignItems="center" paddingTop={12} paddingBottom={4}>
          <View width={40} height={4} borderRadius={2} backgroundColor={palette.divider} />
        </YStack>

        {/* Header */}
        <XStack
          paddingHorizontal={20}
          paddingVertical={12}
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <YStack flex={1} gap={6} paddingRight={12}>
            <Text
              fontSize={20}
              fontWeight="700"
              fontFamily="$body"
              color={palette.title}
              lineHeight={28}
            >
              {recipe.name}
            </Text>
            <XStack gap={8} alignItems="center" flexWrap="wrap">
              <XStack
                paddingHorizontal={8}
                paddingVertical={4}
                borderRadius={8}
                backgroundColor={palette.categoryBg}
              >
                <Text fontSize={12} fontWeight="600" fontFamily="$body" color={palette.categoryText}>
                  {recipe.category}
                </Text>
              </XStack>
              <XStack
                paddingHorizontal={8}
                paddingVertical={4}
                borderRadius={8}
                backgroundColor={friendlinessConfig.bg}
              >
                <Text fontSize={12} fontWeight="600" fontFamily="$body" color={friendlinessConfig.text}>
                  {friendlinessConfig.label}
                </Text>
              </XStack>
            </XStack>
          </YStack>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor={palette.badgeBg}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={16} fontFamily="$body" color={palette.label}>
                ✕
              </Text>
            </View>
          </Pressable>
        </XStack>

        <View height={1} backgroundColor={palette.divider} marginHorizontal={20} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 20 }}
        >
          {/* AI 한줄평 */}
          <YStack
            backgroundColor={palette.aiBoxBg}
            borderRadius={12}
            padding={14}
            gap={4}
          >
            <Text fontSize={12} fontWeight="600" fontFamily="$body" color={palette.categoryText}>
              AI 한줄평
            </Text>
            <Text
              fontSize={14}
              fontFamily="$body"
              color={palette.sub}
              lineHeight={20}
              fontStyle="italic"
            >
              {recipe.ai_summary.headline}
            </Text>
          </YStack>

          {/* 영양정보 */}
          <YStack gap={10}>
            <Text fontSize={16} fontWeight="700" fontFamily="$body" color={palette.sectionTitle}>
              영양정보
            </Text>
            <XStack gap={8}>
              <NutrientBox label="나트륨" value={`${recipe.nutrition.sodium_mg}mg`} palette={palette} />
              <NutrientBox label="칼륨" value={`${recipe.nutrition.potassium_mg}mg`} palette={palette} />
              <NutrientBox label="인" value={`${recipe.nutrition.phosphorus_mg}mg`} palette={palette} />
            </XStack>
            <XStack gap={8}>
              <NutrientBox label="단백질" value={`${recipe.nutrition.protein_g}g`} palette={palette} />
              <NutrientBox label="칼로리" value={`${recipe.nutrition.kcal}kcal`} palette={palette} />
              <YStack flex={1} />
            </XStack>
          </YStack>

          {/* CKD 가이드 */}
          {(recipe.ckd_guide.CKD3 || recipe.ckd_guide.CKD4 || recipe.ckd_guide.dialysis) && (
            <YStack gap={10}>
              <Text fontSize={16} fontWeight="700" fontFamily="$body" color={palette.sectionTitle}>
                CKD 단계별 가이드
              </Text>
              <YStack gap={8}>
                {recipe.ckd_guide.CKD3 && (
                  <XStack gap={10} alignItems="flex-start">
                    <XStack
                      paddingHorizontal={8}
                      paddingVertical={3}
                      borderRadius={6}
                      backgroundColor="#EEF7F4"
                      minWidth={60}
                      justifyContent="center"
                    >
                      <Text fontSize={12} fontWeight="600" fontFamily="$body" color={tokens.color.sub8.val}>
                        CKD 3기
                      </Text>
                    </XStack>
                    <Text fontSize={14} fontFamily="$body" color={palette.sub} flex={1} lineHeight={20}>
                      {recipe.ckd_guide.CKD3}
                    </Text>
                  </XStack>
                )}
                {recipe.ckd_guide.CKD4 && (
                  <XStack gap={10} alignItems="flex-start">
                    <XStack
                      paddingHorizontal={8}
                      paddingVertical={3}
                      borderRadius={6}
                      backgroundColor="#EEF7F4"
                      minWidth={60}
                      justifyContent="center"
                    >
                      <Text fontSize={12} fontWeight="600" fontFamily="$body" color={tokens.color.sub8.val}>
                        CKD 4기
                      </Text>
                    </XStack>
                    <Text fontSize={14} fontFamily="$body" color={palette.sub} flex={1} lineHeight={20}>
                      {recipe.ckd_guide.CKD4}
                    </Text>
                  </XStack>
                )}
                {recipe.ckd_guide.dialysis && (
                  <XStack gap={10} alignItems="flex-start">
                    <XStack
                      paddingHorizontal={8}
                      paddingVertical={3}
                      borderRadius={6}
                      backgroundColor="#FEF3C7"
                      minWidth={60}
                      justifyContent="center"
                    >
                      <Text fontSize={12} fontWeight="600" fontFamily="$body" color="#92400E">
                        투석
                      </Text>
                    </XStack>
                    <Text fontSize={14} fontFamily="$body" color={palette.sub} flex={1} lineHeight={20}>
                      {recipe.ckd_guide.dialysis}
                    </Text>
                  </XStack>
                )}
              </YStack>
            </YStack>
          )}

          {/* 재료 */}
          {recipe.ingredients.length > 0 && (
            <YStack gap={10}>
              <Text fontSize={16} fontWeight="700" fontFamily="$body" color={palette.sectionTitle}>
                재료 ({recipe.servings}인분)
              </Text>
              <YStack gap={6}>
                {recipe.ingredients.map((ing, idx) => (
                  <XStack
                    key={idx}
                    justifyContent="space-between"
                    paddingVertical={6}
                    borderBottomWidth={idx < recipe.ingredients.length - 1 ? 1 : 0}
                    borderBottomColor={palette.divider}
                  >
                    <Text fontSize={14} fontFamily="$body" color={palette.value}>
                      {ing.name}
                    </Text>
                    <Text fontSize={14} fontFamily="$body" color={palette.sub}>
                      {ing.amount}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          )}

          {/* 조리순서 */}
          {recipe.steps.length > 0 && (
            <YStack gap={10}>
              <Text fontSize={16} fontWeight="700" fontFamily="$body" color={palette.sectionTitle}>
                조리순서
              </Text>
              <YStack gap={12}>
                {recipe.steps.map((step) => (
                  <XStack key={step.order} gap={12} alignItems="flex-start">
                    <YStack
                      width={28}
                      height={28}
                      borderRadius={14}
                      backgroundColor={palette.categoryBg}
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Text fontSize={13} fontWeight="700" fontFamily="$body" color={palette.categoryText}>
                        {step.order}
                      </Text>
                    </YStack>
                    <Text
                      fontSize={14}
                      fontFamily="$body"
                      color={palette.value}
                      flex={1}
                      lineHeight={22}
                      paddingTop={3}
                    >
                      {step.content}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </YStack>
          )}

          {/* Bottom spacer */}
          <YStack height={8} />
        </ScrollView>
      </YStack>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
})
