import { useState } from "react"
import { Pressable, ScrollView } from "react-native"
import { YStack, XStack, Text } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useForm } from "react-hook-form"
import { Ionicons } from "@expo/vector-icons"
import { FormTextField, BottomSheetPicker } from "../../src/shared/components"
import { useSignupStore } from "../../src/stores/signupStore"

interface ProfileForm {
  name: string
  referralCode: string
}

function generateYearOptions() {
  const currentYear = new Date().getFullYear()
  const options = []
  for (let y = currentYear; y >= 1920; y--) {
    options.push({ label: `${y}년`, value: String(y) })
  }
  return options
}

function generateMonthOptions() {
  return Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}월`,
    value: String(i + 1).padStart(2, "0"),
  }))
}

function generateDayOptions(year: string, month: string) {
  if (!year || !month) {
    return Array.from({ length: 31 }, (_, i) => ({
      label: `${i + 1}일`,
      value: String(i + 1).padStart(2, "0"),
    }))
  }
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => ({
    label: `${i + 1}일`,
    value: String(i + 1).padStart(2, "0"),
  }))
}

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets()
  const setName = useSignupStore((s) => s.setName)
  const setBirth = useSignupStore((s) => s.setBirth)
  const setGenderStore = useSignupStore((s) => s.setGender)
  const setReferralCodeStore = useSignupStore((s) => s.setReferralCode)

  const [birthYear, setBirthYear] = useState("")
  const [birthMonth, setBirthMonth] = useState("")
  const [birthDay, setBirthDay] = useState("")
  const [gender, setGender] = useState<"male" | "female" | "">("")

  const {
    control,
    watch,
    handleSubmit,
    formState: { isValid: formFieldsValid },
  } = useForm<ProfileForm>({
    defaultValues: { name: "", referralCode: "" },
    mode: "onChange",
  })

  const name = watch("name")

  const isValid =
    !!name && !!birthYear && !!birthMonth && !!birthDay && !!gender

  const onSubmit = (data: ProfileForm) => {
    setName(data.name)
    setBirth(birthYear, birthMonth, birthDay)
    setGenderStore(gender as "male" | "female")
    setReferralCodeStore(data.referralCode)
    router.push("/(auth)/nickname-setup")
  }

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      {/* Top Navigation */}
      <YStack height={56} justifyContent="center">
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", left: 9, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>
      </YStack>

      {/* Content */}
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
            {/* 이름 */}
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

            {/* 출생년도 */}
            <YStack>
              <XStack paddingBottom={10}>
                <Text
                  fontSize={13}
                  fontWeight="500"
                  color="#17191C"
                  letterSpacing={-0.3}
                  lineHeight={18.2}
                >
                  생년월일
                </Text>
                <Text fontSize={13} fontWeight="500" color="#FF3B30">
                  {" "}
                  *
                </Text>
              </XStack>
              <XStack gap={8}>
                <YStack flex={1}>
                  <BottomSheetPicker
                    value={birthYear}
                    options={generateYearOptions()}
                    onSelect={(v) => {
                      setBirthYear(v)
                      // Reset day if it exceeds new month's days
                      if (birthMonth && birthDay) {
                        const maxDay = new Date(
                          Number(v),
                          Number(birthMonth),
                          0,
                        ).getDate()
                        if (Number(birthDay) > maxDay) setBirthDay("")
                      }
                    }}
                    placeholder="년"
                  />
                </YStack>
                <YStack flex={1}>
                  <BottomSheetPicker
                    value={birthMonth}
                    options={generateMonthOptions()}
                    onSelect={(v) => {
                      setBirthMonth(v)
                      if (birthYear && birthDay) {
                        const maxDay = new Date(
                          Number(birthYear),
                          Number(v),
                          0,
                        ).getDate()
                        if (Number(birthDay) > maxDay) setBirthDay("")
                      }
                    }}
                    placeholder="월"
                  />
                </YStack>
                <YStack flex={1}>
                  <BottomSheetPicker
                    value={birthDay}
                    options={generateDayOptions(birthYear, birthMonth)}
                    onSelect={setBirthDay}
                    placeholder="일"
                  />
                </YStack>
              </XStack>
            </YStack>

            {/* 성별 */}
            <YStack>
              <XStack paddingBottom={10}>
                <Text
                  fontSize={13}
                  fontWeight="500"
                  color="#17191C"
                  letterSpacing={-0.3}
                  lineHeight={18.2}
                >
                  성별
                </Text>
                <Text fontSize={13} fontWeight="500" color="#FF3B30">
                  {" "}
                  *
                </Text>
              </XStack>
              <XStack gap={8}>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => setGender("male")}
                >
                  <YStack
                    height={52}
                    borderRadius={8}
                    borderWidth={1}
                    borderColor={
                      gender === "male" ? "#5464F2" : "rgba(218,223,230,0.6)"
                    }
                    backgroundColor={gender === "male" ? "#F5F6FF" : "white"}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text
                      fontSize={16}
                      fontWeight={gender === "male" ? "600" : "400"}
                      color={gender === "male" ? "#5464F2" : "#17191C"}
                      letterSpacing={-0.3}
                    >
                      남자
                    </Text>
                  </YStack>
                </Pressable>
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => setGender("female")}
                >
                  <YStack
                    height={52}
                    borderRadius={8}
                    borderWidth={1}
                    borderColor={
                      gender === "female" ? "#5464F2" : "rgba(218,223,230,0.6)"
                    }
                    backgroundColor={gender === "female" ? "#F5F6FF" : "white"}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text
                      fontSize={16}
                      fontWeight={gender === "female" ? "600" : "400"}
                      color={gender === "female" ? "#5464F2" : "#17191C"}
                      letterSpacing={-0.3}
                    >
                      여자
                    </Text>
                  </YStack>
                </Pressable>
              </XStack>
            </YStack>

            {/* 추천인 */}
            <FormTextField<ProfileForm>
              name="referralCode"
              control={control}
              label="추천인 코드"
              placeholder="추천인 코드를 입력해주세요 (선택)"
            />
          </YStack>
        </ScrollView>

        {/* 다음 단계 버튼 */}
        <YStack paddingHorizontal={20} paddingBottom={insets.bottom + 24}>
          <Pressable onPress={handleSubmit(onSubmit)} disabled={!isValid}>
            <YStack
              backgroundColor={isValid ? "#5464F2" : "#5464F247"}
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
