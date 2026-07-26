import {
  StyleSheet,
  View,
  useWindowDimensions,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { useWatch, type Control } from "react-hook-form"
import { spacing } from "@/src/design-system-v2"
import { getAuthPasswordPlaceholders } from "../data/authPresentation"
import { confirmPasswordRules, passwordRules } from "../data/passwordValidation"
import type { PasswordForm } from "../types"
import { V2AuthFormTextField } from "./V2AuthFormTextField"
import { PasswordCriteriaText } from "./PasswordCriteriaText"

interface AuthPasswordFieldsProps {
  control: Control<PasswordForm>
  style?: ViewStyle
  placeholderTextColor?: TextInputProps["placeholderTextColor"]
}

/**
 * Auth-owned password form fields. It keeps validation, reveal controls, and
 * native password autofill policy out of the shared V2 text-field primitive.
 */
export function AuthPasswordFields({
  control,
  style,
  placeholderTextColor,
}: AuthPasswordFieldsProps) {
  const password = useWatch({ control, name: "password" })
  const { fontScale } = useWindowDimensions()
  const placeholders = getAuthPasswordPlaceholders(fontScale)

  return (
    <View style={[styles.root, style]}>
      <View style={styles.passwordGroup}>
        <V2AuthFormTextField<PasswordForm>
          name="password"
          control={control}
          label="비밀번호"
          placeholder={placeholders.password}
          inputType="password"
          textContentType="newPassword"
          autoComplete="new-password"
          importantForAutofill="yes"
          returnKeyType="next"
          showPasswordToggle
          placeholderTextColor={placeholderTextColor}
          rules={passwordRules}
        />
        <PasswordCriteriaText password={password ?? ""} />
      </View>

      <V2AuthFormTextField<PasswordForm>
        name="confirmPassword"
        control={control}
        label="비밀번호 확인"
        placeholder={placeholders.confirmPassword}
        inputType="password"
        textContentType="newPassword"
        autoComplete="new-password"
        importantForAutofill="yes"
        returnKeyType="done"
        showPasswordToggle
        placeholderTextColor={placeholderTextColor}
        rules={confirmPasswordRules(password ?? "")}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing[32],
    gap: spacing[32],
  },
  passwordGroup: { gap: spacing[10] },
})
