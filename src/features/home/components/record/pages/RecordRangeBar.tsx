import { StyleSheet, View } from "react-native"
import { V2Badge, V2Text } from "@/src/design-system-v2"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { useSurface } from "@/src/hooks/useSurface"
import { FORM, S } from "./recordPageSpec"
import { rangePosition, type RangeSpec, type RangeStatus } from "./recordRanges"

/**
 * 기록 페이지의 **입력 중 판정** 표시 — 상태 한 줄(`RecordStatusLine`)과 구간 바
 * (`RecordRangeBar`). 피드백 F3(2026-09-11): "치는 동안 정상인지, 어느 단계인지 보이게".
 *
 * ■ 색 예산
 *
 * 면은 전부 중성 회색이다. 목표 띠만 한 단 진한 회색(`s.border`)이고 낮음·주의·높음 구간은
 * 트랙과 같은 색 — 구간마다 색을 칠하면 화면이 경고로 얼룩진다(`theme/surface.ts` 의
 * `caution` 머리말: 상태색은 **도트·텍스트에만**). 상태색이 닿는 곳은 둘뿐이다 —
 * 마커 점과 배지 글자. 배지는 `V2Badge weak` 그대로라 이 파일이 새 틴트를 만들지 않는다.
 *
 * 브랜드 주황은 쓰지 않는다. CTA 가 주황인데 마커까지 주황이면 "눌러야 하는 것"과
 * "지금 값"이 같은 색이 된다.
 *
 * ■ 판정이 없을 때
 *
 * `status === null`(빈 입력·무효 입력)이면 배지도 마커도 없다. 바는 그대로 남아 목표 띠와
 * 양 끝 눈금만 보여준다 — 다음에 칠 값이 어디 놓일지 미리 보는 자리다. 판정 줄은 지난번
 * 기록만 남기고, 그것도 없으면 높이만 지킨다(입력 중 아래 폼이 뛰지 않게).
 */

/**
 * 색은 **주의가 필요한 상태에만** 쓴다(제품 결정 2026-09-11). 정상은 그레이스케일 — 화면에 색이
 * 하나 있으면 그것이 곧 "여기를 보라" 는 신호가 되고, 정상까지 초록으로 칠하면 그 신호가 죽는다.
 */
type Tone = "neutral" | "yellow" | "red"

/**
 * 낮음이 얼마나 위험한가는 지표마다 다르다 — 혈당 70 미만은 저혈당(빨강), 혈압 90 미만은
 * 주의(노랑). 그래서 페이지가 `lowIsDanger` 로 말한다.
 */
export function toneOf(status: RangeStatus, lowIsDanger: boolean): Tone {
  switch (status) {
    case "normal":
      return "neutral"
    case "elevated":
      return "yellow"
    case "high":
      return "red"
    case "low":
      return lowIsDanger ? "red" : "yellow"
  }
}

function useToneColor(): (tone: Tone) => string {
  const { colors } = useV2Theme()
  return (tone) => {
    switch (tone) {
      case "neutral":
        return colors.label.neutral
      case "yellow":
        // `V2Badge yellow/weak` 의 글자색과 같다 — 노란 점은 흰 면 위에서 안 보인다.
        return colors.accentForeground.orange
      case "red":
        return colors.status.negative
    }
  }
}

/** 배지 + 목표 문구 + (있으면) 지난번 기록. 한 줄에 다 놓는다. */
export function RecordStatusLine({
  status,
  statusLabel,
  targetLabel,
  previousLabel,
  lowIsDanger,
}: {
  status: RangeStatus | null
  /** 배지 글자("정상" 등). `status` 가 없으면 무시. */
  statusLabel: string
  /** "목표 90–180". `status` 가 없으면 무시. */
  targetLabel: string
  /** "지난번 121/80". 없으면 오른쪽이 빈다. */
  previousLabel: string | null
  lowIsDanger: boolean
}) {
  const s = useSurface()
  return (
    <View style={styles.statusLine} accessibilityLiveRegion="polite">
      {status !== null && (
        <View style={styles.statusLeft}>
          <V2Badge size="s" variant="weak" color={toneOf(status, lowIsDanger)}>
            {statusLabel}
          </V2Badge>
          <V2Text style={styles.target} color={s.text} numberOfLines={1}>
            {targetLabel}
          </V2Text>
        </View>
      )}
      {previousLabel !== null && (
        <V2Text
          style={[styles.previous, status === null && styles.previousAlone]}
          color={s.textMuted}
          numberOfLines={1}
        >
          {previousLabel}
        </V2Text>
      )}
    </View>
  )
}

/** 구간 바. 왼쪽 눈금 = 낮음 경계, 가운데 = 목표 띠, 오른쪽 눈금 = 바의 끝. */
export function RecordRangeBar({
  range,
  value,
  status,
  lowIsDanger,
  targetLabel,
  caption,
}: {
  range: RangeSpec
  /** 유효한 값일 때만. `null` 이면 마커를 그리지 않는다. */
  value: number | null
  status: RangeStatus | null
  lowIsDanger: boolean
  /** 바 아래 가운데 라벨("목표 90–180"). */
  targetLabel: string
  /** 바 왼쪽의 짧은 이름("최고"). 혈압처럼 바가 둘일 때만. */
  caption?: string
}) {
  const s = useSurface()
  const toneColor = useToneColor()
  const span = range.max - range.min
  const pct = (n: number) => `${(100 * (n - range.min)) / span}%` as const
  const showMarker = value !== null && status !== null
  return (
    <View style={styles.bar}>
      {caption !== undefined && (
        <V2Text style={styles.caption} color={s.text}>
          {caption}
        </V2Text>
      )}
      <View style={styles.barBody}>
        <View style={styles.trackRow}>
          <View style={[styles.track, { backgroundColor: s.surfaceSunken }]}>
            <View
              style={[
                styles.zone,
                {
                  backgroundColor: s.border,
                  left: pct(range.targetLow),
                  width: `${(100 * (range.targetHigh - range.targetLow)) / span}%`,
                },
              ]}
            />
          </View>
          {showMarker && (
            <View
              style={[
                styles.markerSlot,
                { left: `${100 * rangePosition(value, range)}%` },
              ]}
              pointerEvents="none"
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: toneColor(toneOf(status, lowIsDanger)),
                    borderColor: s.card,
                  },
                ]}
              />
            </View>
          )}
        </View>
        <View style={styles.scale}>
          <V2Text style={styles.tick} color={s.textMuted}>
            {range.low}
          </V2Text>
          <V2Text style={styles.tickTarget} color={s.text} numberOfLines={1}>
            {targetLabel}
          </V2Text>
          <V2Text style={[styles.tick, styles.tickEnd]} color={s.textMuted}>
            {range.max}
          </V2Text>
        </View>
      </View>
    </View>
  )
}

const TRACK = 8
const MARKER = 14

const styles = StyleSheet.create({
  statusLine: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    flexShrink: 1,
  },
  target: { ...FORM.hint, flexShrink: 1 },
  previous: { ...FORM.hint, fontVariant: ["tabular-nums"], flexShrink: 0 },
  previousAlone: { marginLeft: "auto" },
  bar: { flexDirection: "row", alignItems: "flex-start", gap: S[3] },
  // 마커 행(14)과 같은 높이로 눕혀 트랙과 나란히 읽힌다.
  caption: { ...FORM.hint, lineHeight: MARKER, minWidth: 32 },
  barBody: { flex: 1, gap: S[1] },
  trackRow: { height: MARKER, justifyContent: "center" },
  track: {
    height: TRACK,
    borderRadius: TRACK / 2,
    overflow: "hidden",
  },
  zone: { position: "absolute", top: 0, bottom: 0 },
  markerSlot: {
    position: "absolute",
    top: 0,
    width: 0,
    height: MARKER,
    alignItems: "center",
    overflow: "visible",
  },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 2,
  },
  scale: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[2],
  },
  tick: { ...FORM.hint, fontVariant: ["tabular-nums"], minWidth: 24 },
  tickEnd: { textAlign: "right" },
  tickTarget: { ...FORM.hint, flexShrink: 1, textAlign: "center" },
})
