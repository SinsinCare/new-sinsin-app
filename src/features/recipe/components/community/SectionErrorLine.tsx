/**
 * **피드 안 섹션의 오류 한 줄** — `지금 이야기 중`(D23) · `비슷한 단계의 이웃`(D24).
 * 스펙: `docs/design/community-redesign/01-DECISIONS.md` D23 "시안에 없어서 채우는 상태들",
 * 선례: `src/features/recipe/components/StoryRail.tsx`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 왜 `V2ErrorState` 가 아닌가
 *
 * D23 이 못박은 형태는 **한 줄 + 재시도**다. `V2ErrorState` 는 40 아이콘 + 20 Bold 제목 +
 * 버튼을 `padding 24` 안에 세로 중앙으로 쌓는 **전면 오류 판**이라, 피드 한가운데 끼면
 * 실패한 섹션이 화면의 주인공이 된다. `StoryRail` 이 같은 판단을 이미 했다("레일은 화면의
 * 주인공이 아니므로 오류는 한 줄로 접고 재시도만 남긴다").
 *
 * ■ **이 줄은 `error_state_viewed` 를 내지 않는다** — 알고 하는 일이다
 *
 * D15 는 손으로 만든 상태의 함정을 경고한다: 화면은 멀쩡한데 계측이 아무것도 안 나간다.
 * 그래서 처음엔 여기서 같은 이벤트를 쐈는데, 저장소에는 그보다 오래된 규칙이 있다 —
 * **"통로는 하나다"**(`tests/analyticsCrossCutting.test.ts`): `error_state_viewed` 의
 * 유일한 발화 지점은 `V2ErrorState.tsx` 다. 두 번째 통로를 열면 같은 퍼널이 두 곳에서
 * 서로 다른 프로퍼티로 세어질 수 있고, 그 테스트는 그것을 막으려고 있다.
 *
 * 두 규칙이 부딪치는 이유는 하나다: **`V2ErrorState` 에 한 줄짜리 판이 없다.**
 * 형태(D23: 한 줄)와 계측(D15: 세어져야 함)을 동시에 만족시키려면 DS 가 인라인 톤을
 * 열거나, 단일 통로 규칙이 두 번째 소유자를 받아야 한다. 둘 다 이 작업의 범위 밖이다.
 * → **남은 사실**: 이 자리의 오류는 세어지지 않는다. 대기(`wait_perceived`)는 세어진다 —
 * 두 섹션이 `useLoadingVisible(..., { surface })` 로 스켈레톤 가시성을 받기 때문이다.
 *
 * ■ 재시도는 **다시 해서 될 때만** 그린다
 *
 * `resolveError()` 가 이미 판정해 둔 `retryable` 을 그대로 쓴다(여기서 분류를 다시 짓지
 * 않는다). 눌러도 안 되는 버튼은 사용자가 자기 잘못을 찾게 만든다.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { V2Button } from "@/src/design-system-v2/components/V2Button"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import type { ResolvedError } from "@/src/lib/errorMessage"

import { COMMUNITY_GUTTER } from "./communityLayout"

/**
 * 오류 한 줄이 실제로 읽는 두 필드. `ResolvedError` 에서 `Pick` 으로 판다 —
 * 이름이 바뀌면 여기가 같이 깨지고, 부르는 쪽은 `resolveError(error)` 결과를 그대로 넘긴다.
 */
export type SectionFailure = Pick<ResolvedError, "title" | "retryable">

export type SectionErrorLineProps = {
  /** `resolveError(error)` 의 결과. */
  failure: SectionFailure
  /** `failure.retryable` 이 참일 때만 실제로 눌릴 수 있다. */
  onRetry: () => void
  style?: StyleProp<ViewStyle>
}

export function SectionErrorLine({
  failure,
  onRetry,
  style,
}: SectionErrorLineProps) {
  const { colors } = useV2Theme()
  // 일반 동사(`다시 해 보기`)는 `common` 에 산다 — `fallbackNS` 를 안 켰다.
  const { t } = useTranslation("common")
  const retryable = failure.retryable

  return (
    <View style={[styles.row, style]}>
      <V2Text
        token="subtext.medium"
        color={colors.label.neutral}
        numberOfLines={2}
        style={styles.text}
      >
        {failure.title}
      </V2Text>

      {retryable ? (
        <V2Button color="neutral" variant="weak" size="s" onPress={onRetry}>
          {t("action.retry")}
        </V2Button>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    // 섹션의 다른 행들과 같은 시작선 하나(§5.1). 리터럴 20 을 쓰지 않는 이유는
    // `communityLayout.ts` 머리말 — 시작선이 하나여야 한다는 것이 그 상수의 존재 이유다.
    paddingHorizontal: COMMUNITY_GUTTER,
    paddingVertical: spacing[12],
  },
  /** 문구가 먼저 자리를 잡고 재시도 버튼은 자기 폭만 갖는다. */
  text: { flex: 1 },
})
