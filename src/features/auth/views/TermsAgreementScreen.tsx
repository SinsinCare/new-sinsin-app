import { Pressable, Linking } from "react-native"
import { YStack, XStack, Text, Separator } from "tamagui"
import { Checkbox } from "@/src/shared/components"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { useTermsAgreement, useAuthColors } from "../hooks"

export function TermsAgreementScreen() {
  const {
    terms,
    agreed,
    allChecked,
    requiredChecked,
    toggleAll,
    toggleItem,
    handleNext,
  } = useTermsAgreement()
  const colors = useAuthColors()

  const openTermsUrl = (url?: string) => {
    if (url) {
      Linking.openURL(url)
    }
  }

  return (
    <AuthScreenLayout
      title={`신신당부 서비스 이용약관에\n동의해주세요`}
      buttonLabel="동의하고 계속하기"
      buttonDisabled={!requiredChecked}
      onSubmit={handleNext}
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
                    <Text fontSize={14} color={colors.textSub} letterSpacing={-0.28}>
                      {term.required ? "[필수]" : "[선택]"}
                    </Text>
                    <Text fontSize={14} color={colors.text} letterSpacing={-0.28}>
                      {term.label}
                    </Text>
                  </XStack>
                </Pressable>
              </XStack>
              {term.url !== undefined && (
                <Pressable onPress={() => openTermsUrl(term.url)} hitSlop={8}>
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
      </YStack>
    </AuthScreenLayout>
  )
}
