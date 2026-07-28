import { ScrollView, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import {
  V2Button,
  V2Divider,
  V2Screen,
  V2ScreenHeader,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { TermsConsentRow } from "../components/TermsConsentRow"
import { getLegalDocumentRoute } from "../data/termsAgreementFlow"
import { useTermsAgreement } from "../hooks"

interface TermsAgreementScreenProps {
  mode?: "email" | "social"
  socialSignupToken?: string
}

export function TermsAgreementScreen({
  mode = "email",
  socialSignupToken,
}: TermsAgreementScreenProps) {
  const { colors } = useV2Theme()
  const {
    terms,
    agreed,
    allChecked,
    canSubmit,
    isSubmitting,
    isRequestingPushPermission,
    toggleAll,
    toggleItem,
    handleBack,
    handleNext,
  } = useTermsAgreement({ mode, socialSignupToken })

  return (
    <V2Screen padded={false} edges={["left", "right", "bottom"]}>
      <V2ScreenHeader onBack={handleBack} />
      <View style={styles.screenContent}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            accessibilityRole="header"
            style={[typography.title.large, { color: colors.label.strong }]}
          >
            신신당부 서비스 이용약관에{"\n"}동의해주세요
          </Text>

          <View style={styles.allConsentSection}>
            <TermsConsentRow
              term={{ id: "all", label: "전체 동의", required: false }}
              checked={allChecked}
              onChange={toggleAll}
              showRequirement={false}
              disabled={isRequestingPushPermission}
            />
          </View>

          <V2Divider tone="neutral" />

          <View style={styles.termsList}>
            {terms.map((term) => (
              <TermsConsentRow
                key={term.id}
                term={term}
                checked={!!agreed[term.id]}
                onChange={() => toggleItem(term.id)}
                onOpenDocument={(documentType) =>
                  router.push(getLegalDocumentRoute(documentType))
                }
                disabled={
                  isRequestingPushPermission ||
                  (term.id === "night_push_notifications" &&
                    (!agreed.push_notifications || !agreed.marketing))
                }
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <V2Button
            size="xl"
            color="brand"
            fullWidth
            disabled={!canSubmit}
            loading={isSubmitting}
            onPress={handleNext}
          >
            동의하고 계속하기
          </V2Button>
        </View>
      </View>
    </V2Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[24],
    paddingTop: spacing[20],
    paddingBottom: spacing[32],
  },
  allConsentSection: { marginTop: spacing[32], marginBottom: spacing[20] },
  termsList: { gap: spacing[16], marginTop: spacing[20] },
  footer: {
    paddingHorizontal: spacing[20],
    paddingTop: spacing[16],
    paddingBottom: spacing[20],
  },
})
