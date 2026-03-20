import { YStack, XStack, Text, Input } from "tamagui"
import type { OnboardingValueOption } from "../types"

interface InputStepContentProps {
  fields: OnboardingValueOption[]
  values: Record<string, string>
  onChange: (key: string, text: string) => void
}

export function InputStepContent({
  fields,
  values,
  onChange,
}: InputStepContentProps) {
  return (
    <YStack gap={16}>
      {fields.map((field, index) => (
        <YStack key={`${index}-${field.key}`} gap={8}>
          {field.label && (
            <Text
              fontSize={13}
              fontWeight="500"
              color="#17191C"
              letterSpacing={-0.3}
              lineHeight={18.2}
            >
              {field.label}
            </Text>
          )}
          <XStack
            height={52}
            borderRadius={12}
            borderWidth={1}
            borderColor="rgba(218,223,230,0.6)"
            alignItems="center"
            paddingHorizontal={16}
            focusStyle={{
              borderColor: "#34D399",
              borderWidth: 1.5,
            }}
          >
            <Input
              flex={1}
              size="$4"
              fontSize={16}
              borderWidth={0}
              backgroundColor="transparent"
              paddingHorizontal={0}
              placeholder="입력해주세요"
              placeholderTextColor="$grey7"
              keyboardType={field.type === "number" ? "numeric" : "default"}
              value={values[field.key] ?? ""}
              onChangeText={(text) => onChange(field.key, text)}
            />
            {field.unit && (
              <Text fontSize={16} color="#787C83" marginLeft={8}>
                {field.unit}
              </Text>
            )}
          </XStack>
        </YStack>
      ))}
    </YStack>
  )
}
