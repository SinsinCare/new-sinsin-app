import { StyleSheet, Text, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import i18n from "@/src/i18n"
import { useAuthSurface } from "@/src/features/auth/hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "@/src/features/auth/data/authSurface"
import { singleLineInputText } from "@/src/theme/surface"
import type { OnboardingValueOption } from "../types"

interface InputStepContentProps {
  fields: OnboardingValueOption[]
  values: Record<string, string>
  onChange: (key: string, text: string) => void
  onSubmit: () => void
}

function getNumericError(raw: string): string | null {
  if (!raw.trim()) return null
  const num = parseFloat(raw)
  if (isNaN(num)) {
    return i18n.t("validation.numberRequired", { ns: "auth" })
  }
  if (num <= 0) {
    return i18n.t("validation.positiveNumber", { ns: "auth" })
  }
  return null
}

/**
 * 숫자·텍스트를 받는 온보딩 질문. 가입 스텝 입력과 같은 규칙을 쓴다 —
 * 테두리 없이 면으로, 단위는 오른쪽에 회색으로, 오류는 아래 한 줄로.
 */
export function InputStepContent({
  fields,
  values,
  onChange,
  onSubmit,
}: InputStepContentProps) {
  const { t } = useTranslation("auth")
  const surface = useAuthSurface()

  return (
    <View style={styles.list}>
      {fields.map((field, index) => {
        const raw = values[field.key] ?? ""
        const numError = field.type === "number" ? getNumericError(raw) : null

        return (
          <View key={`${index}-${field.key}`} style={styles.group}>
            {field.label ? (
              <Text style={[styles.label, { color: surface.textWeak }]}>
                {field.label}
              </Text>
            ) : null}

            {/* 값이 찼다고 면을 브랜드로 물들이지 않는다 — 입력값은 선택이 아니다. */}
            <View style={[styles.field, { backgroundColor: surface.surface }]}>
              <TextInput
                style={[styles.input, { color: surface.textStrong }]}
                placeholder={t("onboarding.valuePlaceholder")}
                placeholderTextColor={surface.placeholder}
                selectionColor={surface.brand}
                keyboardType={field.type === "number" ? "numeric" : "default"}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                value={raw}
                onChangeText={(text) => onChange(field.key, text)}
              />
              {field.unit ? (
                <Text style={[styles.unit, { color: surface.textWeak }]}>
                  {field.unit}
                </Text>
              ) : null}
            </View>

            {numError ? (
              <Text style={[styles.error, { color: surface.brand }]}>
                {numError}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  group: { gap: 8 },
  label: {
    ...AUTH_TYPE.helper,
    fontWeight: "600",
  },
  field: {
    height: AUTH_LAYOUT.fieldHeight,
    borderRadius: AUTH_LAYOUT.radius.field,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    // 값(`AUTH_TYPE.field`)을 그대로 쓰면 lineHeight 가 딸려 와 iOS 가 글자를 세로 가운데가
    // 아니라 문단 기준으로 앉힌다 — 컨테이너는 height 56 + center 로 멀쩡한데 글자만
    // 아래로 내려앉아 상하 여백이 달라 보인다. 자세한 것은 `singleLineInputText` 머리말.
    ...singleLineInputText(AUTH_TYPE.field),
    fontWeight: "600",
    padding: 0,
  },
  unit: {
    ...AUTH_TYPE.field,
    fontWeight: "500",
  },
  error: AUTH_TYPE.helper,
})
