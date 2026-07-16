import { useEffect } from "react"
import { Pressable, Keyboard, BackHandler, Platform } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router, useNavigation } from "expo-router"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { Controller, useForm } from "react-hook-form"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheetPicker, FormTextField } from "@/src/shared/components"
import { V2TextField } from "@/src/design-system-v2"
import { BirthDatePicker } from "../components/BirthDatePicker"
import { GenderSelector } from "../components/GenderSelector"
import {
  AuthKeyboardFooter,
  AUTH_KEYBOARD_FOOTER_CLEARANCE,
} from "../components"
import { useProfileSetup, useAuthColors } from "../hooks"
import { ACQUISITION_SOURCE_OPTIONS } from "../data/acquisitionSources"
import { tokens } from "@/src/theme/tokens"
import type { ProfileForm } from "../types"
import type { AcquisitionSourceInput } from "../data/acquisitionSources"
import {
  formatKoreanMobileInput,
  getRequiredPhoneNumberError,
  isValidKoreanMobile,
} from "../data/phoneNumber"

export function ProfileSetupScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const colors = useAuthColors()
  const {
    birthYear,
    birthMonth,
    birthDay,
    gender,
    acquisitionSource,
    isCompletionMode,
    isPrefilling,
    isSubmitting,
    submitError,
    prefillValues,
    handleYearChange,
    handleMonthChange,
    setBirthDay,
    setGender,
    setAcquisitionSource,
    handleNext,
  } = useProfileSetup()

  const { control, watch, handleSubmit, reset } = useForm<ProfileForm>({
    defaultValues: {
      name: "",
      phoneNumber: "",
      acquisitionSourceOther: "",
      referralCode: "",
    },
    mode: "onChange",
  })

  const name = watch("name")
  const phoneNumber = watch("phoneNumber")
  const acquisitionSourceOther = watch("acquisitionSourceOther")
  const isOtherSource = acquisitionSource === "OTHER"
  const isValid =
    !!name.trim() &&
    !!birthYear &&
    !!birthMonth &&
    !!birthDay &&
    !!gender &&
    isValidKoreanMobile(phoneNumber) &&
    !!acquisitionSource &&
    (!isOtherSource || !!acquisitionSourceOther.trim())

  useEffect(() => {
    if (prefillValues) reset(prefillValues)
  }, [prefillValues, reset])

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !isCompletionMode })
    return () => navigation.setOptions({ gestureEnabled: true })
  }, [isCompletionMode, navigation])

  useEffect(() => {
    if (!isCompletionMode) return
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true)
    return () => sub.remove()
  }, [isCompletionMode])

  return (
    <YStack flex={1} backgroundColor={colors.bg} paddingTop={insets.top}>
      <YStack height={56} justifyContent="center">
        {!isCompletionMode && (
          <Pressable
            onPress={() => router.back()}
            style={{ position: "absolute", left: 9, padding: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.icon} />
          </Pressable>
        )}
      </YStack>

      <YStack flex={1} justifyContent="space-between">
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          bottomOffset={AUTH_KEYBOARD_FOOTER_CLEARANCE}
          disableScrollOnKeyboardHide
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
          <Text
            fontSize={22}
            fontWeight="600"
            color={colors.text}
            letterSpacing={-0.44}
            lineHeight={26.4}
            marginBottom={8}
          >
            필수정보를 입력해주세요.
          </Text>
          <Text
            fontSize={15}
            lineHeight={18}
            color={colors.textSub}
            marginBottom={40}
          >
            서비스 이용을 위한 기본 정보를 입력해주세요
          </Text>

          <YStack gap={28}>
            <YStack>
              <XStack paddingBottom={10}>
                <Text
                  fontSize={13}
                  fontWeight="500"
                  color={colors.text}
                  letterSpacing={-0.3}
                  lineHeight={18.2}
                >
                  이름
                </Text>
                <Text
                  fontSize={13}
                  fontWeight="500"
                  color={tokens.color.error.val}
                >
                  {" "}
                  *
                </Text>
              </XStack>
              <FormTextField<ProfileForm>
                name="name"
                control={control}
                placeholder="이름을 입력해주세요"
                showValidState
                rules={{ required: "이름을 입력해주세요." }}
              />
            </YStack>

            <BirthDatePicker
              birthYear={birthYear}
              birthMonth={birthMonth}
              birthDay={birthDay}
              onYearChange={handleYearChange}
              onMonthChange={handleMonthChange}
              onDayChange={setBirthDay}
            />

            <GenderSelector value={gender} onChange={setGender} />

            <Controller
              name="phoneNumber"
              control={control}
              rules={{
                validate: (value) => getRequiredPhoneNumberError(value) ?? true,
              }}
              render={({ field, fieldState }) => (
                <V2TextField
                  variant="box"
                  label="전화번호 *"
                  value={field.value}
                  onChangeText={(value) =>
                    field.onChange(formatKoreanMobileInput(value))
                  }
                  onBlur={field.onBlur}
                  placeholder="010-1234-5678"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  returnKeyType="done"
                  maxLength={13}
                  error={fieldState.error?.message ?? false}
                  accessibilityLabel="전화번호 필수 입력"
                />
              )}
            />

            <YStack gap={12}>
              <BottomSheetPicker
                label="어떻게 신신당부를 알게 되었나요?"
                value={acquisitionSource}
                options={[...ACQUISITION_SOURCE_OPTIONS]}
                onSelect={(value) =>
                  setAcquisitionSource(value as AcquisitionSourceInput)
                }
                placeholder="유입경로를 선택해주세요"
                required
              />

              {isOtherSource && (
                <FormTextField<ProfileForm>
                  name="acquisitionSourceOther"
                  control={control}
                  placeholder="알게 된 경로를 입력해주세요"
                  maxLength={200}
                  showValidState
                  rules={{
                    required: "알게 된 경로를 입력해주세요.",
                  }}
                />
              )}
            </YStack>

            <FormTextField<ProfileForm>
              name="referralCode"
              control={control}
              label="추천인 코드"
              placeholder="추천인 코드를 입력해주세요 (선택)"
            />
          </YStack>
        </KeyboardAwareScrollView>

        <AuthKeyboardFooter horizontalPadding={20} backgroundColor={colors.bg}>
          <Pressable
            onPress={() => {
              Keyboard.dismiss()
              handleSubmit(handleNext)()
            }}
            disabled={!isValid || isSubmitting || isPrefilling}
          >
            <YStack
              backgroundColor={
                isValid && !isSubmitting && !isPrefilling
                  ? tokens.color.sub6.val
                  : tokens.color.sub6.val + "40"
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
                letterSpacing={0}
                lineHeight={20}
              >
                {isPrefilling
                  ? "불러오는 중..."
                  : isSubmitting
                    ? "저장 중..."
                    : isCompletionMode
                      ? "저장하기"
                      : "다음 단계"}
              </Text>
            </YStack>
          </Pressable>
          {submitError && (
            <Text
              color={tokens.color.error.val}
              fontSize={13}
              lineHeight={18}
              marginTop={10}
              textAlign="center"
            >
              {submitError}
            </Text>
          )}
        </AuthKeyboardFooter>
      </YStack>
    </YStack>
  )
}
