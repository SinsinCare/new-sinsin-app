import { Pressable, TextInput, TextInputProps } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { XStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { tokens } from "@/src/theme/tokens"
import { useAuthColors, AUTH_RADIUS } from "../hooks/useAuthColors"

interface StepTextInputProps extends TextInputProps {
  hasError?: boolean
  onClear?: () => void
}

/**
 * 스텝 화면용 단일 입력. 목업 상태 3종을 그대로 구현한다.
 *  - 비었을 때: 회색 테두리 + 플레이스홀더
 *  - 입력 중: 프라이머리 테두리 + 지우기 버튼
 *  - 오류: 프라이머리 테두리(라벨도 함께 물든다 — StepField 가 담당)
 *
 * 이 앱에서 프라이머리(주황)는 강조와 경고를 겸한다. 오류 전용 색을 따로 두면
 * 팔레트가 하나 더 늘어나는데, 목업이 같은 색을 쓰고 있어 맞춰 뒀다.
 */
export function StepTextInput({
  hasError,
  onClear,
  value,
  ...props
}: StepTextInputProps) {
  const colors = useAuthColors()
  const filled = !!value
  const borderColor = hasError
    ? tokens.color.primary.val
    : filled
      ? tokens.color.primary.val
      : colors.border

  return (
    <XStack
      alignItems="center"
      height={52}
      borderWidth={1}
      borderColor={borderColor}
      borderRadius={AUTH_RADIUS}
      backgroundColor={colors.inputBg}
      paddingHorizontal={16}
      gap={8}
    >
      <TextInput
        {...props}
        value={value}
        style={[
          {
            flex: 1,
            fontSize: 16,
            color: colors.text,
            padding: 0,
            letterSpacing: -0.3,
          },
          props.style,
        ]}
        placeholderTextColor={colors.textSub}
      />
      {filled && onClear ? (
        <Animated.View entering={FadeIn.duration(140)}>
          <Pressable onPress={onClear} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.textSub} />
          </Pressable>
        </Animated.View>
      ) : null}
    </XStack>
  )
}
