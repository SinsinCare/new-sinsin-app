import { useEffect, useState } from "react"
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { router, useNavigation } from "expo-router"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  V2Button,
  V2TextField,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { BottomSheetPicker } from "@/src/shared/components"
import {
  AuthKeyboardFooter,
  AUTH_KEYBOARD_FOOTER_CLEARANCE,
  BirthDatePicker,
  GenderSelector,
} from "../components"
import { ACQUISITION_SOURCE_OPTIONS } from "../data/acquisitionSources"
import {
  getNextProfileSetupStep,
  getPreviousProfileSetupStep,
  getProfileSetupStepError,
  PROFILE_SETUP_STEP_TITLES,
  requiresNicknameAvailability,
  type ProfileSetupStep,
} from "../data/profileSetupFlow"
import { formatKoreanMobileInput } from "../data/phoneNumber"
import { useProfileSetup } from "../hooks"
import type { ProfileSetupDraft } from "../types"

const EMPTY_DRAFT: ProfileSetupDraft = {
  name: "",
  birthDate: "",
  gender: "",
  phoneNumber: "",
  acquisitionSource: "",
  acquisitionSourceOther: "",
  nickname: "",
}

export function ProfileSetupScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const { colors } = useV2Theme()
  const [step, setStep] = useState<ProfileSetupStep>("name")
  const [stepError, setStepError] = useState("")
  const [isAcquisitionPickerOpen, setIsAcquisitionPickerOpen] = useState(false)
  const {
    isCompletionMode,
    isPrefilling,
    isSubmitting,
    isVerifyingNickname,
    submitError,
    prefillValues,
    clearNicknameVerification,
    isNicknameVerified,
    verifyNickname,
    submit,
  } = useProfileSetup()
  const { control, getValues, reset } = useForm<ProfileSetupDraft>({
    defaultValues: EMPTY_DRAFT,
    mode: "onChange",
  })
  const watchedDraft = useWatch({ control })
  const draft = {
    ...EMPTY_DRAFT,
    ...watchedDraft,
  } as ProfileSetupDraft
  const acquisitionSource = draft.acquisitionSource
  const isFinalInputStep = step === "acquisition"
  const isFirstStep = step === "name"
  const isCurrentStepValid = !getProfileSetupStepError(step, draft)

  useEffect(() => {
    if (prefillValues) reset(prefillValues)
  }, [prefillValues, reset])

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: isFirstStep && !isCompletionMode,
    })
    return () => navigation.setOptions({ gestureEnabled: true })
  }, [isCompletionMode, isFirstStep, navigation])

  useEffect(() => {
    if (isFirstStep && !isCompletionMode) return
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        const previous = getPreviousProfileSetupStep(step)
        if (previous) {
          setStep(previous)
          setStepError("")
        }
        return true
      },
    )
    return () => subscription.remove()
  }, [isCompletionMode, isFirstStep, step])

  const moveBack = () => {
    Keyboard.dismiss()
    const previous = getPreviousProfileSetupStep(step)
    if (previous) {
      setStep(previous)
      setStepError("")
      return
    }
    if (isCompletionMode) return
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/(auth)/signup-password")
  }

  const moveForward = async () => {
    const draft = getValues()
    const error = getProfileSetupStepError(step, draft)
    if (error) {
      setStepError(error)
      return
    }

    setStepError("")
    if (requiresNicknameAvailability(step) && !isNicknameVerified(draft)) {
      const verified = await verifyNickname(draft.nickname)
      if (!verified) return
    }

    if (isFinalInputStep) {
      Keyboard.dismiss()
      void submit(draft)
      return
    }

    const next = getNextProfileSetupStep(step)
    if (next) setStep(next)
  }

  const renderStep = () => {
    switch (step) {
      case "name":
        return (
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <V2TextField
                variant="box"
                label="이름"
                required
                accessibilityLabel="이름 필수 입력"
                value={field.value}
                onChangeText={(value) => {
                  setStepError("")
                  field.onChange(value)
                }}
                onBlur={field.onBlur}
                placeholder="이름을 입력해주세요"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                maxLength={100}
                error={stepError}
              />
            )}
          />
        )
      case "birthDate":
        return (
          <Controller
            name="birthDate"
            control={control}
            render={({ field }) => (
              <BirthDatePicker
                value={field.value}
                onChange={(value) => {
                  setStepError("")
                  field.onChange(value)
                }}
                error={stepError}
              />
            )}
          />
        )
      case "gender":
        return (
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <GenderSelector
                value={field.value}
                onChange={(value) => {
                  setStepError("")
                  field.onChange(value)
                }}
                error={stepError}
              />
            )}
          />
        )
      case "phoneNumber":
        return (
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <V2TextField
                variant="box"
                label="전화번호"
                required
                accessibilityLabel="전화번호 필수 입력"
                value={field.value}
                onChangeText={(value) => {
                  setStepError("")
                  field.onChange(formatKoreanMobileInput(value))
                }}
                onBlur={field.onBlur}
                placeholder="010-1234-5678"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="next"
                maxLength={13}
                error={stepError}
              />
            )}
          />
        )
      case "acquisition":
        return (
          <View style={styles.acquisitionContent}>
            <Controller
              name="acquisitionSource"
              control={control}
              render={({ field }) => (
                <BottomSheetPicker
                  label="알게된 경로"
                  value={field.value}
                  options={[...ACQUISITION_SOURCE_OPTIONS]}
                  onSelect={(value) => {
                    setStepError("")
                    field.onChange(value)
                  }}
                  onOpenChange={setIsAcquisitionPickerOpen}
                  placeholder="알게된 경로를 선택해주세요"
                  required
                />
              )}
            />
            {acquisitionSource === "OTHER" ? (
              <Controller
                name="acquisitionSourceOther"
                control={control}
                render={({ field }) => (
                  <V2TextField
                    variant="box"
                    label="직접 입력"
                    required
                    accessibilityLabel="알게 된 경로 직접 입력"
                    value={field.value}
                    onChangeText={(value) => {
                      setStepError("")
                      field.onChange(value)
                    }}
                    onBlur={field.onBlur}
                    placeholder="알게 된 경로를 입력해주세요"
                    maxLength={200}
                    error={stepError}
                  />
                )}
              />
            ) : null}
            {stepError || submitError ? (
              <Text
                style={[
                  typography.subtext.medium,
                  { color: colors.status.negative },
                ]}
              >
                {stepError || submitError}
              </Text>
            ) : null}
          </View>
        )
      case "nickname":
        return (
          <Controller
            name="nickname"
            control={control}
            render={({ field }) => (
              <V2TextField
                variant="box"
                label="닉네임"
                required
                accessibilityLabel="닉네임 필수 입력"
                accessibilityHint="한글, 영문, 숫자 2~14자로 입력하세요"
                value={field.value}
                onChangeText={(value) => {
                  setStepError("")
                  clearNicknameVerification()
                  field.onChange(value)
                }}
                onBlur={field.onBlur}
                placeholder="닉네임을 입력해주세요"
                autoComplete="nickname"
                maxLength={14}
                error={stepError || submitError}
              />
            )}
          />
        )
    }
  }

  const buttonLabel = isFinalInputStep ? "가입 완료" : "다음"
  const buttonDisabled =
    !isCurrentStepValid || isPrefilling || isSubmitting || isVerifyingNickname

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <View style={{ height: insets.top + 56 }}>
        {(!isFirstStep || !isCompletionMode) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            hitSlop={8}
            onPress={moveBack}
            style={[styles.backButton, { top: insets.top + 16 }]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.label.normal}
            />
          </Pressable>
        )}
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={AUTH_KEYBOARD_FOOTER_CLEARANCE}
        disableScrollOnKeyboardHide
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.title.medium, { color: colors.label.normal }]}>
          {PROFILE_SETUP_STEP_TITLES[step]}
        </Text>
        <View style={styles.field}>{renderStep()}</View>
      </KeyboardAwareScrollView>

      <AuthKeyboardFooter
        horizontalPadding={spacing[20]}
        backgroundColor={colors.background.default}
        keyboardTrackingEnabled={!isAcquisitionPickerOpen}
      >
        <V2Button
          size="xl"
          color="brand"
          fullWidth
          loading={isSubmitting || isPrefilling || isVerifyingNickname}
          disabled={buttonDisabled}
          onPress={moveForward}
        >
          {isPrefilling
            ? "불러오는 중..."
            : isVerifyingNickname
              ? "확인 중..."
              : buttonLabel}
        </V2Button>
        {!isFinalInputStep && submitError && step !== "nickname" ? (
          <Text
            style={[
              styles.submitError,
              typography.subtext.medium,
              { color: colors.status.negative },
            ]}
          >
            {submitError}
          </Text>
        ) : null}
      </AuthKeyboardFooter>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backButton: { position: "absolute", left: 12, padding: 4 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing[20],
    paddingTop: spacing[28],
    paddingBottom: spacing[24],
  },
  field: { marginTop: spacing[24] },
  acquisitionContent: { gap: spacing[12] },
  submitError: { marginTop: spacing[10], textAlign: "center" },
})
