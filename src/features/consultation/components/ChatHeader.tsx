import { Pressable, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { XStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useAppRouter } from "@/src/shared/navigation"
import { tokens } from "@/src/theme/tokens"

interface ChatHeaderProps {
  title: string
}

export function ChatHeader({ title }: ChatHeaderProps) {
  const router = useAppRouter()
  const colorScheme = useAppColorScheme()
  const iconColor = colorScheme === "dark" ? "#e7e7ee" : tokens.color.grey1.val

  return (
    <>
      <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={iconColor} />
        </Pressable>
        <Text
          fontSize="$5"
          fontWeight="700"
          color="$color"
          flex={1}
          textAlign="center"
          numberOfLines={1}
        >
          {title}
        </Text>
        {/* Spacer to balance back button */}
        <View style={{ width: 24 }} />
      </XStack>
      <View style={{ height: 1, backgroundColor: tokens.color.grey8.val }} />
    </>
  )
}
