import { useEffect, useState } from "react"
import { Modal, Pressable } from "react-native"
import { Text, XStack, YStack } from "tamagui"
import { Button, GlassmorphicCard } from "@/src/shared/components"
import type {
  FoodAnalysisConfirmationRequest,
  FoodAnalysisConfirmationOption,
  FoodAnalysisJob,
} from "@/src/types"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

interface FoodAnalysisConfirmationProps {
  job: FoodAnalysisJob | null
  onSubmit: (request: FoodAnalysisConfirmationRequest) => Promise<void>
  onClose: () => void
}

export function FoodAnalysisConfirmation({
  job,
  onSubmit,
  onClose,
}: FoodAnalysisConfirmationProps) {
  const [answers, setAnswers] = useState<
    Record<string, FoodAnalysisConfirmationOption>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDarkMode = useAppColorScheme() === "dark"
  const questions = job?.confirmationQuestions ?? []

  useEffect(() => setAnswers({}), [job?.analysisId])

  const canSubmit =
    questions.length > 0 &&
    questions.every((question) => answers[question.questionId])

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
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
    <Modal
      visible={job?.status === "NEEDS_CONFIRMATION"}
      animationType="slide"
      onRequestClose={onClose}
    >
      <YStack
        flex={1}
        backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}
        paddingHorizontal="$4"
        paddingTop="$10"
        paddingBottom="$6"
        gap="$5"
      >
        <YStack gap="$2">
          <Text
            fontSize="$7"
            fontWeight="700"
            color={isDarkMode ? "$textDark" : "$color"}
          >
            음식과 양을 확인해 주세요
          </Text>
          <Text fontSize="$4" lineHeight={21} color="$colorSubtle">
            정확한 양을 선택하면 영양소 분석이 더 정확해져요.
          </Text>
        </YStack>

        <YStack flex={1} gap="$4">
          {questions.map((question) => (
            <GlassmorphicCard key={question.questionId} padding="$4">
              <YStack gap="$3">
                <Text
                  fontSize="$5"
                  fontWeight="600"
                  color={isDarkMode ? "$textDark" : "$color"}
                >
                  {question.prompt}
                </Text>
                <XStack flexWrap="wrap" gap="$2">
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
                        <YStack
                          borderRadius="$6"
                          borderWidth={1}
                          borderColor={selected ? "$sub6" : "$borderColor"}
                          backgroundColor={
                            selected ? "$sub1" : "$cardBackground"
                          }
                          paddingHorizontal="$4"
                          paddingVertical="$3"
                        >
                          <Text
                            fontSize="$4"
                            fontWeight={selected ? "600" : "500"}
                            color={selected ? "$sub8" : "$colorSubtle"}
                          >
                            {option.label}
                          </Text>
                        </YStack>
                      </Pressable>
                    )
                  })}
                </XStack>
              </YStack>
            </GlassmorphicCard>
          ))}
        </YStack>

        <XStack gap="$3">
          <Button variant="ghost" flex={1} onPress={onClose}>
            나중에 하기
          </Button>
          <Button
            flex={1}
            disabled={!canSubmit}
            loading={isSubmitting}
            onPress={handleSubmit}
          >
            분석 계속하기
          </Button>
        </XStack>
      </YStack>
    </Modal>
  )
}
