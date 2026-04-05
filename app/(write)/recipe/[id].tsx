import { useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"

export default function RecipeEditScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor={isDark ? tokens.color.appBgDark.val : tokens.color.offWhite.val}
    >
      <Text
        fontSize={18}
        fontWeight="600"
        fontFamily="$body"
        color={isDark ? tokens.color.textDark.val : tokens.color.textLight.val}
      >
        레시피 수정
      </Text>
    </YStack>
  )
}
