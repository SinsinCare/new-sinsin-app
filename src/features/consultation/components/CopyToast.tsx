import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { XStack, Text } from "tamagui"

export function CopyToast({ message }: { message: string }) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{ alignSelf: "center" }}
    >
      <XStack
        backgroundColor={"#8e8e95"}
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderRadius="$9"
        marginBottom="$4"
      >
        <Text
          color={"#FDFDFD"}
          fontSize="14"
          fontFamily="$body"
          textAlign="center"
          width="fit-content"
        >
          {message}
        </Text>
      </XStack>
    </Animated.View>
  )
}
