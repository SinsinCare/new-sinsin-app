import { StyleSheet, useWindowDimensions, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"

import { V2BottomSheet, V2SheetScrollView } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
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

/*
  **고정 스냅을 버렸다.** 종전 `[36, 56]` 은 Tamagui 가 프레임을 **최대 스냅(56%)** 높이로
  눕히고 36% 만 보여 주는 구조라, 마지막 카테고리 행 한두 개가 화면 밖에 있었다. 안쪽
  ScrollView 도 자기 콘텐츠가 56% 상자에 다 들어가므로 스크롤되지 않았고, 핸들 탭으로
  스냅을 올리는 길도 껍데기가 막아 두어(onPress preventDefault) **닿을 방법이 없었다.**
  `V2BottomSheet` 는 콘텐츠 높이로 자라므로 이 조합 자체가 사라진다.

  목록이 길어질 때를 대비해 스크롤 상한만 남긴다 — 시트가 화면을 다 먹지 않게.
*/
const MAX_LIST_RATIO = 0.6
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
  const { height: windowHeight } = useWindowDimensions()

  const handleSelect = (key: string) => {
    hapticSelection()
    onSelect(key)
    onOpenChange(false)
  }

  return (
    <V2BottomSheet
      surface="community_post_category"
      visible={open}
      onClose={() => onOpenChange(false)}
    >
      <View
        style={[
          styles.sheetBody,
          { backgroundColor: surface.isDark ? surface.card : "#FFFFFF" },
        ]}
      >
        <V2SheetScrollView
          style={{ maxHeight: Math.round(windowHeight * MAX_LIST_RATIO) }}
          contentContainerStyle={styles.sheetContent}
        >
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
        </V2SheetScrollView>
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  // 부모가 콘텐츠 높이로 자라므로 flex:1 은 필요 없다(오히려 0 으로 접힌다).
  sheetBody: {},
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
