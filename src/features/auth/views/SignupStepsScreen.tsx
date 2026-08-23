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
    requiresSignOutToExit,
    draft,
    updateDraft,
    validity,
    stepError,
    submitError,
    isBusy,
    isPrefilling,
    goNext,
    goBack,
    reportStepInputBlocked,
  } = useSignupSteps()

  const copy = getSignupStepCopy()[step]
  const fieldError = stepError || validity.message

  /*
    ■ 옛 주석이 틀렸던 자리 (실기기 영상, 2026-08-23)

    여기에는 "소셜 가입 도중에는 첫 스텝에서 빠져나갈 곳이 없다(로그인은 이미 끝났다)"
    가 적혀 있었고, 그 전제로 **하드웨어 백을 삼켰다**(`return isCompletionMode`).
    전제가 틀렸다 — 로그인이 끝났다는 것은 나갈 곳이 없다는 뜻이 아니다.
    **로그아웃해서 로그인 화면으로 돌아갈 수 있다.**

    그리고 그 화면은 `canGoBack === false` 라 헤더 컨트롤도 없고 제스처도 꺼져 있었다.
    안드로이드는 하드웨어 백을 삼켜서 갇혔고, **iOS 는 하드웨어 백 자체가 없어
    `BackHandler` 가 돌지도 않았다** — 즉 iOS 사용자에게는 시트를 끝까지 완주하는 것
    말고 아무 통로도 남아 있지 않았다. 카카오 로그인이 안 되는 계정이 여기 들어오면
    앱 삭제가 유일한 탈출이었다.

    이제 **두 경로가 같은 `goBack` 하나를 지난다.** 한쪽만 고치면 반쪽만 고쳐진다.
  */
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack()
      return true
    })
    return () => sub.remove()
  }, [goBack])

  useEffect(() => {
    /* 엣지 스와이프는 `goBack` 을 지나지 않고 네이티브가 바로 팝한다. 로그아웃해야만
       나갈 수 있는 상태에서 켜 두면 확인창도 로그아웃도 없이 화면만 사라지고, 세션이
       남은 채라 가드가 곧바로 이리로 되돌려 놓는다. */
    navigation.setOptions({
      gestureEnabled: stepIndex === 0 && !requiresSignOutToExit,
    })
    return () => navigation.setOptions({ gestureEnabled: true })
  }, [navigation, requiresSignOutToExit, stepIndex])

  const submitStep = () => {
    if (!validity.canProceed) {
      hapticInvalid()
      // CTA 는 비활성이므로 여기 오는 것은 키보드 엔터 제출뿐이다. 그래도 세는 이유는
      // 이것이 이 화면에서 "눌렀는데 안 됐다" 가 남길 수 있는 **유일한** 흔적이라서다.
      reportStepInputBlocked()
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
      /* 컨트롤은 **항상** 그린다 — iOS 에는 이것 말고 나갈 방법이 없다. */
      onBack={goBack}
      backLabel={
        requiresSignOutToExit ? t("signup.steps.exit.control") : undefined
      }
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
