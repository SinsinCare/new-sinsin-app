import type { ReactNode } from "react"
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native"
import { YStack, Text } from "tamagui"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useGoBack } from "@/src/shared/navigation"
import { useAuthColors } from "../hooks"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../data/authSurface"
import {
  AuthKeyboardFooter,
  AUTH_KEYBOARD_FOOTER_CLEARANCE,
} from "../components"

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
  const { t } = useTranslation("auth")
  const colors = useAuthColors()
  const surface = useAuthSurface()
  // 히스토리가 없을 때의 목적지는 `src/shared/navigation/routeGraph.ts` 가 정한다.
  const handleDefaultBack = useGoBack()

  const content = (
    <>
      <YStack flex={scrollable ? 1 : undefined}>
        {/* 질문 위계는 스텝 화면과 같은 스케일을 쓴다(24/700 → 15/weak).
            화면마다 제목 크기가 다르면 같은 흐름으로 안 읽힌다. */}
        <Text
          {...AUTH_TYPE.question}
          fontWeight="700"
          color={surface.textStrong}
          marginBottom={subtitle ? 8 : 0}
        >
          {title}
        </Text>
        {subtitle && (
          <Text {...AUTH_TYPE.subtitle} color={surface.textWeak}>
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
        {/* 비활성 CTA 는 브랜드색을 옅게 깔지 않는다 — 흐린 주황은 "곧 눌린다"처럼
            보여 계속 누르게 만든다. 아예 회색 면으로 빠진다. */}
        <YStack
          backgroundColor={
            !buttonDisabled && !buttonLoading ? surface.brand : surface.ctaOffBg
          }
          height={AUTH_LAYOUT.ctaHeight}
          borderRadius={AUTH_LAYOUT.radius.cta}
          alignItems="center"
          justifyContent="center"
        >
          <Text
            color={
              !buttonDisabled && !buttonLoading
                ? surface.onBrand
                : surface.ctaOffText
            }
            {...AUTH_TYPE.cta}
            fontWeight="600"
          >
            {buttonLabel}
          </Text>
        </YStack>
      </Pressable>
    </>
  )

  const footer = keyboardAvoiding ? (
    <AuthKeyboardFooter backgroundColor={surface.canvas}>
      {footerContent}
    </AuthKeyboardFooter>
  ) : (
    <YStack paddingBottom={insets.bottom + 24}>{footerContent}</YStack>
  )

  const scrollContent = keyboardAvoiding ? (
    <KeyboardAwareScrollView
      bounces={false}
      overScrollMode="never"
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
      bounces={false}
      overScrollMode="never"
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
      <YStack flex={1} backgroundColor={surface.canvas} paddingTop={insets.top}>
        {showHeader && (
          <YStack height={56} justifyContent="center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
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
