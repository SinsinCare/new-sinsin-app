import { TouchableOpacity, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack } from "tamagui"
import { EDEMA_OPTIONS, EdemaLevel } from "../../data/EdemaConstants"
import { RecordCard } from "./RecordCard"

interface EdemaRecordProps {
  selected: EdemaLevel | null
  yesterdayEdema?: string | null
  onSave: (edemaLevel: EdemaLevel) => void
}

export function EdemaRecord({ selected, onSave }: EdemaRecordProps) {
  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <RecordCard
      type="weight"
      title="몸이 붓는 느낌이 있나요?"
      icon={require("@/assets/images/water-edema.png")}
    >
      <XStack gap="$2">
        {EDEMA_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.buttonWrapper}
            onPress={() => onSave(option)}
          >
            <XStack
              flex={1}
              backgroundColor={
                selected === option
                  ? "$primary"
                  : isDarkMode
                    ? "$appBgDark"
                    : "$pureWhite"
              }
              paddingVertical="$2.5"
              paddingHorizontal="$2"
              borderRadius="$4"
              justifyContent="center"
              alignItems="center"
              style={styles.optionButton}
            >
              <Text
                fontSize={14}
                fontWeight="600"
                textAlign="center"
                color={
                  selected === option
                    ? "white"
                    : isDarkMode
                      ? "$textDarkSub"
                      : "$color"
                }
              >
                {option}
              </Text>
            </XStack>
          </TouchableOpacity>
        ))}
      </XStack>
    </RecordCard>
  )
}

const styles = StyleSheet.create({
  buttonWrapper: {
    flex: 1,
  },
  optionButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
})
