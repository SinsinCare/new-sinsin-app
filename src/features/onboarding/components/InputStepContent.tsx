import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text, Input } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import type { OnboardingValueOption } from "../types"

interface InputStepContentProps {
  fields: OnboardingValueOption[]
  values: Record<string, string>
  onChange: (key: string, text: string) => void
  onSubmit: () => void
}

function getNumericError(raw: string): string | null {
  if (!raw.trim()) return null
  const num = parseFloat(raw)
  if (isNaN(num)) return "숫자를 입력해주세요"
  if (num <= 0) return "0보다 큰 값을 입력해주세요"
  return null
}

export function InputStepContent({
  fields,
  values,
  onChange,
  onSubmit,
}: InputStepContentProps) {
  const isDark = useAppColorScheme() === "dark"
  const labelColor = isDark ? tokens.color.textDark.val : "#17191C"
  const unitColor = isDark ? tokens.color.textDarkSub.val : "#787C83"
  const borderColor = isDark ? "rgba(100,105,115,0.4)" : "rgba(218,223,230,0.6)"
  const inputBg = isDark ? "#2A2A32" : "white"

  return (
    <YStack gap={16}>
      {fields.map((field, index) => {
        const raw = values[field.key] ?? ""
        const numError = field.type === "number" ? getNumericError(raw) : null
        const hasError = !!numError
        return (
          <YStack key={`${index}-${field.key}`} gap={8}>
            {field.label && (
              <Text
                fontSize={13}
                fontWeight="500"
                color={labelColor}
                letterSpacing={-0.3}
                lineHeight={18.2}
              >
                {field.label}
              </Text>
            )}
            <XStack
              height={52}
              borderRadius={12}
              borderWidth={hasError ? 1.5 : 1}
              borderColor={hasError ? "#EF4444" : borderColor}
              backgroundColor={inputBg}
              alignItems="center"
              paddingHorizontal={16}
              focusStyle={{
                borderColor: tokens.color.sub6.val,
                borderWidth: 1.5,
              }}
            >
              <Input
                flex={1}
                height={50}
                fontSize={16}
                color={labelColor}
                borderWidth={0}
                backgroundColor="transparent"
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="입력해주세요"
                placeholderTextColor="$grey7"
                textAlignVertical="center"
                style={{ lineHeight: 22 }}
                keyboardType={field.type === "number" ? "numeric" : "default"}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                value={raw}
                onChangeText={(text) => onChange(field.key, text)}
              />
              {field.unit && (
                <Text fontSize={16} color={unitColor} marginLeft={8}>
                  {field.unit}
                </Text>
              )}
            </XStack>
            {numError && (
              <Text fontSize={12} color="#EF4444" marginTop={-4}>
                {numError}
              </Text>
            )}
          </YStack>
        )
      })}
    </YStack>
  )
}
