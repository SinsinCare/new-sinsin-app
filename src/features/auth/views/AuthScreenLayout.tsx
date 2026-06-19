import type { ReactNode } from "react"
import { Pressable, Keyboard } from "react-native"
import { YStack, Text } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuthColors } from "../hooks"
import { tokens } from "@/src/theme/tokens"

interface AuthScreenLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  buttonLabel: string
  buttonDisabled?: boolean
  buttonLoading?: boolean
  buttonAccessory?: ReactNode
  onSubmit: () => void
  onBack?: () => void
  showHeader?: boolean
  scrollable?: boolean
}

export function AuthScreenLayout({
  title,
  subtitle,
  children,
  buttonLabel,
  buttonDisabled = false,
  buttonLoading = false,
  buttonAccessory,
  onSubmit,
  onBack,
  showHeader = true,
  scrollable = false,
}: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets()
  const colors = useAuthColors()
  const handleDefaultBack = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/(auth)/login")
  }

  return (
    <YStack flex={1} backgroundColor={colors.bg} paddingTop={insets.top}>
      {showHeader && (
        <YStack height={56} justifyContent="center">
          <Pressable
            onPress={onBack ?? handleDefaultBack}
            style={{ position: "absolute", left: 9, padding: 4 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.icon} />
          </Pressable>
        </YStack>
      )}

      <YStack flex={1} paddingHorizontal={20} justifyContent="space-between">
        <YStack flex={scrollable ? 1 : undefined}>
          <Text
            fontSize={22}
            fontWeight="600"
            color={colors.text}
            letterSpacing={-0.44}
            lineHeight={26.4}
            marginBottom={subtitle ? 8 : 0}
          >
            {title}
          </Text>
          {subtitle && (
            <Text fontSize={15} lineHeight={18} color={colors.textSub}>
              {subtitle}
            </Text>
          )}
          {children}
        </YStack>

        <YStack paddingBottom={insets.bottom + 24}>
          {buttonAccessory}
          <Pressable
            onPress={() => {
              Keyboard.dismiss()
              onSubmit()
            }}
            disabled={buttonDisabled || buttonLoading}
          >
            <YStack
              backgroundColor={
                !buttonDisabled && !buttonLoading
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
                letterSpacing={-0.3}
                lineHeight={20}
              >
                {buttonLabel}
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  )
}
