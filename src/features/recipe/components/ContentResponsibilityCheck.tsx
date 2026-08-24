import { Pressable } from "react-native"
import { V2HStack, V2Text } from "@/src/design-system-v2"
import { Checkbox } from "@/src/shared/components"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation("recipe")
  const scheme = useAppColorScheme()

  const toggle = () => {
    if (!disabled) onChange(!value)
  }

  return (
    <V2HStack
      align="center"
      gap={10}
      paddingHorizontal={14}
      paddingVertical={8}
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BOX_BORDER[scheme],
        backgroundColor: BOX_BG[scheme],
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Checkbox
        checked={value}
        onToggle={toggle}
        size={22}
        disabled={disabled}
      />
      {/* 문구도 함께 눌린다 — 상자 하나만 노리게 하면 손가락 규격에 못 미친다. */}
      <Pressable
        onPress={toggle}
        disabled={disabled}
        style={{ flex: 1, paddingVertical: 8 }}
      >
        <V2Text
          color={TEXT_COLOR[scheme]}
          lineBreakStrategyIOS="hangul-word"
          style={{ fontSize: 13, lineHeight: 19, fontWeight: "400" }}
        >
          {t("responsibility")}
        </V2Text>
      </Pressable>
    </V2HStack>
  )
}
