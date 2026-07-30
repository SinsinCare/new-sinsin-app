import { Keyboard, ScrollView, TouchableWithoutFeedback } from "react-native"
import { V2BottomCTA } from "@/src/design-system-v2"
import { Text, YStack } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
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
  localizeOnboardingStep,
  shouldShowOnboardingBackButton,
} from "../data"

export function OnboardingScreen() {
  const { t } = useTranslation("auth")
  const insets = useSafeAreaInsets()
  // 가입 화면과 같은 표면 팔레트를 본다 — 온보딩만 다른 회색을 쓰지 않는다.
  const surface = useSurface()
  const bg = surface.canvas
  const textColor = surface.textStrong
  const textSub = surface.textWeak

  const {
    phase,
    hasCkd,
    steps,
    currentStep,
    currentStepIndex,
    currentAnswer,
    isInitializing,
    isLoadingSteps,
    stepsLoadError,
    isSubmitting,
    isLastStep,
    hasValidAnswer,
    handleWelcomeSelect,
    handleWelcomeConfirm,
    retrySteps,
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
  const displayedStep = currentStep
    ? localizeOnboardingStep(currentStep, hasCkd)
    : currentStep

  if (loadingPresentation === "screen") {
    return <LoadingScreen message={t("onboarding.loading")} />
  }

  if (phase === "welcome") {
    return (
      <YStack flex={1} backgroundColor={bg} paddingTop={insets.top}>
        <OnboardingHeader
          currentStepIndex={-1}
          totalSteps={0}
          onBack={() => {}}
          title={t("onboarding.basicInfo")}
          showCounter={false}
          showBack={false}
        />

        <YStack flex={1}>
          <ScrollView
            bounces={false}
            overScrollMode="never"
            style={{ flex: 1 }}
            contentContainerStyle={ONBOARDING_SCROLL_CONTENT_STYLE}
            showsVerticalScrollIndicator={false}
          >
            <OnboardingQuestionHeader
              title={t("onboarding.welcomeTitle")}
              subtitle={t("onboarding.welcomeSubtitle")}
              titleColor={textColor}
              subtitleColor={textSub}
            />

            <WelcomeStepContent
              selectedValue={hasCkd}
              onSelect={handleWelcomeSelect}
            />
          </ScrollView>

          <V2BottomCTA
            primaryLabel={t("common.next")}
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
    return (
      <YStack flex={1} backgroundColor={bg} paddingTop={insets.top}>
        <OnboardingHeader
          currentStepIndex={0}
          totalSteps={0}
          onBack={handleBack}
          title={t("onboarding.kidneyInfo")}
          showCounter={false}
          showBack
        />
        <YStack
          flex={1}
          justifyContent="center"
          paddingHorizontal={24}
          gap={10}
        >
          <Text
            color={textColor}
            fontSize={22}
            fontWeight="700"
            textAlign="center"
          >
            {t("onboarding.loadFailedTitle")}
          </Text>
          <Text
            color={textSub}
            fontSize={15}
            lineHeight={22}
            textAlign="center"
          >
            {stepsLoadError ?? t("onboarding.loadFailedFallback")}
          </Text>
        </YStack>
        <V2BottomCTA
          primaryLabel={t("onboarding.retryQuestions")}
          onPrimary={retrySteps}
          secondaryLabel={t("onboarding.changeDiagnosis")}
          onSecondary={handleBack}
          layout="vertical"
          primaryProps={{
            disabled: isLoadingSteps,
            loading: isLoadingSteps,
          }}
        />
      </YStack>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <YStack flex={1} backgroundColor={bg} paddingTop={insets.top}>
        <OnboardingHeader
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          onBack={handleBack}
          title={t("onboarding.kidneyInfo")}
          showBack={shouldShowOnboardingBackButton(phase, currentStepIndex)}
        />

        <ProgressBar current={currentStepIndex} total={steps.length} />

        <KeyboardAwareView>
          <YStack flex={1}>
            <ScrollView
              bounces={false}
              overScrollMode="never"
              style={{ flex: 1 }}
              contentContainerStyle={ONBOARDING_SCROLL_CONTENT_STYLE}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <OnboardingQuestionHeader
                title={displayedStep.title}
                subtitle={displayedStep.subTitle}
                titleColor={textColor}
                subtitleColor={textSub}
              />

              {displayedStep.type === "only" && (
                <OnlyStepContent
                  options={displayedStep.values}
                  selectedKeys={currentAnswer?.selectedKeys ?? []}
                  onSelect={handleOnlySelect}
                />
              )}

              {displayedStep.type === "multi" && (
                <MultiStepContent
                  options={displayedStep.values}
                  selectedKeys={currentAnswer?.selectedKeys ?? []}
                  onToggle={handleMultiToggle}
                />
              )}

              {displayedStep.type === "input" && (
                <InputStepContent
                  fields={displayedStep.values}
                  values={currentAnswer?.inputValues ?? {}}
                  onChange={handleInputChange}
                  onSubmit={handleNext}
                />
              )}
            </ScrollView>

            <V2BottomCTA
              primaryLabel={isLastStep ? t("common.done") : t("common.next")}
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
