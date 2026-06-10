import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import {
  AppBottomSheet,
  AppBottomSheetScrollView,
} from "@/src/shared/components"
import type { PostCategory } from "../types"

interface PostCategorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: PostCategory[]
  selectedKey: string
  onSelect: (key: string) => void
}

const SHEET_BG = {
  light: "#FFFFFF",
  dark: tokens.color.cardBgDark.val,
} as const

const LABEL_COLOR = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
} as const

const POST_CATEGORY_SNAP_POINTS = [36, 56]

export function PostCategorySheet({
  open,
  onOpenChange,
  categories,
  selectedKey,
  onSelect,
}: PostCategorySheetProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"

  const handleSelect = (key: string) => {
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
      <YStack
        flex={1}
        backgroundColor={isDark ? SHEET_BG.dark : SHEET_BG.light}
      >
        <AppBottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            gap: 2,
          }}
        >
          {categories.map((cat) => {
            const isSelected = cat.key === selectedKey
            return (
              <Pressable
                key={cat.key}
                onPress={() => handleSelect(cat.key)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 14,
                })}
              >
                <Text
                  fontSize={16}
                  fontWeight={isSelected ? "700" : "400"}
                  fontFamily="$body"
                  color={isDark ? LABEL_COLOR.dark : LABEL_COLOR.light}
                >
                  {cat.label}
                </Text>
                {isSelected && <Icon name="check-color" size={24} />}
              </Pressable>
            )
          })}
        </AppBottomSheetScrollView>
      </YStack>
    </AppBottomSheet>
  )
}
