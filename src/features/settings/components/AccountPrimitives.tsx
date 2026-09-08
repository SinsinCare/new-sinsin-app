import type { ReactNode, ComponentProps } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { Text } from "@/src/shared/components/AppText"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { typography } from "@/src/design-system-v2/tokens"

export function AccountSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const { colors } = useV2Theme()
  return (
    <View style={[styles.section, { borderTopColor: colors.line.neutral }]}>
      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: colors.label.neutral }]}
      >
        {title}
      </Text>
      {children}
    </View>
  )
}

export function AccountRow({
  title,
  description,
  value,
  icon,
  onPress,
  trailing,
  disabled = false,
}: {
  title: string
  description?: string
  value?: string
  icon?: ComponentProps<typeof Ionicons>["name"]
  onPress?: () => void
  trailing?: ReactNode
  disabled?: boolean
}) {
  const { colors } = useV2Theme()
  const content = (
    <>
      {icon && <Ionicons name={icon} size={20} color={colors.label.neutral} />}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.label.normal }]}>
          {title}
        </Text>
        {description && (
          <Text style={[styles.description, { color: colors.label.neutral }]}>
            {description}
          </Text>
        )}
      </View>
      {value && (
        <Text style={[styles.value, { color: colors.label.neutral }]}>
          {value}
        </Text>
      )}
      {trailing ??
        (onPress && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.label.alternative}
          />
        ))}
    </>
  )
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, value, description]
        .filter(Boolean)
        .join(", ")}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.fill.normal : undefined,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    ...typography.subtext.mediumStrong,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  copy: { flex: 1, gap: 4 },
  title: { ...typography.subtext.large },
  description: { ...typography.subtext.medium },
  value: {
    ...typography.subtext.medium,
    flexShrink: 1,
    maxWidth: "45%",
    textAlign: "right",
  },
})
