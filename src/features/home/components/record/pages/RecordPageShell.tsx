import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { useEffect, useState, type ReactNode } from "react"
import {
  Pressable,
  StyleSheet,
  View,
  Keyboard,
  StatusBar,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import {
  KeyboardAwareScrollView,
  KeyboardController,
  useKeyboardState,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSuppressGlobalKeyboardToolbar } from "@/src/stores/keyboardToolbarStore"
import { RECORD_SPRING, RECORD_TIMING } from "./recordMotion"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import { useIsFocused } from "@react-navigation/native"

import { Text } from "@/src/shared/components/AppText"
import { V2DotLoader, V2ScreenHeader } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"

import {
  CTA,
  FOOTER_FADE,
  FORM,
  MIN,
  PAGE_X,
  S,
  TITLE_BLOCK,
} from "./recordPageSpec"

/** Shared header, scroll body and anchored save action for all six health record pages. */
export function RecordPageShell({
  title,
  onBack,
  onInfo,
  children,
  ctaLabel,
  ctaDisabled,
  ctaLoading,
  onCtaPress,
  footerAccessory,
  ctaSuccess = false,
  keyboardEnabled = true,
  subtitle,
  navigationTitle,
  intro,
  contentStyle,
}: {
  /** Large page title; the navigation bar retains the selected date. */
  title: string
  onBack: () => void
  /** Optional information action in the navigation bar. */
  onInfo?: () => void
  children: ReactNode
  ctaLabel: string
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onCtaPress: () => void
  /** CTA 왼쪽에 서는 것(키보드 내리기 등). */
  footerAccessory?: ReactNode
  ctaSuccess?: boolean
  keyboardEnabled?: boolean
  intro?: string
  subtitle?: string
  /** Flow title is leading-aligned; subtitle is reserved for the selected date. */
  navigationTitle?: string
  contentStyle?: StyleProp<ViewStyle>
}) {
  const s = useSurface()
  const isFocused = useIsFocused()
  useEffect(() => {
    if (!isFocused) return
    // UIKit may reset the bar when presenting/dismissing a keyboard window.
    const applyBarStyle = () =>
      StatusBar.setBarStyle(s.isDark ? "light-content" : "dark-content")
    applyBarStyle()
    const shown = Keyboard.addListener("keyboardDidShow", applyBarStyle)
    const hidden = Keyboard.addListener("keyboardDidHide", applyBarStyle)
    return () => {
      shown.remove()
      hidden.remove()
    }
  }, [isFocused, s.isDark])
  // This shell supplies its own keyboard dismiss button beside Save.
  useSuppressGlobalKeyboardToolbar()
  const insets = useSafeAreaInsets()
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const { t } = useTranslation("common")

  const keyboardVisible =
    useKeyboardState((state) => state.isVisible) && keyboardEnabled
  const keyboard = useReanimatedKeyboardAnimation()
  const dockStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: keyboardEnabled
          ? keyboard.height.value + insets.bottom * keyboard.progress.value
          : 0,
      },
    ],
  }))
  const press = useSharedValue(1)
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }))
  const blocked = ctaDisabled === true || ctaLoading === true
  const [footerHeight, setFooterHeight] = useState(
    CTA.height + CTA.bottomInset + insets.bottom + S[2],
  )
  const fadeTransparent = s.isDark ? "rgba(31,31,33,0)" : "rgba(255,255,255,0)"

  return (
    <View style={[styles.root, { backgroundColor: s.canvas }]}>
      {isFocused ? (
        <StatusBar barStyle={s.isDark ? "light-content" : "dark-content"} />
      ) : null}
      <V2ScreenHeader
        title={navigationTitle ?? subtitle ?? t("home.recordPage.healthHeader")}
        titleAlign={navigationTitle ? "leading" : "center"}
        separator
        onBack={onBack}
        safeAreaTop
        right={
          onInfo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.recordPage.infoAccessibility", {
                title,
              })}
              onPress={onInfo}
              style={styles.info}
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={s.text}
              />
            </Pressable>
          ) : undefined
        }
      />

      <KeyboardAwareScrollView
        key={`record-type-${fontScale}`}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: footerHeight + FOOTER_FADE },
          contentStyle,
        ]}
        enabled={keyboardEnabled}
        // Keep the unit and two reserved hint lines above the keyboard dock.
        bottomOffset={
          footerHeight +
          (FORM.body.lineHeight + FORM.hint.lineHeight * 2) * fontScale +
          S[6]
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: s.textStrong }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        </View>

        <View style={styles.introBlock}>
          {intro ? (
            <Text style={[styles.intro, { color: s.text }]}>{intro}</Text>
          ) : null}
        </View>
        <View style={styles.body}>{children}</View>
      </KeyboardAwareScrollView>

      <Animated.View
        style={[styles.footerDock, dockStyle]}
        onLayout={(event) =>
          setFooterHeight(Math.ceil(event.nativeEvent.layout.height))
        }
      >
        <LinearGradient
          pointerEvents="none"
          colors={[fadeTransparent, s.canvas]}
          style={[styles.fade, keyboardVisible && { opacity: 0 }]}
        />
        <View
          style={[
            styles.footer,
            {
              backgroundColor: s.canvas,
              paddingBottom: insets.bottom + CTA.bottomInset,
            },
          ]}
        >
          {keyboardVisible ? (
            <Pressable
              onPress={() => void KeyboardController.dismiss()}
              accessibilityRole="button"
              accessibilityLabel={t("home.recordPage.dismissKeyboard")}
              style={[
                styles.keyboardButton,
                { backgroundColor: s.surfaceSunken },
              ]}
            >
              <Ionicons name="chevron-down" size={22} color={s.text} />
            </Pressable>
          ) : (
            footerAccessory
          )}
          <Pressable
            style={styles.ctaWrap}
            accessibilityRole="button"
            accessibilityLabel={
              ctaLoading
                ? t("home.recordPage.saving")
                : ctaSuccess
                  ? t("home.recordPage.saved")
                  : ctaLabel
            }
            accessibilityState={{ disabled: blocked, busy: ctaLoading }}
            onPress={onCtaPress}
            disabled={blocked}
            onPressIn={() => {
              press.value = withTiming(0.98, { ...RECORD_TIMING, duration: 90 })
            }}
            onPressOut={() => {
              press.value = withSpring(1, RECORD_SPRING)
            }}
          >
            <Animated.View
              style={[
                styles.cta,
                {
                  backgroundColor:
                    ctaDisabled && !ctaLoading && !ctaSuccess
                      ? s.surfaceSunken
                      : s.brand,
                },
                pressStyle,
              ]}
            >
              {ctaLoading ? (
                <V2DotLoader size="s" color={s.onBrand} />
              ) : ctaSuccess ? (
                <Ionicons name="checkmark" size={20} color={s.onBrand} />
              ) : null}
              <Text
                maxFontSizeMultiplier={FONT_SCALE.control}
                style={[
                  styles.ctaLabel,
                  {
                    color:
                      ctaDisabled && !ctaLoading && !ctaSuccess
                        ? s.textMuted
                        : s.onBrand,
                  },
                ]}
              >
                {ctaLoading
                  ? t("home.recordPage.saving")
                  : ctaSuccess
                    ? t("home.recordPage.saved")
                    : ctaLabel}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  body: { flexGrow: 1 },
  introBlock: {
    paddingHorizontal: PAGE_X,
    marginBottom: FORM.sectionGap,
    gap: S[3],
  },
  intro: FORM.body,
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: PAGE_X,
    marginTop: TITLE_BLOCK.marginTop,
    marginBottom: TITLE_BLOCK.marginBottom,
  },
  title: {
    fontSize: TITLE_BLOCK.fontSize,
    lineHeight: TITLE_BLOCK.lineHeight,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  info: {
    width: MIN.TOUCH,
    height: MIN.TOUCH,
    alignItems: "center",
    justifyContent: "center",
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -FOOTER_FADE,
    height: FOOTER_FADE,
  },
  footerDock: { position: "absolute", left: 0, right: 0, bottom: 0 },
  keyboardButton: {
    width: MIN.TOUCH,
    height: CTA.height,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: CTA.radius,
  },
  footer: {
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: PAGE_X,
  },
  ctaWrap: { flex: 1 },
  cta: {
    minHeight: CTA.height,
    paddingVertical: S[3],
    paddingHorizontal: S[4],
    borderRadius: CTA.radius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaLabel: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
})
