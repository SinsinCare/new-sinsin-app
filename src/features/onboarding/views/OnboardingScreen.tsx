import { Pressable, ScrollView } from "react-native"
import { YStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LoadingScreen } from "@/src/shared/components"
import { useOnboarding } from "../hooks"
import {
  OnboardingHeader,
  ProgressBar,
  WelcomeStepContent,
  OnlyStepContent,
  MultiStepContent,
  InputStepContent,
} from "../components"

export function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const {
    phase,
    hasCkd,
    steps,
    currentStep,
    currentStepIndex,
    currentAnswer,
    isLoading,
    isSubmitting,
    isLastStep,
    hasValidAnswer,
    handleWelcomeSelect,
    handleWelcomeConfirm,
    handleOnlySelect,
    handleMultiToggle,
    handleInputChange,
    handleNext,
    handleBack,
    handleSkip,
  } = useOnboarding()

  if (isLoading) {
    return <LoadingScreen message="준비 중..." />
  }

  if (phase === "welcome") {
    return (
      <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
        <OnboardingHeader
          currentStepIndex={-1}
          totalSteps={0}
          onBack={() => {}}
          onSkip={handleSkip}
          showCounter={false}
          showBack={false}
        />

        <YStack flex={1} justifyContent="space-between">
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32 }}
          >
            <Text
              fontSize={22}
              fontWeight="600"
              color="#17191C"
              letterSpacing={-0.44}
              lineHeight={30.8}
              marginBottom={8}
            >
              만성 콩팥병(CKD) 진단을{"\n"}받으신 적이 있으신가요?
            </Text>
            <Text
              fontSize={15}
              lineHeight={18}
              color="#787C83"
              marginBottom={32}
            >
              맞춤 건강 관리를 위해 알려주세요
            </Text>

            <WelcomeStepContent
              selectedValue={hasCkd}
              onSelect={handleWelcomeSelect}
            />
          </ScrollView>

          <YStack paddingHorizontal={20} paddingBottom={insets.bottom + 24}>
            <Pressable
              onPress={handleWelcomeConfirm}
              disabled={hasCkd === null}
            >
              <YStack
                backgroundColor={hasCkd !== null ? "#5464F2" : "#5464F247"}
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
                  다음
                </Text>
              </YStack>
            </Pressable>
          </YStack>
        </YStack>
      </YStack>
    )
  }

  if (steps.length === 0) {
    return <LoadingScreen message="온보딩 데이터가 없습니다." />
  }

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      <OnboardingHeader
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        onBack={handleBack}
        onSkip={handleSkip}
      />

      <ProgressBar current={currentStepIndex} total={steps.length} />

      <YStack flex={1} justifyContent="space-between">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32 }}
          keyboardShouldPersistTaps="handled"
        >
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

          {currentStep.type === "only" && (
            <OnlyStepContent
              options={currentStep.values}
              selectedKeys={currentAnswer?.selectedKeys ?? []}
              onSelect={handleOnlySelect}
            />
          )}

          {currentStep.type === "multi" && (
            <MultiStepContent
              options={currentStep.values}
              selectedKeys={currentAnswer?.selectedKeys ?? []}
              onToggle={handleMultiToggle}
            />
          )}

          {currentStep.type === "input" && (
            <InputStepContent
              fields={currentStep.values}
              values={currentAnswer?.inputValues ?? {}}
              onChange={handleInputChange}
            />
          )}
        </ScrollView>

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
