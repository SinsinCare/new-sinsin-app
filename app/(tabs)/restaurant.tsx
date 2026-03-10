import { useColorScheme } from "react-native"
import { YStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function RestaurantScreen() {
  const insets = useSafeAreaInsets()
  const isDarkMode = useColorScheme() === "dark"

  return (
    <YStack
      flex={1}
      backgroundColor={isDarkMode ? "#1F1F21" : "#FCFCFC"}
      paddingTop={insets.top}
      paddingHorizontal={16}
    >
      <Text
        fontSize={22}
        fontWeight="700"
        fontFamily="$body"
        color={isDarkMode ? "#E7E7EE" : "#2A2A37"}
        paddingVertical={16}
      >
        식당
      </Text>
    </YStack>
  )
}
