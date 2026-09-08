import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useMemo, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { Text } from "@/src/shared/components/AppText"
import { V2BottomSheet } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"

import { addDaysToDateStr, useWeightWeek } from "../../../hooks/useWeightWeek"
import type { WeightPageParams } from "../../../stores/recordPageStore"
import { RecordPageShell } from "./RecordPageShell"
import { RecordNumberField } from "./RecordNumberField"
import { RecordHistoryState } from "./RecordHistoryState"
import { useWeightRecordForm } from "../../../hooks/useWeightRecordForm"
import { RecordFieldHint } from "./RecordFieldHint"
import { recordFieldLabel } from "./recordInk"
import { FORM, PAGE_X, S, TABLE } from "./recordPageSpec"

/** 하루 사이 ±0.05kg 미만은 같은 값으로 본다(0.1kg 단위 반올림 노이즈). */
const SAME_EPSILON = 0.05

/**
 * 체중 기록 페이지 — 시안(2026-09-05).
 *
 * 입력은 한 칸이고, 아래는 **지난 기록의 표**다(날짜·몸무게·어제와 차이). 시트 시절의
 * 7일 막대 그래프는 페이지에 오면서 표로 바뀌었다 — 같은 정보를 숫자로 읽는 편이
 * "어제보다 얼마" 를 확인하려는 이 화면의 목적에 맞는다. 하루 사이의 변화는 거의 전부
 * 수분이라는 사실은 안내 문장이 말한다.
 */
export function WeightRecordPage({
  params,
  onBack,
}: {
  params: WeightPageParams
  onBack: () => void
}) {
  const { t, i18n } = useTranslation("common")
  const english = (i18n.resolvedLanguage ?? i18n.language).startsWith("en")
  const s = useSurface()
  const inputRef = useRef<TextInput>(null)
  const [isInfoOpen, setInfoOpen] = useState(false)

  const formatWeight = (value: number) =>
    `${value.toFixed(1)}${english ? " " : ""}kg`

  /*
    7일 창은 **페이지가 직접** 읽는다. 여는 쪽이 넘겨 준 배열은 페이지를 연 순간의 눈금이라
    저장해도 표가 그대로였다 — 사용자에게는 저장이 안 된 것으로 보인다(2026-09-05 실측).
  */
  const week = useWeightWeek(params.endDate, true)
  const form = useWeightRecordForm(params, () => week.refetch(), onBack)
  const { text, weight, canSubmit, save } = form

  // ── 표: 선택 날짜로 끝나는 7일 창을 최신 순으로. 차이는 **바로 앞 기록**과 잰다. ──
  const rows = useMemo(() => {
    const byDate = new Map(
      (week.data ?? []).map((record) => [record.recordDate, record.weightKg]),
    )
    const out: { date: string; weightKg: number; diff: number | null }[] = []
    for (let i = 0; i < 7; i += 1) {
      const date = addDaysToDateStr(params.endDate, -i)
      const value = byDate.get(date)
      if (typeof value !== "number") continue
      const previous = byDate.get(addDaysToDateStr(date, -1))
      out.push({
        date,
        weightKg: value,
        diff: typeof previous === "number" ? value - previous : null,
      })
    }
    return out
  }, [week.data, params.endDate])

  const previousWeight = week.data?.find(
    (record) => record.recordDate === addDaysToDateStr(params.endDate, -1),
  )?.weightKg
  const comparison =
    weight !== null && canSubmit && typeof previousWeight === "number"
      ? weight - previousWeight
      : null

  return (
    <>
      <RecordPageShell
        title={t("home.recordPage.weight.title")}
        onBack={onBack}
        onInfo={() => setInfoOpen(true)}
        ctaLabel={t("home.recordPage.weight.save")}
        ctaDisabled={!canSubmit}
        intro={t("home.recordPage.weight.intro")}
        subtitle={params.endDate.replace(/-/gu, ".")}
        ctaLoading={save.isSaving || params.isSaving}
        ctaSuccess={save.saved}
        onCtaPress={() => void form.submit()}
      >
        <View style={styles.section}>
          <RecordNumberField
            prominent
            inputRef={inputRef}
            value={text}
            label={t("home.recordPage.weight.inputLabel")}
            unit={t("home.recordPage.weight.unit")}
            editable={!save.isSaving && !params.isSaving}
            invalid={text.length > 0 && !canSubmit}
            onChangeText={form.changeText}
            placeholder={t("home.recordPage.weight.placeholder")}
            keyboardType="decimal-pad"
            maxLength={5}
          />
          <RecordFieldHint error={text.length > 0 && !canSubmit}>
            {t(
              text.length > 0 && !canSubmit
                ? "home.recordPage.weight.inputRange"
                : "home.recordPage.weight.hint",
            )}
          </RecordFieldHint>
          <View style={[styles.comparison, { borderBottomColor: s.hairline }]}>
            <Text style={[styles.comparisonLabel, { color: s.text }]}>
              {t("home.recordPage.weight.column.diff")}
            </Text>
            <Text style={[styles.comparisonValue, { color: s.textStrong }]}>
              {diffText(comparison, formatWeight)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.historyHeading}>
            <Text style={[styles.historyTitle, { color: s.textStrong }]}>
              {t("home.recordPage.history")}
            </Text>
            <Text style={[styles.historyPeriod, { color: s.text }]}>
              {t("home.recordPage.weight.period")}
            </Text>
          </View>
          <View
            style={[styles.tableDivider, { backgroundColor: s.hairline }]}
          />
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text
              style={[styles.cellDate, styles.headerCell, { color: s.text }]}
            >
              {t("home.recordPage.weight.column.date")}
            </Text>
            <Text
              style={[styles.cellValue, styles.headerCell, { color: s.text }]}
            >
              {t("home.recordPage.weight.column.weight")}
            </Text>
            <Text
              style={[styles.cellDiff, styles.headerCell, { color: s.text }]}
            >
              {t("home.recordPage.weight.column.diff")}
            </Text>
          </View>
          {rows.length === 0 ? (
            <RecordHistoryState
              loading={week.isPending}
              error={week.isError}
              onRetry={() => void week.refetch()}
              emptyLabel={t("home.recordPage.weight.empty")}
            />
          ) : (
            rows.map((row) => (
              <View
                key={row.date}
                style={[
                  styles.tableRow,
                  {
                    backgroundColor:
                      row.date === params.endDate
                        ? s.surfaceSunken
                        : "transparent",
                    borderBottomColor: s.hairline,
                  },
                ]}
              >
                <Text style={[styles.cellDate, { color: recordFieldLabel(s) }]}>
                  {shortDate(row.date)}
                </Text>
                <Text style={[styles.cellValue, { color: s.textStrong }]}>
                  {formatWeight(row.weightKg)}
                </Text>
                <Text style={[styles.cellDiff, { color: recordFieldLabel(s) }]}>
                  {diffText(row.diff, formatWeight)}
                </Text>
              </View>
            ))
          )}
        </View>
      </RecordPageShell>

      <V2BottomSheet
        surface="home_weight_info"
        visible={isInfoOpen}
        onClose={() => setInfoOpen(false)}
      >
        <View style={styles.infoSheet}>
          <Text style={[styles.infoTitle, { color: s.textStrong }]}>
            {t("home.recordPage.weight.title")}
          </Text>
          <Text
            style={[styles.infoBody, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("home.recordPage.weight.info")}
          </Text>
        </View>
      </V2BottomSheet>
    </>
  )
}

/** "2026-08-19" → "08/19". 표의 폭이 좁아 연도는 뺀다(전부 최근 7일이다). */
function shortDate(date: string): string {
  const [, month, day] = date.split("-")
  return `${month}/${day}`
}

/** 어제와의 차이. 없으면 "—", 사실상 같으면 0, 아니면 부호를 붙인다. */
function diffText(
  diff: number | null,
  format: (value: number) => string,
): string {
  if (diff === null) return "—"
  if (Math.abs(diff) < SAME_EPSILON) return format(0)
  return `${diff > 0 ? "+" : "−"}${format(Math.abs(diff))}`
}

const styles = StyleSheet.create({
  infoSheet: { paddingHorizontal: PAGE_X, gap: S[3] },
  infoTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  infoBody: { fontSize: 15, lineHeight: 22 },
  section: { paddingHorizontal: PAGE_X, marginBottom: S[4] },
  hint: { ...FORM.hint, marginTop: S[2] },
  comparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S[3],
    marginTop: S[2],
    paddingBottom: S[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  comparisonLabel: { fontSize: 14, lineHeight: 22, flex: 1 },
  comparisonValue: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
    textAlign: "right",
  },
  historyHeading: {
    paddingHorizontal: PAGE_X,
    marginBottom: S[3],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyTitle: FORM.label,
  historyPeriod: { fontSize: 12, lineHeight: 18 },
  table: {
    marginTop: FORM.sectionGap,
    minHeight: TABLE.rowHeight * 2 + S[4] * 2 + TABLE.headerHeight,
  },
  tableDivider: { height: StyleSheet.hairlineWidth, marginBottom: S[2] },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: TABLE.rowHeight,
    paddingVertical: S[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: PAGE_X,
  },
  tableHeader: { minHeight: TABLE.headerHeight, borderBottomWidth: 0 },
  headerCell: { fontWeight: "500" },
  cellDate: { flex: 1, fontSize: TABLE.fontSize, lineHeight: TABLE.lineHeight },
  cellValue: {
    flex: 1,
    textAlign: "right",
    fontSize: TABLE.fontSize,
    lineHeight: TABLE.lineHeight,
    fontVariant: ["tabular-nums"],
  },
  cellDiff: {
    flex: 1,
    textAlign: "right",
    fontSize: TABLE.fontSize,
    lineHeight: TABLE.lineHeight,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    paddingHorizontal: PAGE_X,
    paddingVertical: S[5],
    fontSize: TABLE.fontSize,
    lineHeight: TABLE.lineHeight,
  },
})
