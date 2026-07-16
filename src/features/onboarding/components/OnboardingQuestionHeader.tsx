import { StyleSheet, Text, View } from "react-native"
import { spacing, typography } from "@/src/design-system-v2"
import { normalizeOnboardingSubtitle } from "../data/onboardingPresentation"

type OnboardingQuestionHeaderProps = {
  title: string
  subtitle?: string | null
  titleColor: string
  subtitleColor: string
}

export function OnboardingQuestionHeader({
  title,
  subtitle,
  titleColor,
  subtitleColor,
}: OnboardingQuestionHeaderProps) {
  const normalizedSubtitle = normalizeOnboardingSubtitle(subtitle)

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      {normalizedSubtitle ? (
        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          {normalizedSubtitle}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[24],
  },
  title: typography.title.medium,
  subtitle: {
    ...typography.subtext.large,
    marginTop: spacing[8],
  },
})
