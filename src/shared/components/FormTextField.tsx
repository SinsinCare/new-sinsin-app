import { useState, useRef, type ComponentRef } from "react"
import { Pressable, Keyboard, type KeyboardTypeOptions } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { TextInput } from "react-native"
import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { tokens } from "../../theme/tokens"
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form"
import Ionicons from "@expo/vector-icons/Ionicons"
import { getFormValidationState } from "../utils/formValidationState"

type InputType = "text" | "email" | "password" | "number" | "phone"

const INPUT_TYPE_CONFIG: Record<
  InputType,
  {
    keyboardType: KeyboardTypeOptions
    autoCapitalize: "none" | "sentences" | "words" | "characters"
    secureTextEntry: boolean
  }
> = {
  text: {
    keyboardType: "default",
    autoCapitalize: "sentences",
    secureTextEntry: false,
  },
  email: {
    keyboardType: "email-address",
    autoCapitalize: "none",
    secureTextEntry: false,
  },
  password: {
    keyboardType: "default",
    autoCapitalize: "none",
    secureTextEntry: true,
  },
  number: {
    keyboardType: "numeric",
    autoCapitalize: "none",
    secureTextEntry: false,
  },
  phone: {
    keyboardType: "phone-pad",
    autoCapitalize: "none",
    secureTextEntry: false,
  },
}

interface FormTextFieldProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  rules?: RegisterOptions<T, Path<T>>
  label?: string
  placeholder?: string
  inputType?: InputType
  clearable?: boolean
  autoFocus?: boolean
  maxLength?: number
  showPasswordToggle?: boolean
  showValidState?: boolean
}

export function FormTextField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  placeholder,
  inputType = "text",
  clearable = true,
  autoFocus = false,
  maxLength,
  showPasswordToggle = false,
  showValidState = false,
}: FormTextFieldProps<T>) {
  const [isFocused, setIsFocused] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const inputRef = useRef<TextInput>(null)
  const config = INPUT_TYPE_CONFIG[inputType]
  const isDark = useAppColorScheme() === "dark"
  const { colors } = useV2Theme()
  const shouldShowPasswordToggle =
    inputType === "password" && showPasswordToggle

  const getBorderColor = (state: ReturnType<typeof getFormValidationState>) => {
    if (state === "invalid") return "$danger"
    if (state === "valid") return tokens.color.sub6.val
    if (isFocused) return "$primary"
    return "$borderColor"
  }
  const getLabelColor = (state: ReturnType<typeof getFormValidationState>) => {
    if (state === "invalid") return "$danger"
    if (state === "valid") return tokens.color.sub6.val
    if (isFocused) return "$primary"
    return "$color"
  }

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => {
        const validationState = getFormValidationState({
          value,
          hasError: !!error,
          showValidState,
        })

        return (
          <V2VStack>
            {label && (
              <V2Text
                color={getLabelColor(validationState)}
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  letterSpacing: -0.3,
                  lineHeight: 18.2,
                  paddingBottom: 10,
                }}
              >
                {label}
              </V2Text>
            )}
            <V2HStack
              align="center"
              paddingLeft={16}
              paddingRight={
                shouldShowPasswordToggle || (value && isFocused && clearable)
                  ? 8
                  : 16
              }
              style={{
                backgroundColor: isDark ? "#2A2A32" : "white",
                borderWidth: 1,
                borderColor: getBorderColor(validationState),
                borderRadius: 8,
                height: 52,
              }}
            >
              <TextInput
                ref={inputRef}
                accessibilityLabel={label}
                value={value ?? ""}
                onChangeText={(text) => {
                  onChange(text)
                  if (maxLength && text.length >= maxLength) Keyboard.dismiss()
                }}
                placeholder={placeholder}
                maxLength={maxLength}
                keyboardType={config.keyboardType}
                autoCapitalize={config.autoCapitalize}
                secureTextEntry={
                  shouldShowPasswordToggle
                    ? !passwordVisible
                    : config.secureTextEntry
                }
                autoFocus={autoFocus}
                placeholderTextColor={colors.label.assistive}
                style={{
                  flex: 1,
                  backgroundColor: "transparent",
                  borderWidth: 0,
                  height: 50,
                  paddingHorizontal: 0,
                  fontSize: 16,
                  color: colors.label.strong,
                  letterSpacing: -0.3,
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false)
                  onBlur()
                }}
              />
              {shouldShowPasswordToggle ? (
                <Pressable
                  onPress={() => {
                    setPasswordVisible((visible) => !visible)
                    inputRef.current?.focus()
                  }}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={tokens.color.grey5.val}
                  />
                </Pressable>
              ) : value && isFocused && clearable ? (
                <Pressable
                  onPress={() => {
                    onChange("")
                    inputRef.current?.focus()
                  }}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={tokens.color.grey5.val}
                  />
                </Pressable>
              ) : null}
            </V2HStack>
            {error?.message && (
              <V2Text
                color={colors.status.negative}
                style={{ fontSize: 12, letterSpacing: -0.3, paddingTop: 6 }}
              >
                {error.message}
              </V2Text>
            )}
          </V2VStack>
        )
      }}
    />
  )
}
