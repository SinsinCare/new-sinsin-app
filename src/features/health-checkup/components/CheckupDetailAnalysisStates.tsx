/**
 * 분석 중 / 실패 / 선택 없음 — 검진 상세와 월별 캘린더가 같은 모양으로 쓴다.
 *
 * 스켈레톤이 실제 화면과 같은 자리·같은 크기를 잡는 게 중요하다. 분석은 LLM 호출이 붙어 있어
 * 수 초가 걸리는데, 그 사이에 도넛이 도는 화면을 보여 주면 무엇이 올지 알 수 없다. 요약 타일
 * 3칸 → 요약 문단 → 카드 목록 순서를 그대로 흉내내면 결과가 도착할 때 자리가 움직이지 않는다.
 *
 * "분석 중" 문구를 스켈레톤 위에 같이 두는 이유: 여기서의 대기는 네트워크 지연이 아니라
 * **서버가 실제로 일을 하고 있는 시간**이라 사용자에게 이유를 말해 줘야 한다.
 */

import { StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"

import { resolveError } from "@/src/lib/errorMessage"

import {
  GUTTER,
  V2EmptyState,
  V2ErrorState,
  V2Skeleton,
  V2SkeletonGroup,
  V2SkeletonText,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

export function CheckupDetailAnalyzingState() {
  const { t } = useTranslation("health")
  const { colors } = useV2Theme()
  const analyzing = t("checkup.detail.analyzing")

  return (
    <V2SkeletonGroup label={analyzing} style={styles.root}>
      <Text
        style={[typography.label.small, { color: colors.label.alternative }]}
      >
        {analyzing}
      </Text>

      {/* 요약 타일 3칸 */}
      <View style={styles.tiles}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.tile}>
            <V2Skeleton height={84} radius="lg" />
          </View>
        ))}
      </View>

      {/* AI 요약 면 */}
      <View style={[styles.prose, { backgroundColor: colors.fill.background }]}>
        <V2SkeletonText lines={2} lineHeight={18} />
      </View>

      {/* 지표 카드 목록 */}
      <View style={styles.cards}>
        {[0, 1, 2, 3].map((index) => (
          <V2Skeleton key={index} height={66} radius="lg" />
        ))}
      </View>
    </V2SkeletonGroup>
  )
}

/**
 * 분석이 실패했을 때.
 *
 * `분석에 실패했어요` 한 줄만 그리던 자리다. 그 문장은 무엇이 막혔는지도, 다음에
 * 뭘 하면 되는지도 말하지 않는다 — 실제로 여기서 오는 실패는 회차가 사라졌거나
 * (`HC_ERROR_004`) 결과지를 읽지 못한 것(`HC_ERROR_007`)이고 둘의 해결이 다르다.
 *
 * 재시도 버튼은 **재시도로 답이 달라질 때만** 그린다. 없는 회차를 다시 부르는 버튼은
 * 누를수록 같은 화면만 돌아온다.
 */
export function CheckupDetailErrorState({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  const { t: tCommon } = useTranslation("common")
  const resolved = resolveError(error)

  if (!resolved.retryable) {
    return (
      <V2ErrorState
        title={resolved.title}
        description={resolved.body}
        style={styles.state}
      />
    )
  }

  return (
    <V2ErrorState
      title={resolved.title}
      description={resolved.body}
      onRetry={onRetry}
      retryLabel={tCommon("action.retry")}
      style={styles.state}
    />
  )
}

/**
 * 분석할 회차가 하나도 없을 때. 오류가 아니라 **정상 상태**라 `V2ErrorState` 를 쓰지 않는다 —
 * 붉은 경고로 "아직 불러온 검진이 없다" 를 알리면 기능이 고장 난 것처럼 읽힌다.
 */
export function CheckupDetailNoSelectionState() {
  const { t } = useTranslation("health")

  return (
    <V2EmptyState
      icon="file"
      title={t("checkup.list.emptyTitle")}
      description={t("checkup.list.emptyBody")}
      style={styles.state}
    />
  )
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: GUTTER,
    paddingTop: spacing[20],
    gap: spacing[16],
  },
  tiles: { flexDirection: "row", gap: spacing[10] },
  tile: { flex: 1 },
  prose: { padding: spacing[16], borderRadius: radius.lg },
  cards: { gap: spacing[12], marginTop: spacing[8] },
  state: { paddingTop: spacing[32] },
})
