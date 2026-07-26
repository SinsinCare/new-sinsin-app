import type { ReactNode } from "react"
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import {
  AuthKeyboardFooter,
  AUTH_KEYBOARD_FOOTER_CLEARANCE,
} from "../components"
import {
  V2Button,
  V2Screen,
  V2ScreenHeader,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

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
  const { colors } = useV2Theme()
  const handleDefaultBack = () => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/(auth)/login")
  }

  const content = (
    <View style={scrollable ? styles.contentFlex : undefined}>
      <View>
        <Text style={[typography.title.medium, { color: colors.label.strong }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              typography.subtext.large,
              styles.subtitle,
              { color: colors.label.alternative },
            ]}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </View>
  )

  const footerContent = (
    <>
      {buttonAccessory}
      <V2Button
        size="xl"
        color="brand"
        fullWidth
        disabled={buttonDisabled}
        loading={buttonLoading}
        onPress={() => {
          Keyboard.dismiss()
          onSubmit()
        }}
      >
        {buttonLabel}
      </V2Button>
    </>
  )

  // The footer stays owned by AuthKeyboardFooter. The scrollable content needs
  // enough trailing room to be brought above that fixed footer at larger text
  // sizes, including the optional secondary action below the fields.
  const scrollBottomClearance =
    AUTH_KEYBOARD_FOOTER_CLEARANCE +
    (buttonAccessory == null
      ? spacing[24]
      : spacing[24] + spacing[32] + spacing[16])

  const footer = keyboardAvoiding ? (
    <AuthKeyboardFooter backgroundColor={colors.background.default}>
      {footerContent}
    </AuthKeyboardFooter>
  ) : (
    <View style={{ paddingBottom: insets.bottom + spacing[24] }}>
      {footerContent}
    </View>
  )

  const scrollContent = keyboardAvoiding ? (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollBottomClearance },
      ]}
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
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollBottomClearance },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {content}
    </ScrollView>
  )

  const body = scrollable ? (
    <View style={styles.body}>
      {scrollContent}
      {footer}
    </View>
  ) : (
    <View style={[styles.body, styles.bodyWithFooter]}>
      {content}
      {footer}
    </View>
  )

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <V2Screen
        padded={false}
        edges={showHeader ? ["left", "right", "bottom"] : undefined}
      >
        {showHeader && <V2ScreenHeader onBack={onBack ?? handleDefaultBack} />}

        {body}
      </V2Screen>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentFlex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing[20] },
  bodyWithFooter: { justifyContent: "space-between" },
  scrollContent: { flexGrow: 1 },
  subtitle: { marginTop: spacing[8] },
})
