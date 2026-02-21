import { Pressable } from "react-native"
import { XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import { Icon } from "@/src/shared/components"

export function ConsultChatHeader({
  onHistoryPress,
  onClosePress,
}: {
  onHistoryPress: () => void
  onClosePress: () => void
}) {
  return (
    <>
      <XStack
        paddingHorizontal="20"
        paddingVertical="$3"
        alignItems="center"
        justifyContent="space-between"
      >
        <Pressable onPress={onHistoryPress} hitSlop={8}>
          <Icon name="history" size={24} color={tokens.color.grey1.val} />
        </Pressable>

        <Text fontSize="$5" fontWeight="700" color="$color" numberOfLines={1}>
          신신당부 상담
        </Text>

        <Pressable onPress={onClosePress} hitSlop={8}>
          <Icon name="x" size={24} color={tokens.color.grey1.val} />
        </Pressable>
      </XStack>
    </>
  )
}
