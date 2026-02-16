import { useEffect, useState, useCallback } from "react"
import { Pressable, ScrollView, Alert } from "react-native"
import { YStack, XStack, Text, Input } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { onboardingService } from "../src/services/data/onboardingService"
import { useOnboardingStore } from "../src/stores/onboardingStore"
import { useAuthStore } from "../src/stores/authStore"
import { Checkbox, LoadingScreen } from "../src/shared/components"
import type { OnboardingStep } from "../src/types"

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = useAuthStore((s) => s.user)
  const setAccountState = useAuthStore((s) => s.setAccountState)
  const {
    currentStepIndex,
    answers,
    setCurrentStepIndex,
    setAnswer,
    getAnswersArray,
    setOnboardingInProgress,
    reset: resetOnboarding,
  } = useOnboardingStore()

  useEffect(() => {
    setOnboardingInProgress(true)
    loadSteps()
    return () => {
      setOnboardingInProgress(false)
    }
  }, [])

  const loadSteps = async () => {
    try {
      const data = await onboardingService.getSteps()
      setSteps(data)
    } catch {
      Alert.alert("오류", "온보딩 데이터를 불러올 수 없습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const currentStep = steps[currentStepIndex]
  const isLastStep = currentStepIndex === steps.length - 1
  const currentAnswer = currentStep ? answers[currentStep.step] : undefined

  const hasValidAnswer = useCallback(() => {
    if (!currentStep) return false
    if (!currentAnswer) return false
    if (currentStep.type === "input") {
      const vals = currentAnswer.inputValues ?? {}
      return currentStep.values.every((v) => !!vals[v.key]?.trim())
    }
    return (currentAnswer.selectedKeys?.length ?? 0) > 0
  }, [currentStep, currentAnswer])

  const handleOnlySelect = (key: string) => {
    if (!currentStep) return
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: "only",
      selectedKeys: [key],
    })
  }

  const handleMultiToggle = (key: string) => {
    if (!currentStep) return
    const current = currentAnswer?.selectedKeys ?? []
    const updated = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key]
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: "multi",
      selectedKeys: updated,
    })
  }

  const handleInputChange = (key: string, text: string) => {
    if (!currentStep) return
    const existing = currentAnswer?.inputValues ?? {}
    setAnswer(currentStep.step, {
      step: currentStep.step,
      type: "input",
      inputValues: { ...existing, [key]: text },
    })
  }

  const completeOnboarding = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await onboardingService.submitAnswers({
        userId: user.uid,
        answers: getAnswersArray(),
      })
      setAccountState("ACTIVE")
      resetOnboarding()
      router.replace("/(tabs)/home")
    } catch {
      Alert.alert("오류", "온보딩을 완료할 수 없습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding()
    } else {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleSkip = async () => {
    if (!user) return
    setIsSubmitting(true)
    try {
      setAccountState("ACTIVE")
      resetOnboarding()
      router.replace("/(tabs)/home")
    } catch {
      Alert.alert("오류", "처리 중 문제가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <LoadingScreen message="준비 중..." />
  }

  if (steps.length === 0) {
    return <LoadingScreen message="온보딩 데이터가 없습니다." />
  }

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      {/* Header */}
      <XStack height={56} alignItems="center" paddingHorizontal={4}>
        {currentStepIndex > 0 ? (
          <Pressable onPress={handleBack} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#17191C" />
          </Pressable>
        ) : (
          <YStack width={40} />
        )}
        <YStack flex={1} alignItems="center">
          <Text fontSize={14} fontWeight="500" color="#787C83">
            {currentStepIndex + 1} / {steps.length}
          </Text>
        </YStack>
        <Pressable onPress={handleSkip} style={{ padding: 8 }}>
          <Text fontSize={14} color="#787C83">
            건너뛰기
          </Text>
        </Pressable>
      </XStack>

      {/* Progress Bar */}
      <YStack paddingHorizontal={20}>
        <YStack
          height={4}
          borderRadius={2}
          backgroundColor="#F0F0F0"
          overflow="hidden"
        >
          <YStack
            height={4}
            borderRadius={2}
            backgroundColor="#5464F2"
            width={`${((currentStepIndex + 1) / steps.length) * 100}%`}
          />
        </YStack>
      </YStack>

      {/* Content */}
      <YStack flex={1} justifyContent="space-between">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text
            fontSize={22}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.44}
            lineHeight={30.8}
            marginBottom={8}
          >
            {currentStep.title}
          </Text>
          <Text fontSize={15} lineHeight={18} color="#787C83" marginBottom={32}>
            {currentStep.subTitle}
          </Text>

          {/* Step Content */}
          {currentStep.type === "only" && (
            <YStack gap={12}>
              {currentStep.values.map((option) => {
                const isSelected =
                  currentAnswer?.selectedKeys?.includes(option.key) ?? false
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => handleOnlySelect(option.key)}
                  >
                    <XStack
                      height={56}
                      borderRadius={12}
                      borderWidth={1.5}
                      borderColor={
                        isSelected ? "#5464F2" : "rgba(218,223,230,0.6)"
                      }
                      backgroundColor={isSelected ? "#F5F6FF" : "white"}
                      alignItems="center"
                      paddingHorizontal={16}
                      gap={12}
                    >
                      <YStack
                        width={22}
                        height={22}
                        borderRadius={11}
                        borderWidth={isSelected ? 6 : 1.5}
                        borderColor={isSelected ? "#5464F2" : "#C5C8CE"}
                        backgroundColor="white"
                      />
                      <Text
                        fontSize={16}
                        fontWeight={isSelected ? "600" : "400"}
                        color={isSelected ? "#5464F2" : "#17191C"}
                        letterSpacing={-0.3}
                        flex={1}
                      >
                        {option.value}
                      </Text>
                    </XStack>
                  </Pressable>
                )
              })}
            </YStack>
          )}

          {currentStep.type === "multi" && (
            <YStack gap={12}>
              {currentStep.values.map((option) => {
                const isSelected =
                  currentAnswer?.selectedKeys?.includes(option.key) ?? false
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => handleMultiToggle(option.key)}
                  >
                    <XStack
                      height={56}
                      borderRadius={12}
                      borderWidth={1.5}
                      borderColor={
                        isSelected ? "#5464F2" : "rgba(218,223,230,0.6)"
                      }
                      backgroundColor={isSelected ? "#F5F6FF" : "white"}
                      alignItems="center"
                      paddingHorizontal={16}
                      gap={12}
                    >
                      <Checkbox
                        checked={isSelected}
                        onToggle={() => handleMultiToggle(option.key)}
                      />
                      <Text
                        fontSize={16}
                        fontWeight={isSelected ? "600" : "400"}
                        color={isSelected ? "#5464F2" : "#17191C"}
                        letterSpacing={-0.3}
                        flex={1}
                      >
                        {option.value}
                      </Text>
                    </XStack>
                  </Pressable>
                )
              })}
            </YStack>
          )}

          {currentStep.type === "input" && (
            <YStack gap={16}>
              {currentStep.values.map((field) => (
                <YStack key={field.key} gap={8}>
                  {field.label && (
                    <Text
                      fontSize={13}
                      fontWeight="500"
                      color="#17191C"
                      letterSpacing={-0.3}
                      lineHeight={18.2}
                    >
                      {field.label}
                    </Text>
                  )}
                  <XStack
                    height={52}
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="rgba(218,223,230,0.6)"
                    alignItems="center"
                    paddingHorizontal={16}
                    focusStyle={{
                      borderColor: "#5464F2",
                      borderWidth: 1.5,
                    }}
                  >
                    <Input
                      flex={1}
                      size="$4"
                      fontSize={16}
                      borderWidth={0}
                      backgroundColor="transparent"
                      paddingHorizontal={0}
                      placeholder="입력해주세요"
                      placeholderTextColor="$grey7"
                      keyboardType={
                        field.type === "number" ? "numeric" : "default"
                      }
                      value={currentAnswer?.inputValues?.[field.key] ?? ""}
                      onChangeText={(text) =>
                        handleInputChange(field.key, text)
                      }
                    />
                    {field.unit && (
                      <Text fontSize={16} color="#787C83" marginLeft={8}>
                        {field.unit}
                      </Text>
                    )}
                  </XStack>
                </YStack>
              ))}
            </YStack>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <YStack paddingHorizontal={20} paddingBottom={insets.bottom + 24}>
          <Pressable
            onPress={handleNext}
            disabled={!hasValidAnswer() || isSubmitting}
          >
            <YStack
              backgroundColor={
                hasValidAnswer() && !isSubmitting ? "#5464F2" : "#5464F247"
              }
              paddingVertical={16}
              paddingHorizontal={24}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                color="white"
                fontSize={16}
                fontWeight="500"
                letterSpacing={-0.3}
                lineHeight={20}
              >
                {isSubmitting ? "처리 중..." : isLastStep ? "완료" : "다음"}
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  )
}
