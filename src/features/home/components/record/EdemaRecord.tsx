import { TouchableOpacity, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack } from "tamagui"
import { EDEMA_OPTIONS, EDEMA_BUTTON_LABEL, EdemaLevel } from "../../data/EdemaConstants"
import { RecordCard } from "./RecordCard"
import EdemaIconSvg from "@/assets/images/edema-icon.svg"

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
      icon={<EdemaIconSvg width={26} height={36} />}
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
                {EDEMA_BUTTON_LABEL[option]}
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
