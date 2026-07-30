import { useEffect } from "react"
import { BackHandler, Keyboard, View } from "react-native"
import { useNavigation } from "expo-router"
import { useTranslation } from "react-i18next"
import { hapticInvalid } from "@/src/lib/haptics"
import {
  AcquisitionSourceField,
  GenderOtherOption,
  GenderSelect,
  SignupStepLayout,
  StepFieldLabel,
  StepHelperText,
  StepTextInput,
} from "../components"
import { useSignupSteps } from "../hooks/useSignupSteps"
import { getSignupStepCopy, NICKNAME_MAX_LENGTH } from "../data/signupSteps"
import { formatBirthDateInput } from "../data/dateUtils"
import { formatKoreanMobileInput } from "../data/phoneNumber"

/**
 * 회원가입 필수정보 입력. 한 화면에 질문 하나씩 여섯 번 묻는다.
 *
 * 필드 라벨을 두지 않는다 — "닉네임을 입력해주세요" 위에 다시 "닉네임"을 쓰면
 * 같은 말이 두 번 나오고, 그만큼 답할 자리가 아래로 밀린다.
 *
 * 이메일 가입과 소셜 가입(추가정보 backfill 포함)이 같은 화면을 쓴다.
 * 어디로 제출할지는 useSignupSteps 가 계정 상태를 보고 정한다.
 */
export function SignupStepsScreen() {
  const { t } = useTranslation("auth")
  const navigation = useNavigation()
  const {
    step,
    stepIndex,
    direction,
    progress,
    isLastStep,
    isCompletionMode,
    draft,
    updateDraft,
    validity,
    stepError,
    submitError,
    isBusy,
    isPrefilling,
    goNext,
    goBack,
  } = useSignupSteps()

  const copy = getSignupStepCopy()[step]
  const fieldError = stepError || validity.message
  const canGoBack = stepIndex > 0 || !isCompletionMode

  // 소셜 가입 도중에는 첫 스텝에서 빠져나갈 곳이 없다(로그인은 이미 끝났다).
  // 그 경우에만 하드웨어 백을 삼키고, 나머지는 한 스텝 뒤로 보낸다.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stepIndex > 0) {
        goBack()
        return true
      }
      return isCompletionMode
    })
    return () => sub.remove()
  }, [goBack, isCompletionMode, stepIndex])

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: canGoBack && stepIndex === 0 })
    return () => navigation.setOptions({ gestureEnabled: true })
  }, [canGoBack, navigation, stepIndex])

  const submitStep = () => {
    if (!validity.canProceed) {
      hapticInvalid()
      return
    }
    if (isLastStep) Keyboard.dismiss()
    void goNext()
  }

  return (
    <SignupStepLayout
      stepKey={step}
      direction={direction}
      title={copy.title}
      subtitle={copy.subtitle}
      progress={progress}
      onBack={canGoBack ? goBack : undefined}
      ctaLabel={
        isLastStep
          ? isCompletionMode
            ? t("common.save")
            : t("common.start")
          : t("common.next")
      }
      ctaDisabled={!validity.canProceed || isPrefilling}
      ctaLoading={isBusy}
      onCtaPress={submitStep}
      errorMessage={submitError}
    >
      {step === "nickname" && (
        <StepTextInput
          autoFocus
          label={copy.label}
          accessibilityLabel={copy.label}
          value={draft.nickname}
          onChangeText={(nickname) => updateDraft({ nickname })}
          onClear={() => updateDraft({ nickname: "" })}
          placeholder={copy.placeholder}
          maxLength={NICKNAME_MAX_LENGTH}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={submitStep}
          hasError={!!fieldError}
        />
      )}

      {step === "birth" && (
        <StepTextInput
          autoFocus
          label={copy.label}
          accessibilityLabel={copy.label}
          value={draft.birthDate}
          onChangeText={(text) =>
            updateDraft({ birthDate: formatBirthDateInput(text) })
          }
          onClear={() => updateDraft({ birthDate: "" })}
          placeholder={copy.placeholder}
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="next"
          onSubmitEditing={submitStep}
          hasError={!!fieldError}
        />
      )}

      {step === "gender" && (
        <View>
          <StepFieldLabel>{copy.label}</StepFieldLabel>
          <GenderSelect
            value={draft.gender}
            onChange={(gender) => updateDraft({ gender })}
          />
          <GenderOtherOption
            selected={draft.gender === "OTHER"}
            onPress={() => updateDraft({ gender: "OTHER" })}
          />
        </View>
      )}

      {step === "name" && (
        <StepTextInput
          autoFocus
          label={copy.label}
          accessibilityLabel={copy.label}
          value={draft.name}
          onChangeText={(name) => updateDraft({ name })}
          onClear={() => updateDraft({ name: "" })}
          placeholder={copy.placeholder}
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={submitStep}
          hasError={!!fieldError}
        />
      )}

      {step === "phone" && (
        <StepTextInput
          autoFocus
          label={copy.label}
          accessibilityLabel={copy.label}
          value={draft.phoneNumber}
          onChangeText={(text) =>
            updateDraft({ phoneNumber: formatKoreanMobileInput(text) })
          }
          onClear={() => updateDraft({ phoneNumber: "" })}
          placeholder={copy.placeholder}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={13}
          returnKeyType="done"
          onSubmitEditing={submitStep}
          hasError={!!fieldError}
        />
      )}

      {step === "acquisition" && (
        <View>
          <StepFieldLabel>{copy.label}</StepFieldLabel>
          <AcquisitionSourceField
            value={draft.acquisitionSource}
            otherValue={draft.acquisitionSourceOther}
            onChange={(acquisitionSource, acquisitionSourceOther) =>
              updateDraft({ acquisitionSource, acquisitionSourceOther })
            }
          />
        </View>
      )}

      {fieldError ? (
        <StepHelperText message={fieldError} tone="error" />
      ) : copy.hint ? (
        <StepHelperText message={copy.hint} />
      ) : null}
    </SignupStepLayout>
  )
}
