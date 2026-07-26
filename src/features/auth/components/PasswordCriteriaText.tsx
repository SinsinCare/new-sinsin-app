import { StyleSheet, Text } from "react-native"
import { spacing, typography, useV2Theme } from "@/src/design-system-v2"
import {
  getPasswordCriteriaState,
  passwordCriteriaText,
} from "../data/passwordValidation"

interface PasswordCriteriaTextProps {
  password: string
}

export function PasswordCriteriaText({ password }: PasswordCriteriaTextProps) {
  const { colors, mode } = useV2Theme()
  const state = getPasswordCriteriaState(password)
  const color =
    state === "valid"
      ? colors.status.positive
      : state === "invalid"
        ? colors.status.negative
        : mode === "dark"
          ? colors.label.normal
          : colors.label.alternative

  return (
    <Text style={[typography.subtext.medium, styles.text, { color }]}>
      {passwordCriteriaText}
    </Text>
  )
}

const styles = StyleSheet.create({
  text: { marginTop: spacing[2] },
})
