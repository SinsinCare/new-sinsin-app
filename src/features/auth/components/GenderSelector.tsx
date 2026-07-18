import { Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { YStack, XStack, Text } from "tamagui"
import { tokens } from "@/src/theme/tokens"

type Gender = "MALE" | "FEMALE" | "OTHER"

interface GenderSelectorProps {
  value: Gender | ""
  onChange: (gender: Gender) => void
}

const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: "MALE", label: "남성" },
  { key: "FEMALE", label: "여성" },
  { key: "OTHER", label: "기타" },
]

export function GenderSelector({ value, onChange }: GenderSelectorProps) {
  const isDark = useAppColorScheme() === "dark"
  const labelColor = isDark ? tokens.color.textDark.val : "#17191C"
  const unselectedBg = isDark ? "#2A2A32" : "white"
  const unselectedText = isDark ? tokens.color.textDark.val : "#17191C"
  const unselectedBorder = isDark ? "#3A3A42" : "rgba(218,223,230,0.6)"
  const selectedBg = isDark ? "#0D896A20" : "#F0FDF4"

  return (
    <YStack>
      <XStack paddingBottom={10}>
        <Text
          fontSize={13}
          fontWeight="500"
          color={labelColor}
          letterSpacing={-0.3}
          lineHeight={18.2}
        >
          성별
        </Text>
        <Text fontSize={13} fontWeight="500" color={tokens.color.error.val}>
          {" "}
          *
        </Text>
      </XStack>
      <XStack gap={8}>
        {GENDER_OPTIONS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={{ flex: 1 }}
            onPress={() => onChange(key)}
          >
            <YStack
              height={52}
              borderRadius={8}
              borderWidth={1}
              borderColor={
                value === key ? tokens.color.sub6.val : unselectedBorder
              }
              backgroundColor={value === key ? selectedBg : unselectedBg}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontSize={16}
                fontWeight={value === key ? "600" : "400"}
                color={value === key ? tokens.color.sub8.val : unselectedText}
                letterSpacing={-0.3}
              >
                {label}
              </Text>
            </YStack>
          </Pressable>
        ))}
      </XStack>
    </YStack>
  )
}
