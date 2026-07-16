import { Pressable } from "react-native"
import { YStack, XStack, Text, Separator } from "tamagui"
import { router } from "expo-router"
import { Checkbox } from "@/src/shared/components"
import { V2TextField } from "@/src/design-system-v2"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { useTermsAgreement, useAuthColors } from "../hooks"

interface TermsAgreementScreenProps {
  mode?: "email" | "social"
  socialSignupToken?: string
}

export function TermsAgreementScreen({
  mode = "email",
  socialSignupToken,
}: TermsAgreementScreenProps) {
  const {
    terms,
    agreed,
    allChecked,
    canSubmit,
    isSubmitting,
    phoneNumber,
    phoneNumberError,
    toggleAll,
    toggleItem,
    handlePhoneNumberChange,
    handleBack,
    handleNext,
  } = useTermsAgreement({ mode, socialSignupToken })
  const colors = useAuthColors()

  const openLegalDocument = (documentType: string) => {
    router.push({
      pathname: "/legal-document",
      params: { type: documentType },
    })
  }

  return (
    <AuthScreenLayout
      title={`신신당부 서비스 이용약관에\n동의해주세요`}
      buttonLabel="동의하고 계속하기"
      buttonDisabled={!canSubmit || isSubmitting}
      buttonLoading={isSubmitting}
      onSubmit={handleNext}
      onBack={handleBack}
      scrollable
      keyboardAvoiding
    >
      <YStack gap={16} marginTop={32}>
        <Checkbox
          checked={allChecked}
          onToggle={toggleAll}
          label="전체 동의"
          size={24}
        />

        <Separator borderColor={colors.border} />

        <YStack gap={16}>
          {terms.map((term) => (
            <XStack
              key={term.id}
              alignItems="center"
              justifyContent="space-between"
            >
              <XStack flex={1} alignItems="center">
                <Checkbox
                  checked={!!agreed[term.id]}
                  onToggle={() => toggleItem(term.id)}
                />
                <Pressable
                  onPress={() => toggleItem(term.id)}
                  style={{ flex: 1, marginLeft: 10 }}
                >
                  <XStack alignItems="center" gap={4}>
                    <Text
                      fontSize={14}
                      color={colors.textSub}
                      letterSpacing={-0.28}
                    >
                      {term.required ? "[필수]" : "[선택]"}
                    </Text>
                    <Text
                      fontSize={14}
                      color={colors.text}
                      letterSpacing={-0.28}
                    >
                      {term.label}
                    </Text>
                  </XStack>
                </Pressable>
              </XStack>
              {term.documentType && (
                <Pressable
                  onPress={() =>
                    term.documentType && openLegalDocument(term.documentType)
                  }
                  hitSlop={8}
                >
                  <Text
                    fontSize={13}
                    color={colors.textSub}
                    letterSpacing={-0.26}
                    textDecorationLine="underline"
                  >
                    내용보기
                  </Text>
                </Pressable>
              )}
            </XStack>
          ))}
        </YStack>

        <Separator borderColor={colors.border} />

        <YStack gap={8} paddingBottom={8}>
          <V2TextField
            variant="box"
            label="전화번호 *"
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            placeholder="010-1234-5678"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            returnKeyType="done"
            maxLength={13}
            error={phoneNumberError ?? false}
            accessibilityLabel="전화번호 필수 입력"
            accessibilityHint="010으로 시작하는 휴대전화 번호 11자리를 입력해주세요"
          />
          <Text fontSize={13} lineHeight={19} color={colors.textSub}>
            전화번호는 회원정보로 수집하며, 마케팅 수신에 동의한 경우에만 마케팅
            정보 안내에 활용합니다.
          </Text>
          <Text fontSize={12} lineHeight={18} color={colors.textSub}>
            로그인, 계정 통합 또는 SMS 본인인증에는 사용하지 않습니다.
          </Text>
        </YStack>
      </YStack>
    </AuthScreenLayout>
  )
}
