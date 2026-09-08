import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated"
import { V2BottomSheet } from "@/src/design-system-v2"
import { radius, spacing, typography } from "@/src/design-system-v2/tokens"
import { hapticSelection } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { useTranslation } from "react-i18next"

export interface MealSlotStatus {
  recorded: boolean
  skipped: boolean
  time?: string
  imageUri?: string | null
}

interface MealSheetProps {
  visible: boolean
  onClose: () => void
  /** 사진 촬영하기 → 앱 안의 푸드 카메라 페이지 */
  onCamera: () => void
  /** 글로 기록하기 → 글 입력 화면 */
  onText: () => void
  /** 레시피 불러오기 → 저장한 레시피 선택 */
  onRecipe: () => void
}

/**
 * 식사 기록 시트 — 등록 절차 시안(2026-09-04, `home.svg` 의 시트).
 *
 * 세 줄뿐이다: 사진 촬영하기 · 글로 기록하기 · 레시피 불러오기. 끼니 고르기·앨범·
 * 건너뛰기는 빠졌다 — "이제 시간만 기록한다"(사용자, 2026-09-04): 끼니는 사람이
 * 고르지 않고 기록 시각으로 정한다(`inferMealTypeFromTime`, 여는 쪽이 정한다).
 *
 * 제목·선택 항목·설명의 크기와 굵기를 나누고, 행은 큰 글자에 맞춰 자란다.
 */
export function MealSheet({
  visible,
  onClose,
  onCamera,
  onText,
  onRecipe,
}: MealSheetProps) {
  const { t } = useTranslation("common")
  const s = useSurface()

  const rows: {
    key: string
    icon: React.ComponentProps<typeof Ionicons>["name"]
    label: string
    description: string
    onPress: () => void
  }[] = [
    {
      key: "camera",
      icon: "camera-outline",
      label: t("home.sheet.meal.takePhoto"),
      description: t("home.sheet.meal.photoDescription"),
      onPress: onCamera,
    },
    {
      key: "text",
      icon: "create-outline",
      label: t("home.sheet.meal.writeText"),
      description: t("home.sheet.meal.textDescription"),
      onPress: onText,
    },
    {
      key: "recipe",
      icon: "book-outline",
      label: t("home.sheet.meal.importRecipe"),
      description: t("home.sheet.meal.recipeDescription"),
      onPress: onRecipe,
    },
  ]

  return (
    <V2BottomSheet
      surface="home_meal_record"
      visible={visible}
      onClose={onClose}
      title={t("home.sheet.meal.title")}
    >
      <View style={styles.body}>
        {rows.map((row, index) => (
          <Animated.View
            key={row.key}
            // 시트가 올라온 뒤 위에서부터 한 줄씩 — 세 선택지가 순서대로 읽힌다.
            entering={FadeInDown.delay(index * 35)
              .duration(200)
              .reduceMotion(ReduceMotion.System)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={row.label}
              accessibilityHint={row.description}
              onPress={() => {
                hapticSelection()
                row.onPress()
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? s.surfacePressed : "transparent" },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: s.surfaceSunken }]}>
                <Ionicons
                  name={row.icon}
                  size={24}
                  color={index === 0 ? s.brand : s.text}
                />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.label, { color: s.textStrong }]}>
                  {row.label}
                </Text>
                <Text
                  style={[styles.description, { color: s.text }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {row.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={s.textMuted} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing[24],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  row: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingVertical: spacing[12],
    borderRadius: radius.xl,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: spacing[4] },
  label: typography.title.xSmallWeak,
  description: typography.subtext.medium,
})
