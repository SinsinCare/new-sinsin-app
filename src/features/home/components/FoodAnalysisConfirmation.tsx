import { useEffect, useRef, useState } from "react"
import {
  useV2Theme,
  V2HStack,
  V2Text,
  V2VStack,
  V2BottomCTA,
} from "@/src/design-system-v2"
import { Pressable, ScrollView, StyleSheet } from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import { SafeAreaView } from "react-native-safe-area-context"
import { GlassmorphicCard } from "@/src/shared/components"
import type {
  FoodAnalysisConfirmationRequest,
  FoodAnalysisConfirmationOption,
  FoodAnalysisJob,
} from "@/src/types"
import { trackAnalyticsEvent } from "@/src/features/analytics"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

interface FoodAnalysisConfirmationProps {
  job: FoodAnalysisJob | null
  onSubmit: (request: FoodAnalysisConfirmationRequest) => Promise<void>
  onClose: () => void
}

// TODO(food-analysis-confirmation-ui): 질문 선택지와 건너뛰기 동작을 다시
// 설계한 뒤 EXPO_PUBLIC_FOOD_ANALYSIS_CONFIRMATION_ENABLED로 재활성화한다.
// API 계약과 컴포넌트는 향후 추가 정보 수집을 위해 의도적으로 보존한다.
export function FoodAnalysisConfirmation({
  job,
  onSubmit,
  onClose,
}: FoodAnalysisConfirmationProps) {
  const { colors } = useV2Theme()
  const { t } = useTranslation("common")
  const [answers, setAnswers] = useState<
    Record<string, FoodAnalysisConfirmationOption>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDarkMode = useAppColorScheme() === "dark"
  const questions = job?.confirmationQuestions ?? []

  useEffect(() => setAnswers({}), [job?.analysisId])

  /*
    진입은 **분석 하나당 1회**다. 이 컴포넌트는 홈이 살아 있는 내내 마운트돼 있고
    답을 고를 때마다 리렌더되므로, 렌더 본문이나 마운트에서 쏘면 한 번의 확인 화면이
    선택지 수만큼의 행이 된다.

    질문 문구와 선택지 원문은 어떤 속성으로도 나가지 않는다 — 둘 다 음식명이다.
  */
  const viewedAnalysisRef = useRef<string | null>(null)
  useEffect(() => {
    if (job?.status !== "NEEDS_CONFIRMATION") return
    if (viewedAnalysisRef.current === job.analysisId) return
    viewedAnalysisRef.current = job.analysisId
    trackAnalyticsEvent("food_analysis_confirm_viewed", {
      question_count: job.confirmationQuestions?.length ?? 0,
    })
  }, [job?.status, job?.analysisId, job?.confirmationQuestions])

  const canSubmit =
    questions.length > 0 &&
    questions.every((question) => answers[question.questionId])

  /**
   * 건너뛰기 — 분석이 미완으로 남는 자리. 그때까지 고른 답의 **개수**만 싣는다.
   * 질문을 몇 개까지 답하다 포기하는지가 곧 "질문 수를 줄일까" 의 근거다.
   */
  const handleDefer = () => {
    trackAnalyticsEvent("food_analysis_confirm_deferred", {
      question_count: questions.length,
      picked_count: Object.keys(answers).length,
    })
    onClose()
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    trackAnalyticsEvent("food_analysis_confirm_submitted", {
      question_count: questions.length,
    })
    try {
      const grouped = new Map<
        string,
        FoodAnalysisConfirmationRequest["items"][number]
      >()
      for (const question of questions) {
        const option = answers[question.questionId]
        const key = question.observationItemId ?? question.questionId
        const current = grouped.get(key) ?? {
          observationItemId: question.observationItemId ?? undefined,
          canonicalFoodId: "",
          analyzedGrams: 0,
        }
        if (question.type === "FOOD_MATCH") {
          current.canonicalFoodId = option.canonicalFoodId ?? option.value
        }
        if (question.type === "PORTION") {
          current.analyzedGrams =
            option.analyzedGrams ?? (Number(option.value) || 0)
        }
        if (option.canonicalFoodId) {
          current.canonicalFoodId = option.canonicalFoodId
        }
        if (option.analyzedGrams) current.analyzedGrams = option.analyzedGrams
        grouped.set(key, current)
      }
      await onSubmit({ items: [...grouped.values()] })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppModal
      visible={job?.status === "NEEDS_CONFIRMATION"}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[
          styles.safeArea,
          {
            backgroundColor: isDarkMode
              ? tokens.color.appBgDark.val
              : tokens.color.appBg.val,
          },
        ]}
      >
        <V2VStack flex={1} paddingTop={16} gap={16}>
          <V2VStack paddingHorizontal={16} gap={8}>
            <V2Text
              color={colors.label.normal}
              lineBreakStrategyIOS="hangul-word"
              style={{ fontSize: 17, fontWeight: "700" }}
            >
              {t("foodConfirmation.title")}
            </V2Text>
            <V2Text
              color={colors.label.alternative}
              lineBreakStrategyIOS="hangul-word"
              style={{ fontSize: 14, lineHeight: 21 }}
            >
              {t("foodConfirmation.body")}
            </V2Text>
          </V2VStack>

          <ScrollView
            bounces={false}
            overScrollMode="never"
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            contentInsetAdjustmentBehavior="never"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <V2VStack gap={16}>
              {questions.map((question) => (
                <GlassmorphicCard key={question.questionId} padding={16}>
                  <V2VStack gap={12}>
                    <V2Text
                      color={colors.label.normal}
                      lineBreakStrategyIOS="hangul-word"
                      style={{ fontSize: 15, fontWeight: "600" }}
                    >
                      {question.prompt}
                    </V2Text>
                    <V2HStack wrap="wrap" gap={8}>
                      {question.options.map((option) => {
                        const selected =
                          answers[question.questionId]?.value === option.value
                        return (
                          <Pressable
                            key={option.value}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            onPress={() =>
                              setAnswers((current) => ({
                                ...current,
                                [question.questionId]: option,
                              }))
                            }
                          >
                            <V2VStack
                              justify="center"
                              paddingHorizontal={16}
                              paddingVertical={12}
                              style={{
                                minHeight: 48,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: selected
                                  ? tokens.color.sub6.val
                                  : colors.line.normal,
                                backgroundColor: selected
                                  ? tokens.color.sub1.val
                                  : colors.background.lower,
                              }}
                            >
                              <V2Text
                                color={
                                  selected
                                    ? tokens.color.sub8.val
                                    : colors.label.alternative
                                }
                                lineBreakStrategyIOS="hangul-word"
                                style={{
                                  fontSize: 14,
                                  fontWeight: selected ? "600" : "500",
                                }}
                              >
                                {option.label}
                              </V2Text>
                            </V2VStack>
                          </Pressable>
                        )
                      })}
                    </V2HStack>
                  </V2VStack>
                </GlassmorphicCard>
              ))}
            </V2VStack>
          </ScrollView>

          <V2BottomCTA
            layout="horizontal"
            secondaryLabel={t("foodConfirmation.skip")}
            onSecondary={handleDefer}
            primaryLabel={t("foodConfirmation.continue")}
            onPrimary={() => {
              void handleSubmit()
            }}
            primaryProps={{
              disabled: !canSubmit,
              loading: isSubmitting,
            }}
          />
        </V2VStack>
      </SafeAreaView>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
})
