import { TouchableOpacity, StyleSheet } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack } from "tamagui"
import {
  EDEMA_OPTIONS,
  EDEMA_BUTTON_LABEL,
  EdemaLevel,
} from "../../data/EdemaConstants"
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
      <XStack gap="$2" paddingTop="$4">
        {EDEMA_OPTIONS.map((option) => {
          const isSelected = selected === option
          return (
            <TouchableOpacity
              key={option}
              style={styles.buttonWrapper}
              onPress={() => onSave(option)}
            >
              <XStack
                flex={1}
                backgroundColor={
                  isSelected
                    ? "$primary"
                    : isDarkMode
                      ? "$appBgDark"
                      : "$pureWhite"
                }
                paddingVertical="$2.5"
                paddingHorizontal="$2"
                borderRadius="$4"
                borderColor="$borderColor"
                borderWidth={isSelected || isDarkMode ? 0 : 1}
                justifyContent="center"
                alignItems="center"
              >
                <Text
                  fontSize={14}
                  fontWeight="600"
                  textAlign="center"
                  color={
                    isSelected
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
          )
        })}
      </XStack>
    </RecordCard>
  )
}

const styles = StyleSheet.create({
  buttonWrapper: {
    flex: 1,
  },
})
