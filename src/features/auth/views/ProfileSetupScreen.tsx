import { ScrollView, Pressable } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useForm } from "react-hook-form"
import { Ionicons } from "@expo/vector-icons"
import { FormTextField } from "@/src/shared/components"
import { BirthDatePicker } from "../components/BirthDatePicker"
import { GenderSelector } from "../components/GenderSelector"
import { useProfileSetup } from "../hooks"
import type { ProfileForm } from "../types"

export function ProfileSetupScreen() {
  const insets = useSafeAreaInsets()
  const {
    birthYear,
    birthMonth,
    birthDay,
    gender,
    handleYearChange,
    handleMonthChange,
    setBirthDay,
    setGender,
    handleNext,
  } = useProfileSetup()

  const { control, watch, handleSubmit } = useForm<ProfileForm>({
    defaultValues: { name: "", referralCode: "" },
    mode: "onChange",
  })

  const name = watch("name")
  const isValid =
    !!name && !!birthYear && !!birthMonth && !!birthDay && !!gender

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      <YStack height={56} justifyContent="center">
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", left: 9, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>
      </YStack>

      <YStack flex={1} justifyContent="space-between">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <Text
            fontSize={22}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.44}
            lineHeight={26.4}
            marginBottom={8}
          >
            필수정보를 입력해주세요.
          </Text>
          <Text fontSize={15} lineHeight={18} color="#787C83" marginBottom={40}>
            서비스 이용을 위한 기본 정보를 입력해주세요
          </Text>

          <YStack gap={28}>
            <YStack>
              <XStack paddingBottom={10}>
                <Text
                  fontSize={13}
                  fontWeight="500"
                  color="#17191C"
                  letterSpacing={-0.3}
                  lineHeight={18.2}
                >
                  이름
                </Text>
                <Text fontSize={13} fontWeight="500" color="#FF3B30">
                  {" "}
                  *
                </Text>
              </XStack>
              <FormTextField<ProfileForm>
                name="name"
                control={control}
                placeholder="이름을 입력해주세요"
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

            <FormTextField<ProfileForm>
              name="referralCode"
              control={control}
              label="추천인 코드"
              placeholder="추천인 코드를 입력해주세요 (선택)"
            />
          </YStack>
        </ScrollView>

        <YStack paddingHorizontal={20} paddingBottom={insets.bottom + 24}>
          <Pressable onPress={handleSubmit(handleNext)} disabled={!isValid}>
            <YStack
              backgroundColor={isValid ? "#44AF94" : "#44AF9440"}
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
                다음 단계
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  )
}
