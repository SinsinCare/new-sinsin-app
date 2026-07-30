import { StyleSheet, Text, View } from "react-native"
import { spacing } from "@/src/design-system-v2"
import { TYPE } from "@/src/theme/surface"
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
  // 가입 스텝 질문과 같은 스케일(20/30·700). 흐름이 이어지려면 크기가 같아야 한다.
  title: { ...TYPE.question, fontWeight: "700" },
  subtitle: {
    ...TYPE.caption,
    marginTop: spacing[8],
  },
})
