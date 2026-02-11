import { YStack, Text } from "tamagui"

export function ConsultHeader() {
  return (
    <YStack
      paddingHorizontal="$5"
      paddingBottom="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <Text
        fontFamily="$heading"
        fontSize="$8"
        fontWeight="700"
        color="$color"
        textAlign="center"
      >
        상담
      </Text>
    </YStack>
  )
}
