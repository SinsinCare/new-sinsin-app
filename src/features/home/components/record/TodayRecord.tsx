import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT } from "@/src/theme/surface"
import { RecordRowPressable } from "./RecordRowPressable"
import { useTranslation } from "react-i18next"

export interface TodayRecordTileData {
  key: string
  /** 지표를 구분하는 그림 한 점. 상태는 말하지 않는다. */
  icon: ReactNode
  label: string
  /** 기록된 값. null 이면 "--" 로 비워 둔다 — 자리는 늘 같아야 한다. */
  value: string | null
  unit?: string
  caption: string
  /** 지금 기록할 차례인 타일(브랜드 보더 + "지금" 배지). */
  highlight?: boolean
  onPress: () => void
}

/** 하이라이트 보더 — 브랜드 원색을 그대로 두르면 CTA 와 싸운다. 옅게 깐다. */
const HIGHLIGHT_BORDER = "rgba(254,113,57,0.45)"

/**
 * 오늘 기록 — 2열 고정 그리드(타일 h112 · r20 · 값 24/700, 시트 렌더 실측).
 * 여섯 지표가 늘 같은 자리에 서고, 누르면 그 자리에서 기록 시트가 열린다.
 * 값이 없어도 타일을 숨기지 않는다 — "--" 로 빈 자리를 보여줘야 누를 곳이 학습된다.
 *
 * 카드엔 그림자를 주지 않는다. 회색 바닥 위 흰 면의 톤 차이가 층이고,
 * 지금 할 일 하나만 옅은 브랜드 보더로 들어 올린다.
 */
export function TodayRecord({ tiles }: { tiles: TodayRecordTileData[] }) {
  const { t } = useTranslation("common")
  const surface = useSurface()

  const pairs: TodayRecordTileData[][] = []
  for (let i = 0; i < tiles.length; i += 2) {
    pairs.push(tiles.slice(i, i + 2))
  }

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: surface.textStrong }]}>
          {t("home.todayRecord.title")}
        </Text>
        <Text style={[styles.headHint, { color: surface.textMuted }]}>
          {t("home.todayRecord.hint")}
        </Text>
      </View>

      <View style={styles.grid}>
        {pairs.map((pair, pairIndex) => (
          <View key={pairIndex} style={styles.gridRow}>
            {pair.map((tile) => {
              const filled = tile.value !== null
              return (
                <View key={tile.key} style={styles.cell}>
                  <RecordRowPressable
                    tone="card"
                    accessibilityLabel={`${tile.label} ${
                      filled
                        ? `${tile.value}${tile.unit ?? ""}`
                        : t("home.todayRecord.add")
                    }`}
                    onPress={tile.onPress}
                    style={[
                      styles.tile,
                      tile.highlight && {
                        borderWidth: 1.5,
                        borderColor: HIGHLIGHT_BORDER,
                      },
                    ]}
                  >
                    <View style={styles.tileHead}>
                      {tile.icon}
                      <Text
                        style={[styles.tileLabel, { color: surface.textMuted }]}
                        numberOfLines={1}
                      >
                        {tile.label}
                      </Text>
                      {tile.highlight ? (
                        <View
                          style={[
                            styles.nowBadge,
                            { backgroundColor: surface.brand },
                          ]}
                        >
                          <Text
                            style={[
                              styles.nowBadgeLabel,
                              { color: surface.onBrand },
                            ]}
                          >
                            {t("home.todayRecord.now")}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.tileFoot}>
                      <View style={styles.valueRow}>
                        <Text
                          style={[
                            styles.value,
                            {
                              color: filled
                                ? surface.textStrong
                                : surface.placeholder,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {filled ? tile.value : "--"}
                        </Text>
                        {tile.unit ? (
                          <Text
                            style={[styles.unit, { color: surface.textMuted }]}
                          >
                            {tile.unit}
                          </Text>
                        ) : null}
                      </View>

                      <Text
                        style={[styles.caption, { color: surface.placeholder }]}
                        numberOfLines={1}
                        lineBreakStrategyIOS="hangul-word"
                      >
                        {tile.caption}
                      </Text>
                    </View>
                  </RecordRowPressable>
                </View>
              )
            })}
            {pair.length === 1 ? <View style={styles.cell} /> : null}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    // 위는 프로필 행(h56)이 이미 띄워준다 — 아래만 섹션 간격 28.
    paddingTop: 14,
    paddingBottom: 28,
    paddingHorizontal: LAYOUT.screenX,
    gap: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  // 시트 렌더 실측: 제목 20/700, 우측 보조 15/500(같은 중간 회색).
  title: {
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: -0.4,
    fontWeight: "700",
  },
  headHint: { fontSize: 15, lineHeight: 21, fontWeight: "500" },
  // 카드 간격 10
  grid: { gap: 10 },
  gridRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  cell: { flex: 1 },
  tile: {
    // 고정 높이가 아니라 최소 높이 — 영어 캡션은 두 줄이 되기도 한다.
    // 줄이 stretch 라 같은 행의 두 타일은 항상 같은 높이로 선다.
    minHeight: 112,
    flex: 1,
    borderRadius: 20,
    padding: 18,
    justifyContent: "space-between",
  },
  // QA(2026-08-02): 아이콘-라벨 간격 4 로 좁히고, 라벨은 위계상 한 단계 위로.
  tileHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  tileLabel: { fontSize: 16, lineHeight: 22, fontWeight: "600", flexShrink: 1 },
  nowBadge: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nowBadgeLabel: { fontSize: 11.5, lineHeight: 15, fontWeight: "700" },
  tileFoot: { gap: 3 },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  value: {
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.55,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
  },
  unit: { fontSize: 13.5, lineHeight: 19, fontWeight: "500" },
  // 캡션은 **한 줄**이다. 타일이 space-between 이라 발(값+캡션)이 바닥에 붙는데,
  // 캡션 줄 수가 다르면 같은 행인데도 큰 숫자가 서로 18pt 어긋나 보인다.
  // 두 줄을 허용하는 대신 문구 자체를 짧게 유지한다(폭 ≈ 140pt → 한글 10자·영문 21자).
  // 새 캡션을 추가할 때도 이 예산을 지킬 것.
  caption: { fontSize: 13, lineHeight: 18, minHeight: 18 },
})
