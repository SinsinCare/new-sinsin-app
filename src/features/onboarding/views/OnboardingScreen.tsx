import { Keyboard, ScrollView, TouchableWithoutFeedback } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { V2BottomCTA } from "@/src/design-system-v2"
import { YStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tokens } from "@/src/theme/tokens"
import { KeyboardAwareView, LoadingScreen } from "@/src/shared/components"
import { useOnboarding } from "../hooks"
import {
  OnboardingHeader,
  ProgressBar,
  WelcomeStepContent,
  OnlyStepContent,
  MultiStepContent,
  InputStepContent,
  OnboardingQuestionHeader,
  OnboardingCompletionContent,
} from "../components"
import {
  ONBOARDING_SCROLL_CONTENT_STYLE,
  getOnboardingLoadingPresentation,
  shouldShowOnboardingBackButton,
} from "../data/onboardingPresentation"

export function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const isDark = useAppColorScheme() === "dark"
  const bg = isDark ? tokens.color.appBgDark.val : "white"
  const textColor = isDark ? tokens.color.textDark.val : "#17191C"
  const textSub = isDark ? tokens.color.textDarkSub.val : "#787C83"

  const {
    phase,
    hasCkd,
    steps,
    currentStep,
    currentStepIndex,
    currentAnswer,
    isInitializing,
    isLoadingSteps,
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
    handleCompletionStart,
  } = useOnboarding()

  const loadingPresentation = getOnboardingLoadingPresentation(
    isInitializing,
    isLoadingSteps,
  )

  if (loadingPresentation === "screen") {
    return <LoadingScreen message="준비 중..." />
  }

  if (phase === "welcome") {
    return (
      <YStack flex={1} backgroundColor={bg} paddingTop={insets.top}>
        <OnboardingHeader
          currentStepIndex={-1}
          totalSteps={0}
          onBack={() => {}}
          title="사용자 정보"
          showCounter={false}
          showBack={false}
        />

        <YStack flex={1}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={ONBOARDING_SCROLL_CONTENT_STYLE}
            showsVerticalScrollIndicator={false}
          >
            <Text
              fontSize={22}
              fontWeight="600"
              color={textColor}
              letterSpacing={-0.44}
              lineHeight={30.8}
              marginBottom={8}
            >
              만성 콩팥병(CKD) 진단을{"\n"}받으신 적이 있으신가요?
            </Text>
            <Text
              fontSize={15}
              lineHeight={18}
              color={textSub}
              marginBottom={32}
            >
              맞춤 건강 관리를 위해 알려주세요
            </Text>

            <WelcomeStepContent
              selectedValue={hasCkd}
              onSelect={handleWelcomeSelect}
            />
          </ScrollView>

          <V2BottomCTA
            primaryLabel="다음"
            onPrimary={handleWelcomeConfirm}
            primaryProps={{
              disabled: hasCkd === null || isLoadingSteps,
              loading: loadingPresentation === "cta",
            }}
          />
        </YStack>
      </YStack>
    )
  }

  if (phase === "complete") {
    return <OnboardingCompletionContent onStart={handleCompletionStart} />
  }

  if (steps.length === 0) {
    return <LoadingScreen message="온보딩 데이터가 없습니다." />
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <YStack flex={1} backgroundColor={bg} paddingTop={insets.top}>
        <OnboardingHeader
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          onBack={handleBack}
          title="신장 정보"
          showBack={shouldShowOnboardingBackButton(phase, currentStepIndex)}
        />

        <ProgressBar current={currentStepIndex} total={steps.length} />

        <KeyboardAwareView>
          <YStack flex={1}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={ONBOARDING_SCROLL_CONTENT_STYLE}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <OnboardingQuestionHeader
                title={currentStep.title}
                subtitle={currentStep.subTitle}
                titleColor={textColor}
                subtitleColor={textSub}
              />

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
                  onSubmit={handleNext}
                />
              )}
            </ScrollView>

            <V2BottomCTA
              primaryLabel={isLastStep ? "완료" : "다음"}
              onPrimary={handleNext}
              primaryProps={{
                disabled: !hasValidAnswer() || isSubmitting,
                loading: isSubmitting,
              }}
            />
          </YStack>
        </KeyboardAwareView>
      </YStack>
    </TouchableWithoutFeedback>
  )
}
