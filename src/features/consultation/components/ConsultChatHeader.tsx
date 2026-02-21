import { Pressable } from "react-native"
import { XStack, Text } from "tamagui"
import { useRouter } from "expo-router"
import { tokens } from "@/src/theme/tokens"
import { Icon } from "@/src/shared/components"

export function ConsultChatHeader() {
  const router = useRouter()

  return (
    <>
      <XStack
        paddingHorizontal="20"
        paddingVertical="$3"
        alignItems="center"
        justifyContent="space-between"
      >
        <Icon name="history" size={24} color={tokens.color.grey1.val} />

        <Text fontSize="$5" fontWeight="700" color="$color" numberOfLines={1}>
          신신당부 상담
        </Text>

        <Pressable onPress={() => router.navigate("/(tabs)/home")} hitSlop={8}>
          <Icon name="x" size={24} color={tokens.color.grey1.val} />
        </Pressable>
      </XStack>
    </>
  )
}
