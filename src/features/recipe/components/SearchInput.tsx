import {
  View,
  TextInput,
  type TextInputProps,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Icon } from "@/src/shared/components/Icon"
import { tokens } from "@/src/theme/tokens"

const COLORS = {
  light: {
    border: tokens.color.textDarkSub.val,
    text: "#3C3C43",
    placeholder: "#9A9A9A",
    icon: tokens.color.textLightMuted.val,
  },
  dark: {
    border: tokens.color.textLightMuted.val,
    text: "#72727A",
    placeholder: "#72727A",
    icon: "#72727A",
  },
} as const

interface SearchInputProps extends Omit<
  TextInputProps,
  "style" | "placeholderTextColor"
> {
  placeholder?: string
}

export function SearchInput({
  placeholder = "레시피 검색하기",
  ...props
}: SearchInputProps) {
  const colorScheme = useAppColorScheme()
  const isDark = colorScheme === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 18,
        paddingHorizontal: 20,
        paddingVertical: 5,
      }}
    >
      <TextInput
        style={{
          flex: 1,
          fontWeight: "500",
          fontSize: 14,
          lineHeight: 20,
          color: palette.text,
          padding: 0,
        }}
        placeholder={placeholder}
        placeholderTextColor={palette.placeholder}
        {...props}
      />
      <View>
        <Icon name="magnifyingglass" size={22} color={palette.icon} />
      </View>
    </View>
  )
}
