import { StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import {
  AppBottomSheet,
  AppBottomSheetScrollView,
} from "@/src/shared/components"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import type { PostCategory } from "../types"
import { useTranslation } from "react-i18next"

interface PostCategorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: PostCategory[]
  selectedKey: string
  onSelect: (key: string) => void
}

const POST_CATEGORY_SNAP_POINTS = [36, 56]
const POST_CATEGORY_LABEL_KEYS = {
  diet: "category.post.diet",
  numbers: "category.post.numbers",
  symptoms: "category.post.symptoms",
  medicine: "category.post.medicine",
  "dining-out": "category.post.dining-out",
  daily: "category.post.daily",
} as const

export function PostCategorySheet({
  open,
  onOpenChange,
  categories,
  selectedKey,
  onSelect,
}: PostCategorySheetProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  const handleSelect = (key: string) => {
    hapticSelection()
    onSelect(key)
    onOpenChange(false)
  }

  return (
    <AppBottomSheet
      visible={open}
      onClose={() => onOpenChange(false)}
      snapPoints={POST_CATEGORY_SNAP_POINTS}
      contentBottomPadding={false}
    >
      <View
        style={[
          styles.sheetBody,
          { backgroundColor: surface.isDark ? surface.card : "#FFFFFF" },
        ]}
      >
        <AppBottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text
            style={[styles.sheetTitle, { color: surface.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("freePost.topicTitle")}
          </Text>
          {categories.map((cat) => {
            const isSelected = cat.key === selectedKey
            return (
              <SurfacePressable
                key={cat.key}
                onPress={() => handleSelect(cat.key)}
                haptic={false}
                accessibilityState={{ selected: isSelected }}
                baseColor={surface.isDark ? surface.card : "#FFFFFF"}
                pressScale={0.99}
                style={styles.row}
              >
                <Text
                  style={[
                    styles.rowLabel,
                    isSelected
                      ? [styles.rowLabelSelected, { color: surface.textStrong }]
                      : { color: surface.text },
                  ]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {POST_CATEGORY_LABEL_KEYS[
                    cat.key as keyof typeof POST_CATEGORY_LABEL_KEYS
                  ]
                    ? t(
                        POST_CATEGORY_LABEL_KEYS[
                          cat.key as keyof typeof POST_CATEGORY_LABEL_KEYS
                        ],
                      )
                    : cat.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={surface.brand} />
                )}
              </SurfacePressable>
            )
          })}
        </AppBottomSheetScrollView>
      </View>
    </AppBottomSheet>
  )
}

const styles = StyleSheet.create({
  sheetBody: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  sheetTitle: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  row: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 15.5,
    lineHeight: 22,
    letterSpacing: -0.31,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  rowLabelSelected: {
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
})
