import { useState } from "react"
import { Ionicons } from "@expo/vector-icons"
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form"
import {
  V2TextField,
  type V2TextFieldProps,
  iconSize,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import {
  getAuthTextInputPresentation,
  type AuthTextInputType,
} from "../data/authPresentation"

export type V2AuthFormTextFieldProps<T extends FieldValues> = Omit<
  V2TextFieldProps,
  | "accessibilityLabel"
  | "autoCapitalize"
  | "error"
  | "inputStyle"
  | "keyboardType"
  | "onBlur"
  | "onChangeText"
  | "secureTextEntry"
  | "textContentType"
  | "value"
> & {
  name: Path<T>
  control: Control<T>
  rules?: RegisterOptions<T, Path<T>>
  inputType?: AuthTextInputType
  /** Feature-level alias for the native iOS text content contract. */
  keyboardContentType?: TextInputProps["textContentType"]
  textContentType?: TextInputProps["textContentType"]
  /** Password reveal stays in auth because V2TextField has no accessory slot. */
  showPasswordToggle?: boolean
  accessibilityLabel?: string
  inputStyle?: TextStyle
  style?: ViewStyle
}

/**
 * React Hook Form adapter for authentication only.
 *
 * It composes V2TextField rather than extending the shared primitive: field
 * ownership, password visibility, and autofill choices are auth-flow concerns.
 */
export function V2AuthFormTextField<T extends FieldValues>({
  name,
  control,
  rules,
  inputType = "text",
  keyboardContentType,
  textContentType,
  showPasswordToggle = false,
  accessibilityLabel,
  inputStyle,
  label,
  placeholder,
  style,
  variant = "box",
  ...inputProps
}: V2AuthFormTextFieldProps<T>) {
  const { colors } = useV2Theme()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const presentation = getAuthTextInputPresentation(inputType)
  const shouldShowPasswordToggle =
    inputType === "password" && showPasswordToggle
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? label ?? placeholder ?? String(name)

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({
        field: { onBlur, onChange, value },
        fieldState: { error },
      }) => {
        const message = error?.message ?? inputProps.helperText
        const hasError = !!error

        return (
          <View style={[styles.root, style]}>
            <View style={styles.fieldWrapper}>
              <V2TextField
                {...inputProps}
                {...presentation}
                variant={variant}
                accessibilityLabel={resolvedAccessibilityLabel}
                label={label}
                placeholder={placeholder}
                value={typeof value === "string" ? value : ""}
                onChangeText={onChange}
                onBlur={onBlur}
                error={hasError}
                helperText={undefined}
                secureTextEntry={
                  shouldShowPasswordToggle
                    ? !passwordVisible
                    : presentation.secureTextEntry
                }
                textContentType={keyboardContentType ?? textContentType}
                inputStyle={
                  shouldShowPasswordToggle
                    ? { ...inputStyle, paddingRight: spacing[32] }
                    : inputStyle
                }
              />

              {shouldShowPasswordToggle && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    passwordVisible ? "비밀번호 숨기기" : "비밀번호 보기"
                  }
                  accessibilityState={{ selected: passwordVisible }}
                  hitSlop={spacing[4]}
                  onPress={() => setPasswordVisible((visible) => !visible)}
                  style={({ pressed }) => [
                    variant === "line"
                      ? styles.passwordToggleLine
                      : styles.passwordToggleBox,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    size={iconSize.md}
                    color={colors.label.alternative}
                  />
                </Pressable>
              )}
            </View>

            {message != null && message.length > 0 && (
              <Text
                style={[
                  typography.subtext.medium,
                  styles.message,
                  {
                    color: hasError
                      ? colors.status.negative
                      : colors.label.alternative,
                  },
                ]}
              >
                {message}
              </Text>
            )}
          </View>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  root: { position: "relative" },
  fieldWrapper: { position: "relative" },
  passwordToggleBox: {
    position: "absolute",
    right: spacing[8],
    bottom: spacing[4],
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordToggleLine: {
    position: "absolute",
    right: spacing[4],
    bottom: 0,
    width: iconSize.md + spacing[8],
    height: spacing[32],
    alignItems: "center",
    justifyContent: "center",
  },
  message: { marginTop: spacing[6] },
  pressed: { opacity: 0.6 },
})
