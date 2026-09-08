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
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ThemedView } from "@/components/themed-view"
import { V2DotLoader } from "@/src/design-system-v2"
import { SettingsFormActions } from "../components/SettingsFormActions"
import {
  FieldHelp,
  SettingsTextField,
} from "@/src/features/settings/components/SettingsTextField"
import { api } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"
import { useMyPageProfile } from "@/src/features/settings/hooks/useMyPageProfile"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { presentError, resolveError } from "@/src/lib/errorMessage"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import i18n from "@/src/i18n"

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,14}$/

/**
 * 필드 아래 빨간 줄에 붙일 문구.
 *
 * 예전에는 코드별 표를 여기서 한 벌 더 들고 있었고, 그 표의 `default` 가
 * `닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.` 였다. 서버가
 * `SIGNUP_ERROR_003`(닉네임 중복)을 줘도 그 문장이 이겼다 — 무엇을 고쳐야 하는지
 * 아는 쪽은 서버였는데 화면이 덮었다. 지금은 카탈로그가 답한다.
 *
 * `ONBOARDING_ERROR_002` 만 남긴다. 카탈로그 문구는 `목록에 있는 항목 중에서 골라
 * 주세요` 로 **고르는 화면**을 전제하는데, 여기는 자유 입력칸이라 맞지 않는다.
 */
function getNicknameFieldMessage(e: unknown): string {
  if (e instanceof ApiError && e.code === "ONBOARDING_ERROR_002") {
    return i18n.t("nickname.validation", { ns: "settings" })
  }
  return getErrorMessage(e)
}

export function NicknameEditScreen() {
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const s = useSurface()
  const { t } = useTranslation("settings")

  const [nickname, setNickname] = useState(profile?.nickName ?? "")
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const touchedRef = useRef(false)

  useEffect(() => {
    if (!touchedRef.current && profile?.nickName) {
      setNickname(profile.nickName)
    }
  }, [profile?.nickName])

  const hasText = nickname.length > 0
  const isFormatValid = NICKNAME_REGEX.test(nickname)
  const hasError = hasText && (!isFormatValid || !!serverError)
  const hasSuccess = hasText && isFormatValid && !serverError

  const validationMessage = hasText
    ? serverError
      ? serverError
      : isFormatValid
        ? t("nickname.available")
        : t("nickname.validation")
    : null

  const handleChangeText = (text: string) => {
    touchedRef.current = true
    setNickname(text)
    if (serverError) setServerError(null)
  }

  const handleClear = () => {
    touchedRef.current = true
    setNickname("")
    setServerError(null)
  }

  const handleSave = async () => {
    if (!profile || !isFormatValid || isLoading) return
    setIsLoading(true)
    try {
      await api.patch("/user/profile", {
        nickName: nickname,
        name: profile.name,
        gender: profile.gender ?? null,
      })
      await queryClient.invalidateQueries({ queryKey: ["myPageProfile"] })
      router.back()
    } catch (e) {
      // 해결이 버튼 하나로 끝나는 실패(로그인하러 가기·다시 시도)는 토스트로 보낸다.
      // 인라인 빨간 줄에는 버튼을 달 자리가 없어서, "다시 로그인해 주세요" 를 읽고도
      // 갈 곳이 없다. 닉네임 자체를 고쳐야 하는 실패만 입력칸 아래에 남긴다.
      if (resolveError(e).action) {
        presentError(e, {
          scope: "nickname-save",
          retry: () => void handleSave(),
        })
        return
      }
      setServerError(getNicknameFieldMessage(e))
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
        {/* 헤더: 뒤로가기만 */}
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
            {t("nickname.title")}
          </Text>
          <Text
            style={[styles.subtitle, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("nickname.subtitle")}
          </Text>

          <SettingsTextField
            label={t("nickname.field")}
            value={nickname}
            onChangeText={handleChangeText}
            placeholder={t("nickname.field")}
            maxLength={14}
            autoFocus
            editable={!isLoading}
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
            <FieldHelp
              text={validationMessage}
              tone={hasSuccess ? "valid" : "error"}
            />
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
