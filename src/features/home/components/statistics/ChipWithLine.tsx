import { View } from "react-native"
import { Text, XStack } from "tamagui"

interface ChipWithLineProps {
  label: string
  isOver?: boolean
}

export function ChipWithLine({ label, isOver }: ChipWithLineProps) {
  return (
    <View style={{ alignItems: "center" }}>
      <XStack
        backgroundColor={isOver ? "$primaryLight" : "$borderColor"}
        borderRadius={6}
        paddingHorizontal={6}
        paddingVertical={2}
        bottom="$1"
      >
        <Text
          fontSize="$3"
          color={isOver ? "$primary" : "$color"}
          paddingVertical={1}
        >
          {label}
        </Text>
      </XStack>
    </View>
  )
}
