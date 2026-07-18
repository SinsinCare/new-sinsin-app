import type { ReactNode } from "react"
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native"
import { YStack, Text } from "tamagui"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { Ionicons } from "@expo/vector-icons"
import { useAuthColors } from "../hooks"
import {
  AuthKeyboardFooter,
  AUTH_KEYBOARD_FOOTER_CLEARANCE,
} from "../components"
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
  keyboardAvoiding?: boolean
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
  keyboardAvoiding = false,
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

  const content = (
    <>
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
    </>
  )

  const footerContent = (
    <>
      {buttonAccessory}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: buttonDisabled || buttonLoading }}
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
    </>
  )

  const footer = keyboardAvoiding ? (
    <AuthKeyboardFooter backgroundColor={colors.bg}>
      {footerContent}
    </AuthKeyboardFooter>
  ) : (
    <YStack paddingBottom={insets.bottom + 24}>{footerContent}</YStack>
  )

  const scrollContent = keyboardAvoiding ? (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      bottomOffset={AUTH_KEYBOARD_FOOTER_CLEARANCE}
      disableScrollOnKeyboardHide
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {content}
    </KeyboardAwareScrollView>
  ) : (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {content}
    </ScrollView>
  )

  const body = scrollable ? (
    <YStack flex={1} paddingHorizontal={20}>
      {scrollContent}
      {footer}
    </YStack>
  ) : (
    <YStack flex={1} paddingHorizontal={20} justifyContent="space-between">
      {content}
      {footer}
    </YStack>
  )

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <YStack flex={1} backgroundColor={colors.bg} paddingTop={insets.top}>
        {showHeader && (
          <YStack height={56} justifyContent="center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="뒤로 가기"
              onPress={onBack ?? handleDefaultBack}
              style={{ position: "absolute", left: 9, padding: 4 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.icon} />
            </Pressable>
          </YStack>
        )}

        {body}
      </YStack>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
})
