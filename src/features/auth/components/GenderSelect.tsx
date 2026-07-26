import { Pressable } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { XStack, YStack, Text } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"
import { useAuthColors, AUTH_RADIUS } from "../hooks/useAuthColors"

type Gender = "MALE" | "FEMALE"

const OPTIONS: { key: Gender; label: string; icon: "male" | "female"; tint: string }[] = [
  { key: "MALE", label: "남자", icon: "male", tint: "#5B8DEF" },
  { key: "FEMALE", label: "여자", icon: "female", tint: "#EF5B7B" },
]

/**
 * 성별 선택 카드 2종. 선택 시 프라이머리 테두리가 들어온다.
 * 아이콘 색은 성별 관습색을 유지한다 — 선택 강조는 테두리가 담당하므로
 * 아이콘까지 브랜드색으로 물들이면 두 카드가 구분이 안 된다.
 */
export function GenderSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (g: Gender) => void
}) {
  const colors = useAuthColors()

  return (
    <XStack gap={12}>
      {OPTIONS.map((opt) => {
        const selected = value === opt.key
        return (
          <Pressable key={opt.key} onPress={() => onChange(opt.key)} style={{ flex: 1 }}>
            {({ pressed }) => (
              <YStack
                height={104}
                alignItems="center"
                justifyContent="center"
                gap={10}
                borderRadius={AUTH_RADIUS}
                borderWidth={selected ? 1.5 : 1}
                borderColor={selected ? tokens.color.primary.val : colors.border}
                backgroundColor={colors.inputBg}
                opacity={pressed ? 0.9 : 1}
              >
                <YStack
                  width={36}
                  height={36}
                  borderRadius={AUTH_RADIUS / 2}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={`${opt.tint}1F`}
                >
                  <Ionicons name={opt.icon} size={20} color={opt.tint} />
                </YStack>
                <Text
                  fontSize={15}
                  fontWeight={selected ? "700" : "500"}
                  letterSpacing={-0.3}
                  color={selected ? tokens.color.primary.val : colors.text}
                >
                  {opt.label}
                </Text>
                {selected && (
                  <Animated.View entering={FadeIn.duration(160)} />
                )}
              </YStack>
            )}
          </Pressable>
        )
      })}
    </XStack>
  )
}
