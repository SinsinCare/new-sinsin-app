import { Pressable } from "react-native"
import { XStack, Text } from "tamagui"
import { Checkbox } from "@/src/shared/components"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"

const BOX_BG = { light: "#F8F8FA", dark: "#25252B" } as const
const BOX_BORDER = { light: tokens.color.borderLight.val, dark: "#3A3A42" }
const TEXT_COLOR = {
  light: tokens.color.textLight.val,
  dark: tokens.color.textDark.val,
} as const

interface ContentResponsibilityCheckProps {
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function ContentResponsibilityCheck({
  value,
  onChange,
  disabled = false,
}: ContentResponsibilityCheckProps) {
  const scheme = useAppColorScheme()

  const toggle = () => {
    if (!disabled) onChange(!value)
  }

  return (
    <XStack
      alignItems="flex-start"
      gap={10}
      padding={14}
      borderRadius={8}
      borderWidth={1}
      borderColor={BOX_BORDER[scheme]}
      backgroundColor={BOX_BG[scheme]}
      opacity={disabled ? 0.6 : 1}
    >
      <Checkbox checked={value} onToggle={toggle} size={22} disabled={disabled} />
      <Pressable onPress={toggle} disabled={disabled} style={{ flex: 1 }}>
        <Text
          fontSize={13}
          lineHeight={19}
          fontWeight="400"
          fontFamily="$body"
          color={TEXT_COLOR[scheme]}
        >
          게시하는 내용이 타인의 권리를 침해하지 않으며, 작성 내용에 대한
          책임이 본인에게 있음에 동의합니다.
        </Text>
      </Pressable>
    </XStack>
  )
}
