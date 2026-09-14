import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { V2BottomSheet, V2Button, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import {
  FORM,
  PAGE_X,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"

interface ContentResponsibilityCheckProps {
  visible: boolean
  onClose: () => void
  /** "확인했어요" — 동의를 세우고 등록으로 이어진다. */
  onConfirm: () => void
}

/**
 * 글 작성의 책임 확인 — **등록을 누를 때 한 번 뜨는 시트**(2026-09-12).
 *
 * 예전엔 편집기 안에 회색 체크박스 상자로 앉아 있었다. 글을 쓰기 전에 읽으라는 뜻이었지만
 * 실제로는 제목 위의 가장 큰 덩어리가 되어 종이를 폼으로 만들었고, 등록 버튼을 회색으로
 * 잠그는 이유를 사람이 화면에서 찾아야 했다. 조사한 커뮤니티 앱(당근·Reddit)은 규칙을
 * **등록 시점**에 한 줄로 보여 준다. 여기서는 등록 탭 → 이 시트 → "확인했어요" 가 곧 동의다
 * (사용자가 직접 누른 버튼이므로 예전 체크박스와 같은 무게다). 한 번 확인하면 그 글이
 * 올라갈 때까지 다시 묻지 않는다.
 */
export function ContentResponsibilityCheck({
  visible,
  onClose,
  onConfirm,
}: ContentResponsibilityCheckProps) {
  const { t } = useTranslation("recipe")
  const s = useSurface()

  return (
    <V2BottomSheet
      surface="community_post_consent"
      visible={visible}
      onClose={onClose}
      title={t("freePost.consentTitle")}
      footer={
        <View style={styles.footer}>
          <V2Button fullWidth size="xl" onPress={onConfirm}>
            {t("freePost.consentConfirm")}
          </V2Button>
        </View>
      }
    >
      <View style={styles.body}>
        <V2Text
          style={FORM.body}
          color={s.text}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("responsibility")}
        </V2Text>
        <V2Text style={FORM.hint} color={s.textMuted}>
          {t("freePost.consentHint")}
        </V2Text>
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: PAGE_X, paddingTop: S[2], gap: S[3] },
  footer: { paddingHorizontal: PAGE_X, paddingTop: S[3] },
})
