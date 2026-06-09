import { Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import {
  getPasswordCriteriaState,
  passwordCriteriaText,
} from "../data/passwordValidation"

interface PasswordCriteriaTextProps {
  password: string
}

export function PasswordCriteriaText({ password }: PasswordCriteriaTextProps) {
  const state = getPasswordCriteriaState(password)
  const color =
    state === "valid"
      ? tokens.color.sub6.val
      : state === "invalid"
        ? tokens.color.error.val
        : tokens.color.grey6.val

  return (
    <Text fontSize={14} lineHeight={20} color={color} letterSpacing={0}>
      {passwordCriteriaText}
    </Text>
  )
}
