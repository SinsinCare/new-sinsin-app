import { useState, useRef, type ComponentRef } from "react"
import { Pressable, Keyboard, type KeyboardTypeOptions } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text, Input } from "tamagui"
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
  const inputRef = useRef<ComponentRef<typeof Input>>(null)
  const config = INPUT_TYPE_CONFIG[inputType]
  const isDark = useAppColorScheme() === "dark"
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
          <YStack>
            {label && (
              <Text
                fontSize={13}
                fontWeight="500"
                color={getLabelColor(validationState)}
                letterSpacing={-0.3}
                lineHeight={18.2}
                paddingBottom={10}
              >
                {label}
              </Text>
            )}
            <XStack
              backgroundColor={isDark ? "#2A2A32" : "white"}
              borderWidth={1}
              borderColor={getBorderColor(validationState)}
              borderRadius={8}
              height={52}
              alignItems="center"
              paddingLeft={16}
              paddingRight={
                shouldShowPasswordToggle || (value && isFocused && clearable)
                  ? 8
                  : 16
              }
            >
              <Input
                ref={inputRef}
                flex={1}
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
                backgroundColor="transparent"
                borderWidth={0}
                height={50}
                paddingHorizontal={0}
                fontSize={16}
                color="$color"
                letterSpacing={-0.3}
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
            </XStack>
            {error?.message && (
              <Text
                fontSize={12}
                color="$danger"
                letterSpacing={-0.3}
                paddingTop={6}
              >
                {error.message}
              </Text>
            )}
          </YStack>
        )
      }}
    />
  )
}
