import { Pressable, StyleSheet, Text, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { AuthScreenLayout } from "./AuthScreenLayout"
import { CheckCircle } from "../components"
import { useTermsAgreement } from "../hooks"
import { useAuthSurface } from "../hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "../data/authSurface"

interface TermsAgreementScreenProps {
  mode?: "email" | "social"
  socialSignupToken?: string
}

/**
 * 약관 동의. 위계가 둘뿐이다 — "모두 동의합니다" 한 장(면 위)과 개별 항목(바닥 위 줄).
 *
 * 상태는 원형 체크 하나로만 말한다. 면·글자색까지 함께 바꾸면 같은 사실을
 * 세 번 그리는 셈이고, 전체동의 카드가 주황 면이 되는 순간 하단 CTA 와 싸운다.
 * 개별 항목의 들여쓰기는 카드 안 체크와 같은 세로선에 맞춘다.
 */
export function TermsAgreementScreen({
  mode = "email",
  socialSignupToken,
}: TermsAgreementScreenProps) {
  const { t } = useTranslation("auth")
  const {
    terms,
    agreed,
    allChecked,
    canSubmit,
    isSubmitting,
    toggleAll,
    toggleItem,
    handleBack,
    handleNext,
  } = useTermsAgreement({ mode, socialSignupToken })
  const surface = useAuthSurface()

  const openLegalDocument = (documentType: string) => {
    router.push({
      pathname: "/legal-document",
      params: { type: documentType },
    })
  }

  return (
    <AuthScreenLayout
      title={t("terms.title")}
      buttonLabel={t("common.next")}
      buttonDisabled={!canSubmit || isSubmitting}
      buttonLoading={isSubmitting}
      onSubmit={handleNext}
      onBack={handleBack}
      scrollable
    >
      <View style={styles.body}>
        <Pressable
          onPress={toggleAll}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allChecked }}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.allCard,
                {
                  backgroundColor: pressed
                    ? surface.surfacePressed
                    : surface.surface,
                },
              ]}
            >
              <CheckCircle checked={allChecked} size={24} />
              <Text
                style={[styles.allLabel, { color: surface.textStrong }]}
                lineBreakStrategyIOS="hangul-word"
              >
                {t("terms.agreeAll")}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.list}>
          {terms.map((term) => (
            <View key={term.id} style={styles.row}>
              <Pressable
                onPress={() => toggleItem(term.id)}
                style={styles.rowMain}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!agreed[term.id] }}
              >
                <CheckCircle checked={!!agreed[term.id]} size={24} />
                <Text
                  style={[styles.rowLabel, { color: surface.text }]}
                  numberOfLines={2}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {term.required ? t("terms.required") : t("terms.optional")}{" "}
                  {term.label}
                </Text>
              </Pressable>

              {term.documentType && (
                <Pressable
                  onPress={() =>
                    term.documentType && openLegalDocument(term.documentType)
                  }
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("terms.viewA11y", {
                    label: term.label,
                  })}
                >
                  <Text style={[styles.rowLink, { color: surface.textWeak }]}>
                    {t("terms.view")}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </View>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create({
  body: { marginTop: 36 },
  allCard: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    borderRadius: AUTH_LAYOUT.radius.field,
  },
  allLabel: {
    ...AUTH_TYPE.option,
    fontWeight: "700",
  },
  // 행의 좌우 패딩은 카드 패딩과 같다 — 체크 원과 "내용보기"가 카드의
  // 안쪽 선에 정확히 맞아야 목록이 카드에 매달려 보인다.
  list: { paddingTop: 8, paddingHorizontal: 18 },
  row: {
    // 고정 높이면 안 된다. 동의 항목 이름은 영어에서 두 줄이 되는데
    // ("Collection and use of personal information") 한 줄로 잘라 버리면
    // 사용자가 **무엇에 동의하는지 읽을 수 없다** — 동의 화면에서는 치명적이다.
    minHeight: 52,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    ...AUTH_TYPE.field,
    flexShrink: 1,
  },
  rowLink: {
    ...AUTH_TYPE.helper,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
})
