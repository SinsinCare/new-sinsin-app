import { TouchableOpacity, StyleSheet } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import {
  EDEMA_OPTIONS,
  EDEMA_BUTTON_LABEL,
  EDEMA_DISPLAY_LABEL,
} from "../../data/EdemaConstants"
import type { EdemaLevel } from "../../types"
import { RecordCard } from "./RecordCard"

interface EdemaRecordProps {
  selected: EdemaLevel | null
  yesterdayEdema?: EdemaLevel | null
  isDarkMode: boolean
  isLoading: boolean
  onSave: (edemaLevel: EdemaLevel) => void
}

export function EdemaRecord({
  selected,
  yesterdayEdema,
  isDarkMode,
  isLoading,
  onSave,
}: EdemaRecordProps) {
  return (
    <RecordCard
      title="몸이 붓는 느낌이 있나요?"
      icon={require("@/assets/images/water-edema.png")}
      isDarkMode={isDarkMode}
    >
      <YStack gap="$2" paddingTop="$7">
        <XStack gap="$2">
          {EDEMA_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.buttonWrapper}
              onPress={() => onSave(option)}
              disabled={isLoading}
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
                style={[styles.optionButton, isLoading && styles.disabled]}
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
        {yesterdayEdema != null && (
          <Text fontSize={13} color="$grey5">
            전날: {EDEMA_DISPLAY_LABEL[yesterdayEdema]}
          </Text>
        )}
      </YStack>
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
  disabled: {
    opacity: 0.5,
  },
})
