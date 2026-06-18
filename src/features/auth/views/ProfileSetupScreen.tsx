import { useEffect } from "react"
import { ScrollView, Pressable, Keyboard, BackHandler } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useForm } from "react-hook-form"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheetPicker, FormTextField } from "@/src/shared/components"
import { BirthDatePicker } from "../components/BirthDatePicker"
import { GenderSelector } from "../components/GenderSelector"
import { useProfileSetup, useAuthColors } from "../hooks"
import { ACQUISITION_SOURCE_OPTIONS } from "../data/acquisitionSources"
import { tokens } from "@/src/theme/tokens"
import type { ProfileForm } from "../types"
import type { AcquisitionSourceInput } from "../data/acquisitionSources"

export function ProfileSetupScreen() {
  const insets = useSafeAreaInsets()
  const colors = useAuthColors()
  const {
    birthYear,
    birthMonth,
    birthDay,
    gender,
    acquisitionSource,
    isBackfillMode,
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
      acquisitionSourceOther: "",
      referralCode: "",
    },
    mode: "onChange",
  })

  const name = watch("name")
  const acquisitionSourceOther = watch("acquisitionSourceOther")
  const isOtherSource = acquisitionSource === "OTHER"
  const isValid =
    !!name.trim() &&
    !!birthYear &&
    !!birthMonth &&
    !!birthDay &&
    !!gender &&
    !!acquisitionSource &&
    (!isOtherSource || !!acquisitionSourceOther.trim())

  useEffect(() => {
    if (prefillValues) reset(prefillValues)
  }, [prefillValues, reset])

  useEffect(() => {
    if (!isBackfillMode) return
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true)
    return () => sub.remove()
  }, [isBackfillMode])

  return (
    <YStack flex={1} backgroundColor={colors.bg} paddingTop={insets.top}>
      <YStack height={56} justifyContent="center">
        {!isBackfillMode && (
          <Pressable
            onPress={() => router.back()}
            style={{ position: "absolute", left: 9, padding: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.icon} />
          </Pressable>
        )}
      </YStack>

      <YStack flex={1} justifyContent="space-between">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20 }}
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

            <YStack gap={12}>
              <BottomSheetPicker
                label="어떻게 신신을 알게 되셨나요?"
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
        </ScrollView>

        <YStack paddingHorizontal={20} paddingBottom={insets.bottom + 24}>
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
        </YStack>
      </YStack>
    </YStack>
  )
}
