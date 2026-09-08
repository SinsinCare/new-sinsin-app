import { Pressable } from "react-native"
import { V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { medStyles, FORM } from "./medicationStyles"
export function MedicationChoice({
  label,
  selected,
  onPress,
  disabled = false,
  role = "checkbox",
}: {
  label: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
  role?: "checkbox" | "radio"
}) {
  const s = useSurface()
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        medStyles.chip,
        {
          backgroundColor: pressed ? s.surfacePressed : s.surfaceSunken,
          borderColor: selected ? s.textStrong : s.surfaceSunken,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <V2Text
        style={FORM.option}
        color={selected ? s.textStrong : s.textOnSurface}
      >
        {label}
      </V2Text>
    </Pressable>
  )
}
