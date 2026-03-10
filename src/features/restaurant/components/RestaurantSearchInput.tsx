import {
  useColorScheme,
  View,
  TextInput,
  type TextInputProps,
} from "react-native"
import { Icon } from "@/src/shared/components/Icon"

const COLORS = {
  light: {
    border: "#D4D4D4",
    text: "#3C3C43",
    placeholder: "#9A9A9A",
    icon: "#3C3C43",
  },
  dark: {
    border: "#595960",
    text: "#E7E7EE",
    placeholder: "#72727A",
    icon: "#E7E7EE",
  },
} as const

interface RestaurantSearchInputProps
  extends Omit<TextInputProps, "style" | "placeholderTextColor"> {
  placeholder?: string
}

export function RestaurantSearchInput({
  placeholder = "식당을 검색해 보세요",
  ...props
}: RestaurantSearchInputProps) {
  const isDark = useColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 5,
        gap: 8,
      }}
    >
      <Icon name="magnifyingglass" size={20} color={palette.icon} />
      <TextInput
        style={{
          flex: 1,
          fontFamily: "PretendardKR-Medium",
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
    </View>
  )
}
