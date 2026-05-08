import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Sheet } from "@tamagui/sheet"
import { YStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"

export type WriteType = "recipe" | "free"

interface WriteTypeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: WriteType) => void
}

const WRITE_OPTIONS: {
  type: WriteType
  icon: "chef" | "pencil"
  title: string
  description: string
}[] = [
  {
    type: "recipe",
    icon: "chef",
    title: "레시피",
    description: "추천하고 싶은 나만의 식단 가이드",
  },
  {
    type: "free",
    icon: "pencil",
    title: "자유글",
    description: "자유롭게 이야기를 공유해요!",
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
  dark: "#2C2C2E",
} as const

const HANDLE_COLOR = {
  light: "#D9D9DF",
  dark: "#858591",
} as const

export function WriteTypeSheet({
  open,
  onOpenChange,
  onSelect,
}: WriteTypeSheetProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"

  const handleSelect = (type: WriteType) => {
    onSelect(type)
    onOpenChange(false)
  }

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[25]}
      dismissOnSnapToBottom
      dismissOnOverlayPress
    >
      <Sheet.Overlay
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        backgroundColor={isDark ? SHEET_BG.dark : SHEET_BG.light}
        paddingBottom={34}
      >
        <Sheet.Handle
          marginHorizontal="auto"
          marginVertical={12}
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: isDark ? HANDLE_COLOR.dark : HANDLE_COLOR.light,
          }}
        />

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
                >
                  {option.title}
                </Text>
                <Text
                  fontSize={14}
                  fontWeight="400"
                  fontFamily="$body"
                  color={isDark ? DESC_COLOR.dark : DESC_COLOR.light}
                >
                  {option.description}
                </Text>
              </YStack>
            </Pressable>
          ))}
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}
