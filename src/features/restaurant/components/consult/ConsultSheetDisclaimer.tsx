/**
 * 의료 면책 + 참고 문헌 링크. **조건 없이 렌더한다.**
 *
 * ## 왜 이 파일이 따로 있나 — 이번 작업의 가장 구체적인 안전 회귀 지점이다
 *
 * `/consult` 는 같은 문구를 `isIdle`(= 메시지 0건 + 타이핑 아님) **참 가지 안에서만** 그린다
 * (`app/consult.tsx`). 그런데 이 시트는 홈탭의 추천 질문을 누르면 **처음부터 대화가 있는
 * 상태**로 열린다 — `isIdle` 이 한 번도 참이 되지 않는다. 같은 구조를 그대로 옮겼으면
 * 면책이 **단 한 번도 표시되지 않는 AI 답변 표면**이 하나 생겼을 것이다.
 *
 * 그래서 이 블록은 상태를 보지 않는다. 호스트에서도 삼항이나 `&&` 안에 넣지 않는다 —
 * `tests/restaurantConsultSheet.test.ts` 가 그 조건화를 소스에서 직접 막는다.
 * 조건을 붙이고 싶어지면 그건 상담 전체(의료기기 신고 대상 소프트웨어)의 결정이지
 * 이 시트의 결정이 아니다.
 */

import { Pressable, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { useV2Theme, V2Text, V2VStack } from "@/src/design-system-v2"
import { SHEET_GUTTER, spacing } from "@/src/design-system-v2/tokens"

export function ConsultSheetDisclaimer({
  onOpenReferences,
}: {
  onOpenReferences: () => void
}) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()

  return (
    <V2VStack align="center" gap={spacing[6]} style={styles.block}>
      {/*
        회색 위계만으로 말한다. 포인트 컬러·이모지를 얹으면 CTA 로 오독되고,
        면책이 광고처럼 읽히는 순간 아무도 안 읽는다(`app/consult.tsx` 의 같은 판단).
      */}
      <V2Text color={colors.label.alternative} style={styles.disclaimer}>
        {t("consult.disclaimer")}
      </V2Text>
      <Pressable
        onPress={onOpenReferences}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("consult.references")}
      >
        {({ pressed }) => (
          <V2Text
            color={colors.label.neutral}
            style={[styles.references, { opacity: pressed ? 0.5 : 1 }]}
          >
            {t("consult.references")}
          </V2Text>
        )}
      </Pressable>
    </V2VStack>
  )
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: SHEET_GUTTER, paddingTop: spacing[12] },
  // 11.5/17 은 토큰에 없다 — `/consult` 면책과 **같은 값**이라 두 화면의 면책이 같은 크기다.
  disclaimer: { fontSize: 11.5, lineHeight: 17, textAlign: "center" },
  references: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
})
