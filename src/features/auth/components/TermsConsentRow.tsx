import { Pressable, StyleSheet, Text, View } from "react-native"
import {
  V2Checkbox,
  spacing,
  touchTarget,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { getTermConsentAccessibilityLabel } from "../data/termsAgreementFlow"
import type { TermItem } from "../types"

interface TermsConsentRowProps {
  term: TermItem
  checked: boolean
  onChange: () => void
  onOpenDocument?: (documentType: NonNullable<TermItem["documentType"]>) => void
  showRequirement?: boolean
  disabled?: boolean
}

/** Auth-owned consent composition: one checkbox focus target plus an optional legal link. */
export function TermsConsentRow({
  term,
  checked,
  onChange,
  onOpenDocument,
  showRequirement = true,
  disabled = false,
}: TermsConsentRowProps) {
  const { colors } = useV2Theme()
  const accessibilityLabel = showRequirement
    ? getTermConsentAccessibilityLabel(term)
    : term.label

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={
          disabled
            ? "푸시 알림 수신 동의 후 선택할 수 있습니다"
            : "두 번 탭하여 동의 상태를 변경합니다"
        }
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={onChange}
        style={({ pressed }) => [
          styles.consentAction,
          (pressed || disabled) && styles.pressed,
        ]}
      >
        <V2Checkbox
          checked={checked}
          size="m"
          accessible={false}
          pointerEvents="none"
        />
        <View style={styles.labelGroup}>
          {showRequirement && (
            <Text
              style={[
                typography.subtext.mediumStrong,
                { color: colors.primary.primary },
              ]}
            >
              [{term.required ? "필수" : "선택"}]
            </Text>
          )}
          <Text
            style={[typography.subtext.large, { color: colors.label.normal }]}
          >
            {term.label}
          </Text>
        </View>
      </Pressable>

      {term.documentType && onOpenDocument && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${term.label} 내용 보기`}
          accessibilityHint="약관 전문을 엽니다"
          onPress={() => onOpenDocument(term.documentType!)}
          style={({ pressed }) => [
            styles.documentLink,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              typography.subtext.medium,
              styles.documentLinkText,
              { color: colors.label.alternative },
            ]}
          >
            내용 보기
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  consentAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    minHeight: touchTarget.min,
  },
  labelGroup: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing[4],
  },
  documentLink: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  documentLinkText: { textDecorationLine: "underline" },
  pressed: { opacity: 0.7 },
})
