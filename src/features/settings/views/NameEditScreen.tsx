import { SettingsDetailHeader } from "../components/SettingsDetailHeader"
import { settingsDetailSpec } from "../components/settingsDetailSpec"
import React, { useEffect, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useQueryClient } from "@tanstack/react-query"
import { useAppRouter } from "@/src/shared/navigation"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { V2DotLoader } from "@/src/design-system-v2"
import { SettingsFormActions } from "../components/SettingsFormActions"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { presentError, resolveError } from "@/src/lib/errorMessage"
import { ApiError } from "@/src/services/core/apiError"
import { api } from "@/src/services/core/apiClient"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import i18n from "@/src/i18n"
import { FieldHelp, SettingsTextField } from "../components/SettingsTextField"
import { useMyPageProfile } from "../hooks/useMyPageProfile"

const NAME_MAX_LENGTH = 20

/**
 * 필드 아래 빨간 줄에 붙일 문구. `NicknameEditScreen` 과 같은 규칙이다 —
 * 코드별 표를 화면이 또 들고 있으면 그 표의 `default`(`이름을 저장하지 못했어요…`)가
 * 서버가 준 진짜 원인을 덮는다.
 *
 * `ONBOARDING_ERROR_002` 만 남긴다. 카탈로그 문구가 목록에서 고르는 화면을 전제해서
 * 자유 입력칸인 여기에는 맞지 않는다.
 */
function getNameFieldMessage(e: unknown): string {
  if (e instanceof ApiError && e.code === "ONBOARDING_ERROR_002") {
    return i18n.t("name.check", { ns: "settings" })
  }
  return getErrorMessage(e)
}

export function NameEditScreen() {
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const s = useSurface()
  const { t } = useTranslation("settings")

  const [name, setName] = useState(profile?.name ?? "")
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const touchedRef = useRef(false)

  useEffect(() => {
    if (!touchedRef.current && profile?.name) {
      setName(profile.name)
    }
  }, [profile?.name])

  const trimmedName = name.trim()
  const hasText = trimmedName.length > 0
  const isFormatValid = hasText && trimmedName.length <= NAME_MAX_LENGTH
  const hasError = name.length > 0 && (!isFormatValid || !!serverError)

  const validationMessage = serverError
    ? serverError
    : name.length > 0 && !hasText
      ? t("name.required")
      : trimmedName.length > NAME_MAX_LENGTH
        ? t("name.tooLong", { max: NAME_MAX_LENGTH })
        : null

  const handleChangeText = (text: string) => {
    touchedRef.current = true
    setName(text)
    if (serverError) setServerError(null)
  }

  const handleClear = () => {
    touchedRef.current = true
    setName("")
    setServerError(null)
  }

  const handleSave = async () => {
    if (!profile || !isFormatValid || isLoading) return
    setIsLoading(true)
    try {
      await api.patch("/user/profile", {
        nickName: profile.nickName,
        name: trimmedName,
        gender: profile.gender ?? null,
      })
      await queryClient.invalidateQueries({ queryKey: ["myPageProfile"] })
      router.back()
    } catch (e) {
      // 버튼 하나로 끝나는 실패는 토스트로 — 인라인 문구에는 버튼 자리가 없다.
      if (resolveError(e).action) {
        presentError(e, { scope: "name-save", retry: () => void handleSave() })
        return
      }
      setServerError(getNameFieldMessage(e))
    } finally {
      setIsLoading(false)
    }
  }

  /*
    **흰 페이지다.** 전에는 `appBg`(라이트 #eaeaec = 화면 바닥/우물)였는데, 그 값은
    `SettingsTextField` 의 입력 면과 **같은 토큰**이라 필드가 바닥에 녹아 사라졌다
    (라이트 ΔL* 7.25 → 0.00). 근거와 다른 선택지는 그 컴포넌트 머리말 §우물.
    `canvas` 는 다크에서 `appBgDark`(#1f1f21)와 같은 값이라 다크는 안 움직인다.
  */
  const pageBg = s.canvas

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <SettingsDetailHeader onBack={router.back} />

        <ScrollView
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[styles.title, { color: s.textStrong }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("name.title")}
          </Text>
          <Text
            style={[styles.subtitle, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("name.subtitle")}
          </Text>

          <SettingsTextField
            label={t("name.field")}
            value={name}
            onChangeText={handleChangeText}
            placeholder={t("name.field")}
            maxLength={NAME_MAX_LENGTH}
            autoFocus
            editable={!isLoading}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            hasError={hasError}
            // 저장 중에는 지우기 대신 진행 표시가 그 자리에 선다.
            onClear={isLoading ? undefined : handleClear}
            trailing={
              isLoading ? (
                <V2DotLoader size="s" color={s.textMuted} />
              ) : undefined
            }
          />

          {validationMessage && (
            <FieldHelp text={validationMessage} tone="error" />
          )}
        </ScrollView>

        <SettingsFormActions
          label={t("shared.save")}
          disabled={!profile || !isFormatValid || isLoading || !!serverError}
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
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: settingsDetailSpec.title,
  subtitle: settingsDetailSpec.description,
})
