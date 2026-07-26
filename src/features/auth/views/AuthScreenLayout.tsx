import { useState, type ReactNode } from "react"
import {
  Keyboard,
  type LayoutChangeEvent,
  Platform,
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
import {
  getAuthKeyboardDismissMode,
  getAuthKeyboardScrollViewportInset,
  getAuthScrollableContentPresentation,
} from "../data/authPresentation"

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
  const { colors, mode } = useV2Theme()
  const [footerContentHeight, setFooterContentHeight] = useState(0)
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
              {
                color:
                  mode === "dark"
                    ? colors.label.normal
                    : colors.label.alternative,
              },
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

  const handleFooterContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height
    setFooterContentHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight,
    )
  }

  const footerClearance = Math.max(
    AUTH_KEYBOARD_FOOTER_CLEARANCE,
    footerContentHeight + spacing[24],
  )
  const scrollViewportInset = getAuthKeyboardScrollViewportInset(
    Platform.OS === "ios" ? "ios" : "android",
    footerClearance,
    AUTH_KEYBOARD_FOOTER_CLEARANCE,
  )
  const keyboardDismissMode = getAuthKeyboardDismissMode(
    Platform.OS === "ios" ? "ios" : "android",
  )

  const measuredFooterContent = (
    <View onLayout={handleFooterContentLayout}>{footerContent}</View>
  )

  const footer = keyboardAvoiding ? (
    <AuthKeyboardFooter backgroundColor={colors.background.default}>
      {measuredFooterContent}
    </AuthKeyboardFooter>
  ) : (
    <View style={{ paddingBottom: insets.bottom + spacing[24] }}>
      {measuredFooterContent}
    </View>
  )

  const scrollContent = keyboardAvoiding ? (
    <KeyboardAwareScrollView
      style={[
        styles.flex,
        scrollViewportInset > 0 && { marginBottom: scrollViewportInset },
      ]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: footerClearance },
      ]}
      bottomOffset={footerClearance}
      disableScrollOnKeyboardHide
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboardDismissMode}
    >
      {content}
    </KeyboardAwareScrollView>
  ) : (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboardDismissMode}
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

  const screen = (
    <V2Screen
      padded={false}
      edges={showHeader ? ["left", "right", "bottom"] : undefined}
    >
      {showHeader && <V2ScreenHeader onBack={onBack ?? handleDefaultBack} />}

      {body}
    </V2Screen>
  )

  if (scrollable) return screen

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {screen}
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentFlex: getAuthScrollableContentPresentation(),
  body: { flex: 1, paddingHorizontal: spacing[20] },
  bodyWithFooter: { justifyContent: "space-between" },
  scrollContent: { flexGrow: 1 },
  subtitle: { marginTop: spacing[8] },
})
