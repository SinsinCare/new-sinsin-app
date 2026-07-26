import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { radius, spacing, typography, useV2Theme } from "@/src/design-system-v2"
import { GenderIcon } from "./GenderIcon"

type Gender = "MALE" | "FEMALE" | "OTHER"

interface GenderSelectorProps {
  value: Gender | ""
  onChange: (gender: Gender) => void
  error?: string
}

const GENDER_OPTIONS: {
  key: Gender
  label: string
}[] = [
  { key: "MALE", label: "남자" },
  { key: "FEMALE", label: "여자" },
  { key: "OTHER", label: "기타" },
]

export function GenderSelector({
  value,
  onChange,
  error,
}: GenderSelectorProps) {
  const { colors } = useV2Theme()
  // Figma's new-user frame has only two cards. Retain OTHER for existing
  // profiles and payload compatibility until the open product decision lands.
  const visibleOptions =
    value === "OTHER" ? GENDER_OPTIONS : GENDER_OPTIONS.slice(0, 2)

  return (
    <View style={styles.root}>
      <Text
        style={[
          typography.subtext.mediumStrong,
          { color: colors.label.normal },
        ]}
      >
        성별<Text style={{ color: colors.status.negative }}> *</Text>
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="성별 필수 선택"
        style={styles.options}
      >
        {visibleOptions.map(({ key, label }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: value === key }}
            key={key}
            style={
              key === "OTHER" ? styles.otherOptionWrapper : styles.optionWrapper
            }
            onPress={() => onChange(key)}
          >
            <View
              style={[
                styles.option,
                {
                  borderColor:
                    value === key ? colors.primary.primary : "transparent",
                  backgroundColor:
                    value === key
                      ? colors.primary.primaryWeak
                      : colors.fill.background,
                },
              ]}
            >
              {key === "OTHER" ? (
                <Ionicons
                  name="person-outline"
                  size={40}
                  color={
                    value === key
                      ? colors.primary.primary
                      : colors.label.alternative
                  }
                />
              ) : (
                <GenderIcon gender={key} />
              )}
              <Text
                style={[
                  typography.label.mediumWeak,
                  {
                    color:
                      value === key
                        ? colors.primary.primary
                        : colors.label.normal,
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      {error ? (
        <Text
          style={[typography.subtext.medium, { color: colors.status.negative }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: spacing[6], marginHorizontal: spacing[4] },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing[16] },
  optionWrapper: { flex: 1 },
  otherOptionWrapper: { width: "100%" },
  option: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius["2xl"],
    gap: spacing[6],
  },
})
