import { StyleSheet, View } from "react-native"

import { useV2Theme, V2HStack, V2Text } from "@/src/design-system-v2"

interface ChipWithLineProps {
  label: string
  isOver?: boolean
}

export function ChipWithLine({ label, isOver }: ChipWithLineProps) {
  const { colors } = useV2Theme()

  return (
    <View style={styles.center}>
      {/*
        `bottom="$1"`(=4) 를 옮기지 않는다 — tamagui 는 `position: relative` 가
        기본이라 그 값이 실제로 칩을 4px 밀어 올렸지만, RN 은 `static` 이 기본이라
        같은 값을 그냥 옮기면 **아무 일도 일어나지 않는다.** 의도를 살리려면
        위치 지정이 필요하므로 marginBottom 으로 같은 결과를 만든다.
      */}
      <V2HStack
        paddingHorizontal={6}
        paddingVertical={2}
        style={[
          styles.chip,
          {
            backgroundColor: isOver
              ? colors.primary.primaryWeak
              : colors.line.normal,
          },
        ]}
      >
        <V2Text
          token="caption.medium"
          color={isOver ? colors.primary.primary : colors.label.strong}
          style={styles.label}
        >
          {label}
        </V2Text>
      </V2HStack>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  chip: { borderRadius: 6, marginBottom: 4 },
  label: { paddingVertical: 1 },
})
