import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { useTranslation } from "react-i18next"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import { LAYOUT, TYPE, type SurfacePalette } from "@/src/theme/surface"
import { REPORT_GAP } from "@/src/shared/components/ReportSection"
import { V2Skeleton, V2SkeletonGroup } from "@/src/design-system-v2"
import type { ResolvedError } from "@/src/lib/errorMessage"
type Surface = SurfacePalette & { isDark: boolean }
/* ─── 상태 화면 조각 ─────────────────────────────────────────── */

/** Same heading, action and nutrient-row geometry as the loaded report. */
export function LoadingSkeleton() {
  return (
    <V2SkeletonGroup style={styles.sections}>
      <View style={{ gap: 14, paddingTop: 8 }}>
        <V2Skeleton width={88} height={16} />
        <V2Skeleton width="86%" height={26} />
        <V2Skeleton width="100%" height={16} />
        <V2Skeleton width="74%" height={16} />
        <V2Skeleton width="100%" height={1} />
        <V2Skeleton width="100%" height={112} radius="2xl" />
      </View>
      <View style={{ gap: 18 }}>
        <V2Skeleton width={130} height={22} />
        {[0, 1, 2].map((index) => (
          <View key={index} style={{ gap: 10 }}>
            <V2Skeleton width={70} height={16} />
            <V2Skeleton width="52%" height={24} />
            <V2Skeleton width="92%" height={16} />
          </View>
        ))}
      </View>
    </V2SkeletonGroup>
  )
}

/**
 * 리포트를 못 받았을 때의 카드.
 *
 * 예전에는 원인과 무관하게 "인터넷 연결을 확인한 뒤 다시 불러와 주세요." 한 줄이었다.
 * 이 화면에서 실제로 자주 나는 실패는 연결이 아니라 **기록이 없는 기간**(404)과 점검
 * (5xx)이고, 404 는 몇 번을 다시 불러도 같은 답이 온다. `resolveError` 가 원인을 고르고,
 * `retryable` 이 false 면 다시 불러오기 버튼을 아예 그리지 않는다 — 눌러도 달라지지 않는
 * 버튼은 "해결할 수 있다" 는 거짓말이다.
 */
export function ErrorCard({
  resolved,
  onRetry,
  s,
}: {
  resolved: ResolvedError
  onRetry: () => void
  s: Surface
}) {
  const { t } = useTranslation("common")
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: s.card, borderColor: s.hairline },
      ]}
    >
      <Text
        style={[styles.errorTitle, { color: s.textStrong }]}
        lineBreakStrategyIOS="hangul-word"
        textBreakStrategy="balanced"
      >
        {resolved.title}
      </Text>
      {resolved.body ? (
        <Text
          style={[styles.errorBody, { color: s.textMuted }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {resolved.body}
        </Text>
      ) : null}
      {resolved.retryable ? (
        <SurfacePressable
          onPress={onRetry}
          baseColor={s.surfaceSunken}
          pressedColor={s.surfacePressed}
          style={styles.retryButton}
          accessibilityLabel={t("stats.retryAccessibility")}
        >
          <Text style={[styles.retryLabel, { color: s.textStrong }]}>
            {t("stats.redesign.reload")}
          </Text>
        </SurfacePressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  sections: { gap: REPORT_GAP.section, paddingTop: 4 },
  card: {
    borderRadius: LAYOUT.card.radius,
    padding: LAYOUT.card.padding,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorTitle: { ...TYPE.cardTitle, fontSize: 16, fontWeight: "700" },
  errorBody: { ...TYPE.caption },
  retryButton: {
    height: LAYOUT.control.height,
    borderRadius: LAYOUT.control.radius,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  retryLabel: { ...TYPE.caption, fontWeight: "700" },
})
