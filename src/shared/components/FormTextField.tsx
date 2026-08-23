import { useState, useRef } from "react"
import { Pressable, Keyboard, type KeyboardTypeOptions } from "react-native"
import { TextInput } from "react-native"
import { useV2Theme, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
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
  const { colors, mode } = useV2Theme()
  const shouldShowPasswordToggle =
    inputType === "password" && showPasswordToggle

  /*
    tamagui 제거 뒤에도 `$danger`·`$primary` 같은 문자열이 남아 있었다. RN 은 이 값을
    토큰으로 해석하지 않으므로 포커스/오류 선이 플랫폼별로 무시되거나 경고가 났다.
    이 컴포넌트는 현재 호출 0건이지만 shared index의 공개 API라 재사용 즉시 깨지는
    상태였다 — v2 semantic 색을 직접 반환한다.
  */
  const getBorderColor = (state: ReturnType<typeof getFormValidationState>) => {
    if (state === "invalid") return colors.status.negative
    if (state === "valid") return colors.status.positive
    if (isFocused) return colors.primary.primary
    return colors.line.normal
  }
  const getLabelColor = (state: ReturnType<typeof getFormValidationState>) => {
    if (state === "invalid") return colors.status.negative
    if (state === "valid") return colors.status.positive
    if (isFocused) return colors.primary.primary
    return colors.label.normal
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
                backgroundColor:
                  mode === "dark"
                    ? colors.background.lower
                    : colors.background.default,
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
                    color={colors.label.assistive}
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
                    color={colors.label.assistive}
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
