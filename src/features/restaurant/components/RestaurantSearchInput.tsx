import { View, TextInput, type TextInputProps } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Icon } from "@/src/shared/components/Icon"
import { useTranslation } from "react-i18next"
import { tokens } from "@/src/theme/tokens"

const COLORS = {
  light: {
    border: "#D4D4D4",
    text: "#3C3C43",
    placeholder: "#9A9A9A",
    icon: tokens.color.textLight.val,
  },
  dark: {
    border: tokens.color.textLightMuted.val,
    text: tokens.color.textDark.val,
    placeholder: "#72727A",
    icon: tokens.color.textDark.val,
  },
} as const

interface RestaurantSearchInputProps extends Omit<
  TextInputProps,
  "style" | "placeholderTextColor"
> {
  placeholder?: string
}

export function RestaurantSearchInput({
  placeholder,
  ...props
}: RestaurantSearchInputProps) {
  const { t } = useTranslation("common")
  const isDark = useAppColorScheme() === "dark"
  const palette = isDark ? COLORS.dark : COLORS.light

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
      }}
    >
      <Icon name="magnifyingglass" size={14} color={palette.icon} />
      <TextInput
        style={{
          flex: 1,
          fontWeight: "400",
          fontSize: 15,
          lineHeight: 20,
          color: palette.text,
          padding: 0,
        }}
        placeholder={placeholder ?? t("restaurant.searchPlaceholder")}
        accessibilityLabel={
          props.accessibilityLabel ?? t("restaurant.searchAccessibility")
        }
        placeholderTextColor={palette.placeholder}
        {...props}
      />
    </View>
  )
}
