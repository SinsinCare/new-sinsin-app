import { Pressable, useColorScheme } from "react-native"
import { XStack, Text } from "tamagui"
import { Icon } from "@/src/shared/components"
import { tokens } from "@/src/theme/tokens"

export function ConsultChatHeader({
  onHistoryPress,
  onNewChatPress,
}: {
  onHistoryPress: () => void
  onNewChatPress: () => void
}) {
  const colorScheme = useColorScheme()
  const headerColor = colorScheme === "dark" ? tokens.color.textDark.val : tokens.color.textLight.val

  return (
    <>
      <XStack
        paddingHorizontal={20}
        paddingVertical="$3"
        alignItems="center"
        justifyContent="space-between"
      >
        <Pressable onPress={onHistoryPress} hitSlop={8}>
          <Icon name="history" size={24} color={headerColor} />
        </Pressable>

        <Text
          fontSize="$5"
          fontWeight="700"
          color={headerColor}
          numberOfLines={1}
        >
          신신당부 상담
        </Text>

        <Pressable onPress={onNewChatPress} hitSlop={8}>
          <Icon name="plus" size={24} color={headerColor} />
        </Pressable>
      </XStack>
    </>
  )
}
