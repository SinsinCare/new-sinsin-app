import React from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useAppRouter } from "@/src/shared/navigation"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { V2DotLoader } from "@/src/design-system-v2"
import { BottomActionBar } from "@/src/shared/components/BottomActionBar"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { FieldHelp, SettingsTextField } from "../components/SettingsTextField"
import { usePhoneNumberEditor } from "../hooks/usePhoneNumberEditor"

export function PhoneNumberEditScreen() {
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const s = useSurface()
  const { t } = useTranslation("settings")
  const {
    profile,
    phoneNumber,
    phoneNumberError,
    canSave,
    isSaving,
    isDeleting,
    handlePhoneNumberChange,
    handleSave,
    handleDelete,
  } = usePhoneNumberEditor()

  /*
    **흰 페이지다.** 전에는 `appBg`(라이트 #eaeaec = 화면 바닥/우물)였는데, 그 값은
    `SettingsTextField` 의 입력 면과 **같은 토큰**이라 필드가 바닥에 녹아 사라졌다
    (라이트 ΔL* 7.25 → 0.00). 근거와 다른 선택지는 그 컴포넌트 머리말 §우물.
    `canvas` 는 다크에서 `appBgDark`(#1f1f21)와 같은 값이라 다크는 안 움직인다.
  */
  const pageBg = s.canvas
  const isBusy = isSaving || isDeleting

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("shared.back")}
            onPress={router.back}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={s.textStrong} />
          </Pressable>
        </View>

        <ScrollView
          bounces={false}
          overScrollMode="never"
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text
            style={[styles.title, { color: s.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("phone.title")}
          </Text>
          <Text
            style={[styles.subtitle, { color: s.textMuted }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("phone.subtitle")}
          </Text>

          {/*
            페이지가 흰 면이 되면서 `s.card`(흰색)로는 이 블록이 사라진다 —
            라이트 ΔL* 7.25 → 0.00. 옆의 입력칸과 **같은 우물**로 내린다: 둘 다
            "흰 페이지에 파인 상자" 라 같은 평면이 맞고, 면 값이 하나 줄어든다.
            다크는 #313135 → #3f3f45 로 한 단 올라가지만 바닥(#1f1f21)과는
            여전히 ΔL* 15.0 이라 더 또렷해진다.
          */}
          {profile?.hasPhoneNumber && (
            <View style={[styles.currentPhone, { backgroundColor: s.surface }]}>
              <Text
                style={[styles.currentPhoneLabel, { color: s.textMuted }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("phone.current")}
              </Text>
              <Text style={[styles.currentPhoneValue, { color: s.textStrong }]}>
                {profile.phoneNumberMasked || t("shared.registered")}
              </Text>
            </View>
          )}

          <SettingsTextField
            label={
              profile?.hasPhoneNumber ? t("phone.newField") : t("phone.field")
            }
            value={phoneNumber}
            onChangeText={handlePhoneNumberChange}
            placeholder="010-1234-5678"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            maxLength={13}
            hasError={!!phoneNumberError}
            editable={!isBusy}
            accessibilityLabel={t("phone.contactAccessibility")}
            accessibilityHint={t("phone.inputHint")}
          />
          {phoneNumberError && (
            <FieldHelp text={phoneNumberError} tone="error" />
          )}
          <FieldHelp text={t("phone.usageNote")} tone="muted" />

          {profile?.hasPhoneNumber && (
            // 삭제는 되돌릴 수 없어서 CTA 와 같은 무게로 세우지 않는다 — 글자만.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("phone.deleteAccessibility")}
              onPress={handleDelete}
              disabled={isBusy}
              hitSlop={8}
              style={({ pressed }) => [
                styles.deleteButton,
                (pressed || isBusy) && styles.deleteButtonDimmed,
              ]}
            >
              {isDeleting ? (
                <V2DotLoader size="s" color={s.danger} />
              ) : (
                <Text style={[styles.deleteLabel, { color: s.danger }]}>
                  {t("phone.deleteLabel")}
                </Text>
              )}
            </Pressable>
          )}
        </ScrollView>

        <BottomActionBar
          label={
            profile?.hasPhoneNumber ? t("shared.change") : t("shared.save")
          }
          disabled={!canSave}
          onPress={handleSave}
        />
      </KeyboardAvoidingView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: LAYOUT.screenX,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.48,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    marginBottom: 28,
  },
  currentPhone: {
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 20,
    borderRadius: LAYOUT.card.radius,
  },
  currentPhoneLabel: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.26,
    fontWeight: "600",
  },
  currentPhoneValue: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.32,
    fontWeight: "700",
  },
  deleteButton: {
    marginTop: 28,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDimmed: {
    opacity: 0.6,
  },
  deleteLabel: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "600",
  },
})
