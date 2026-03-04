import { useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"

export default function FreePostEditScreen() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor={isDark ? "#1F1F21" : "#FCFCFC"}
    >
      <Text
        fontSize={18}
        fontWeight="600"
        fontFamily="$body"
        color={isDark ? "#E7E7EE" : "#2A2A37"}
      >
        자유글 수정
      </Text>
    </YStack>
  )
}
