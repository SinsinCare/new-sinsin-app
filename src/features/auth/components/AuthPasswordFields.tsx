import { StyleSheet, View, type ViewStyle } from "react-native"
import { useWatch, type Control } from "react-hook-form"
import { spacing } from "@/src/design-system-v2"
import { confirmPasswordRules, passwordRules } from "../data/passwordValidation"
import type { PasswordForm } from "../types"
import { V2AuthFormTextField } from "./V2AuthFormTextField"
import { PasswordCriteriaText } from "./PasswordCriteriaText"

interface AuthPasswordFieldsProps {
  control: Control<PasswordForm>
  style?: ViewStyle
}

/**
 * Auth-owned password form fields. It keeps validation, reveal controls, and
 * native password autofill policy out of the shared V2 text-field primitive.
 */
export function AuthPasswordFields({
  control,
  style,
}: AuthPasswordFieldsProps) {
  const password = useWatch({ control, name: "password" })

  return (
    <View style={[styles.root, style]}>
      <View style={styles.passwordGroup}>
        <V2AuthFormTextField<PasswordForm>
          name="password"
          control={control}
          label="비밀번호"
          placeholder="비밀번호를 형식에 맞춰 입력해주세요"
          inputType="password"
          textContentType="newPassword"
          autoComplete="new-password"
          importantForAutofill="yes"
          returnKeyType="next"
          showPasswordToggle
          rules={passwordRules}
        />
        <PasswordCriteriaText password={password ?? ""} />
      </View>

      <V2AuthFormTextField<PasswordForm>
        name="confirmPassword"
        control={control}
        label="비밀번호 확인"
        placeholder="입력한 비밀번호를 다시 입력해주세요"
        inputType="password"
        textContentType="newPassword"
        autoComplete="new-password"
        importantForAutofill="yes"
        returnKeyType="done"
        showPasswordToggle
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
