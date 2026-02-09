import { YStack, Text } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"

export function EmptyPostsPlaceholder() {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$8" gap="$3">
      <Ionicons
        name="chatbubbles-outline"
        size={48}
        color={tokens.color.grey7.val}
      />
      <Text fontSize="$5" fontWeight="600" color="$colorSubtle">
        아직 레시피가 없습니다
      </Text>
      <Text fontSize="$4" color="$colorSubtle" textAlign="center">
        + 버튼을 눌러 첫 번째 레시피를 공유해보세요
      </Text>
    </YStack>
  )
}
