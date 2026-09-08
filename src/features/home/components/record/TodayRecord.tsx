import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import { LAYOUT } from "@/src/theme/surface"
import { RecordRowPressable } from "./RecordRowPressable"
import { useHomeInk } from "./homeInk"
import { useTranslation } from "react-i18next"

export interface TodayRecordTileData {
  key: string
  /** 지표를 구분하는 그림 한 점. 상태는 말하지 않는다. */
  icon: ReactNode
  label: string
  /** 기록된 값. null 이면 "기록 없음" 으로 비워 둔다 — 자리는 늘 같아야 한다. */
  value: string | null
  unit?: string
  onPress: () => void
}

/**
 * 오늘의 건강기록 — 2열 격자. 시안(2026-09-04, `home.svg`) 실측:
 * 타일 164×112 · r16 · 간격 7 · 보더 1(#70737C 8%) · 안쪽 위 20/옆 16 ·
 * 아이콘 24 + 라벨 14 · 8 아래 값 18/700(단위 14) · 비면 "기록 없음" 18/500.
 * 내용은 **위로 붙는다**(값 아래가 비어 있는 것이 시안이다).
 *
 * 여섯 지표가 늘 같은 자리에 서고, 누르면 그 자리에서 기록 시트가 열린다.
 * 값이 없어도 타일을 숨기지 않는다 — "기록 없음" 으로 빈 자리를 보여줘야 누를 곳이
 * 학습된다. 흰 바닥 위 흰 타일이라 층은 **보더**가 만든다.
 */
export function TodayRecord({
  title,
  tiles,
}: {
  title: string
  tiles: TodayRecordTileData[]
}) {
  const { t } = useTranslation("common")
  const ink = useHomeInk()

  const pairs: TodayRecordTileData[][] = []
  for (let i = 0; i < tiles.length; i += 2) {
    pairs.push(tiles.slice(i, i + 2))
  }

  return (
    <View style={styles.section}>
      <Text
        style={[styles.title, { color: ink.strong }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {title}
      </Text>

      <View style={styles.grid}>
        {pairs.map((pair, pairIndex) => (
          <View key={pairIndex} style={styles.gridRow}>
            {pair.map((tile) => {
              const filled = tile.value !== null
              return (
                <View key={tile.key} style={styles.cell}>
                  <RecordRowPressable
                    tone="card"
                    baseColor={ink.tileBg}
                    accessibilityLabel={`${tile.label} ${
                      filled
                        ? `${tile.value}${tile.unit ?? ""}`
                        : t("home.todayRecord.noRecord")
                    }`}
                    onPress={tile.onPress}
                    style={[styles.tile, { borderColor: ink.hairline }]}
                  >
                    <View style={styles.tileHead}>
                      {tile.icon}
                      <Text
                        style={[styles.tileLabel, { color: ink.muted }]}
                        numberOfLines={1}
                      >
                        {tile.label}
                      </Text>
                    </View>

                    {filled ? (
                      <View style={styles.valueRow}>
                        <Text
                          style={[styles.value, { color: ink.strong }]}
                          numberOfLines={1}
                        >
                          {tile.value}
                        </Text>
                        {tile.unit ? (
                          <Text style={[styles.unit, { color: ink.muted }]}>
                            {tile.unit}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text
                        style={[styles.empty, { color: ink.placeholder }]}
                        numberOfLines={1}
                      >
                        {t("home.todayRecord.noRecord")}
                      </Text>
                    )}
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
    paddingTop: 16,
    paddingHorizontal: LAYOUT.screenX,
    gap: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
    fontWeight: "700",
  },
  grid: { gap: 8 },
  gridRow: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  cell: { flex: 1 },
  tile: {
    minHeight: 112,
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  tileLabel: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.28,
    fontWeight: "500",
    flexShrink: 1,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  value: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
  },
  unit: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  empty: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
    fontWeight: "500",
  },
})
