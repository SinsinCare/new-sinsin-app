import {
  useColorScheme,
  View,
  TextInput,
  type TextInputProps,
} from "react-native"
import { Icon } from "@/src/shared/components/Icon"

const COLORS = {
  light: {
    border: "#ABABB4",
    text: "#3C3C43",
    placeholder: "#9A9A9A",
    icon: "#595960",
  },
  dark: {
    border: "#595960",
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
  const colorScheme = useColorScheme()
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
