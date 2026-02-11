import { useState, useCallback } from "react"
import { Pressable, Linking } from "react-native"
import { YStack, XStack, Text, Separator } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Checkbox } from "../../src/shared/components"

interface TermItem {
  id: string
  label: string
  required: boolean
  url?: string
}

const TERMS: TermItem[] = [
  {
    id: "service",
    label: "서비스 이용약관 동의",
    required: true,
    url: "",
  },
  {
    id: "privacy",
    label: "개인정보 수집 및 이용 동의",
    required: true,
    url: "",
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신 동의",
    required: false,
  },
]

export default function TermsAgreementScreen() {
  const insets = useSafeAreaInsets()
  const [agreed, setAgreed] = useState<Record<string, boolean>>({})

  const allChecked = TERMS.every((t) => agreed[t.id])
  const requiredChecked = TERMS.filter((t) => t.required).every(
    (t) => agreed[t.id],
  )

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setAgreed({})
    } else {
      const next: Record<string, boolean> = {}
      TERMS.forEach((t) => {
        next[t.id] = true
      })
      setAgreed(next)
    }
  }, [allChecked])

  const toggleItem = useCallback((id: string) => {
    setAgreed((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleNext = () => {
    router.push("/(auth)/signup-email")
  }

  const openTermsUrl = (url?: string) => {
    if (url) {
      Linking.openURL(url)
    }
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
      <YStack flex={1} paddingHorizontal={20} justifyContent="space-between">
        <YStack gap={32}>
          {/* Title */}
          <Text
            fontSize={22}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.44}
            lineHeight={26.4}
          >
            신신당부 서비스 이용약관에{"\n"}
            동의해주세요
          </Text>

          {/* Agree All */}
          <YStack gap={16}>
            <Checkbox
              checked={allChecked}
              onToggle={toggleAll}
              label="전체 동의"
              size={24}
            />

            <Separator borderColor="#E8EAED" />

            {/* Individual Terms */}
            <YStack gap={16}>
              {TERMS.map((term) => (
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
                          color="#787C83"
                          letterSpacing={-0.28}
                        >
                          {term.required ? "[필수]" : "[선택]"}
                        </Text>
                        <Text
                          fontSize={14}
                          color="#3F444F"
                          letterSpacing={-0.28}
                        >
                          {term.label}
                        </Text>
                      </XStack>
                    </Pressable>
                  </XStack>
                  {term.url !== undefined && (
                    <Pressable
                      onPress={() => openTermsUrl(term.url)}
                      hitSlop={8}
                    >
                      <Text
                        fontSize={13}
                        color="#787C83"
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
        </YStack>

        {/* Next Button */}
        <YStack paddingBottom={insets.bottom + 24}>
          <Pressable onPress={handleNext} disabled={!requiredChecked}>
            <YStack
              backgroundColor={requiredChecked ? "#5464F2" : "#5464F247"}
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
                다음
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  )
}
