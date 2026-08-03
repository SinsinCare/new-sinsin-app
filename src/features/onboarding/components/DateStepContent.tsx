import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import Ionicons from "@expo/vector-icons/Ionicons"

import { DatePickerModal } from "@/src/features/settings/components/DatePickerModal"
import { useAuthSurface } from "@/src/features/auth/hooks/useAuthSurface"
import { AUTH_LAYOUT, AUTH_TYPE } from "@/src/features/auth/data/authSurface"
import { hapticSelection } from "@/src/lib/haptics"
import {
  formatDiagnosisDate,
  parseDiagnosisDate,
  toDiagnosisDateIso,
} from "@/src/shared/utils/diagnosisDate"
import type { OnboardingValueOption } from "../types"

interface DateStepContentProps {
  field: OnboardingValueOption
  /** `YYYY-MM-01`. 아직 고르지 않았으면 빈 문자열. */
  value: string
  onChange: (key: string, value: string) => void
}

/**
 * 연·월만 고르는 온보딩 질문. **선택 입력이다** — 기억나지 않는 사람을 여기서 막지
 * 않는다(CTA 는 비어 있어도 열려 있다). 정확히 아는 사람의 답만 날짜 컬럼에 남고,
 * 나머지는 앞 단계에서 고른 대략 시기가 그대로 쓰인다.
 */
export function DateStepContent({
  field,
  value,
  onChange,
}: DateStepContentProps) {
  const { t, i18n } = useTranslation("auth")
  const surface = useAuthSurface()
  const [pickerVisible, setPickerVisible] = useState(false)

  const selected = parseDiagnosisDate(value)
  const label = formatDiagnosisDate(
    value,
    i18n.resolvedLanguage ?? i18n.language,
  )

  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? t("onboarding.datePlaceholder")}
        onPress={() => {
          hapticSelection()
          setPickerVisible(true)
        }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: pressed ? surface.surfacePressed : surface.surface,
          },
        ]}
      >
        <Text
          style={[
            styles.value,
            { color: label ? surface.textStrong : surface.placeholder },
          ]}
        >
          {label ?? t("onboarding.datePlaceholder")}
        </Text>
        <Ionicons name="chevron-down" size={18} color={surface.textWeak} />
      </Pressable>

      {label ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(field.key, "")}
          hitSlop={8}
          style={styles.clear}
        >
          <Text style={[styles.clearText, { color: surface.textWeak }]}>
            {t("onboarding.dateClear")}
          </Text>
        </Pressable>
      ) : null}

      <DatePickerModal
        visible={pickerVisible}
        selected={selected}
        onClose={() => setPickerVisible(false)}
        onSelect={(year, month) => {
          onChange(field.key, toDiagnosisDateIso({ year, month }))
          setPickerVisible(false)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  field: {
    height: AUTH_LAYOUT.fieldHeight,
    borderRadius: AUTH_LAYOUT.radius.field,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  value: {
    ...AUTH_TYPE.field,
    fontWeight: "600",
  },
  // 지우기는 **필드 오른쪽 끝**에 건다. 왼쪽에 두면 질문·라벨과 같은 시작선에 서서
  // 새로운 문단처럼 읽히는데, 실제로는 바로 위 값에 딸린 부속 동작이다.
  // 오른쪽 끝은 값을 여는 chevron 과 같은 x 라 "이 필드를 만지는 자리" 로 묶인다.
  clear: { alignSelf: "flex-end" },
  clearText: {
    ...AUTH_TYPE.helper,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
})
