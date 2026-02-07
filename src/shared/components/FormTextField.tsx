import { useState, useRef } from 'react'
import { Pressable, TextInput, type KeyboardTypeOptions } from 'react-native'
import { YStack, XStack, Text, Input } from 'tamagui'
import { Controller, type Control, type FieldValues, type Path, type RegisterOptions } from 'react-hook-form'
import { Ionicons } from '@expo/vector-icons'

type InputType = 'text' | 'email' | 'password' | 'number' | 'phone'

const INPUT_TYPE_CONFIG: Record<InputType, {
  keyboardType: KeyboardTypeOptions
  autoCapitalize: 'none' | 'sentences' | 'words' | 'characters'
  secureTextEntry: boolean
}> = {
  text: { keyboardType: 'default', autoCapitalize: 'sentences', secureTextEntry: false },
  email: { keyboardType: 'email-address', autoCapitalize: 'none', secureTextEntry: false },
  password: { keyboardType: 'default', autoCapitalize: 'none', secureTextEntry: true },
  number: { keyboardType: 'numeric', autoCapitalize: 'none', secureTextEntry: false },
  phone: { keyboardType: 'phone-pad', autoCapitalize: 'none', secureTextEntry: false },
}

interface FormTextFieldProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  rules?: RegisterOptions<T, Path<T>>
  label?: string
  placeholder?: string
  inputType?: InputType
  clearable?: boolean
}

export function FormTextField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  placeholder,
  inputType = 'text',
  clearable = true,
}: FormTextFieldProps<T>) {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<TextInput>(null)
  const config = INPUT_TYPE_CONFIG[inputType]

  const hasError = (error: any) => !!error
  const getBorderColor = (error: any) => {
    if (hasError(error)) return '#FF3B30'
    if (isFocused) return '#5464F2'
    return 'rgba(218,223,230,0.6)'
  }
  const getLabelColor = (error: any) => {
    if (hasError(error)) return '#FF3B30'
    if (isFocused) return '#5464F2'
    return '#17191C'
  }

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <YStack>
          {label && (
            <Text
              fontSize={13}
              fontWeight="500"
              color={getLabelColor(error)}
              letterSpacing={-0.3}
              lineHeight={18.2}
              paddingBottom={10}
            >
              {label}
            </Text>
          )}
          <XStack
            backgroundColor="white"
            borderWidth={1}
            borderColor={getBorderColor(error)}
            borderRadius={8}
            height={52}
            alignItems="center"
            paddingLeft={16}
            paddingRight={value && isFocused && clearable ? 8 : 16}
          >
            <Input
              ref={inputRef as any}
              flex={1}
              value={value ?? ''}
              onChangeText={onChange}
              placeholder={placeholder}
              keyboardType={config.keyboardType}
              autoCapitalize={config.autoCapitalize}
              secureTextEntry={config.secureTextEntry}
              backgroundColor="transparent"
              borderWidth={0}
              height={50}
              paddingHorizontal={0}
              fontSize={16}
              color="#17191C"
              letterSpacing={-0.3}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false)
                onBlur()
              }}
            />
            {value && isFocused && clearable && (
              <Pressable
                onPress={() => {
                  onChange('')
                  inputRef.current?.focus()
                }}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={20} color="#787C83" />
              </Pressable>
            )}
          </XStack>
          {error?.message && (
            <Text
              fontSize={12}
              color="#FF3B30"
              letterSpacing={-0.3}
              paddingTop={6}
            >
              {error.message}
            </Text>
          )}
        </YStack>
      )}
    />
  )
}
