import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"
import { AppBottomSheet } from "@/src/shared/components"
import { useTranslation } from "react-i18next"

export type WriteType = "recipe" | "free"

interface WriteTypeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: WriteType) => void
}

const WRITE_OPTIONS: {
  type: WriteType
  icon: "chef" | "pencil"
  titleKey: "writeType.recipeTitle" | "writeType.postTitle"
  descriptionKey: "writeType.recipeBody" | "writeType.postBody"
}[] = [
  {
    type: "recipe",
    icon: "chef",
    titleKey: "writeType.recipeTitle",
    descriptionKey: "writeType.recipeBody",
  },
  {
    type: "free",
    icon: "pencil",
    titleKey: "writeType.postTitle",
    descriptionKey: "writeType.postBody",
  },
]

const ICON_COLOR = {
  light: "#EE6145",
  dark: "#E77661",
} as const

const TITLE_COLOR = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
} as const

const DESC_COLOR = {
  light: "#8E8E93",
  dark: "#858591",
} as const

const SHEET_BG = {
  light: "#FFFFFF",
  dark: tokens.color.cardBgDark.val,
} as const

const WRITE_TYPE_SNAP_POINTS = [28]

export function WriteTypeSheet({
  open,
  onOpenChange,
  onSelect,
}: WriteTypeSheetProps) {
  const { t } = useTranslation("recipe")
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"

  const handleSelect = (type: WriteType) => {
    onSelect(type)
    onOpenChange(false)
  }

  return (
    <AppBottomSheet
      visible={open}
      onClose={() => onOpenChange(false)}
      snapPoints={WRITE_TYPE_SNAP_POINTS}
    >
      <YStack
        flex={1}
        backgroundColor={isDark ? SHEET_BG.dark : SHEET_BG.light}
      >
        <YStack paddingHorizontal={20} paddingTop={8} gap={4}>
          {WRITE_OPTIONS.map((option) => (
            <Pressable
              key={option.type}
              onPress={() => handleSelect(option.type)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                gap: 16,
              })}
            >
              <Icon
                name={option.icon}
                size={28}
                color={isDark ? ICON_COLOR.dark : ICON_COLOR.light}
              />
              <YStack gap={2}>
                <Text
                  fontSize={17}
                  fontWeight="700"
                  fontFamily="$body"
                  color={isDark ? TITLE_COLOR.dark : TITLE_COLOR.light}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t(option.titleKey)}
                </Text>
                <Text
                  fontSize={14}
                  fontWeight="400"
                  fontFamily="$body"
                  color={isDark ? DESC_COLOR.dark : DESC_COLOR.light}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {t(option.descriptionKey)}
                </Text>
              </YStack>
            </Pressable>
          ))}
        </YStack>
      </YStack>
    </AppBottomSheet>
  )
}
