import { Pressable, useColorScheme } from "react-native"
import { Sheet } from "@tamagui/sheet"
import { YStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components/Icon"
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
  dark: "#2C2C2E",
} as const

const HANDLE_COLOR = {
  light: "#D9D9DF",
  dark: "#858591",
} as const

const LABEL_COLOR = {
  light: "#2A2A37",
  dark: "#E7E7EE",
} as const

export function PostCategorySheet({
  open,
  onOpenChange,
  categories,
  selectedKey,
  onSelect,
}: PostCategorySheetProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const handleSelect = (key: string) => {
    onSelect(key)
    onOpenChange(false)
  }

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[35]}
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
        <YStack paddingHorizontal={20} paddingTop={8} gap={2}>
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
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}
