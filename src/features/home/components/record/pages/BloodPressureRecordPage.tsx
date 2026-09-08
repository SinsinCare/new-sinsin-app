import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useMemo, useRef, useState } from "react"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import { RecordNumberField } from "./RecordNumberField"
import { RecordChoices } from "./RecordChoices"
import { PressureSlotSelector } from "./PressureSlotSelector"
import { RecordHistoryState } from "./RecordHistoryState"
import {
  useBloodPressureRecordForm,
  TIMELESS_SLOT,
} from "../../../hooks/useBloodPressureRecordForm"
import { RecordOptionalSection } from "./RecordOptionalSection"
import { RecordFieldHint } from "./RecordFieldHint"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Text } from "@/src/shared/components/AppText"
import { V2BottomSheet } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { bloodMetricsService } from "@/src/services/data/bloodMetricsService"
import {
  BLOOD_PRESSURE_TIMING_OPTIONS,
  type BloodPressureRangeRecord,
} from "@/src/types/bloodMetrics"

import type { BloodPressurePageParams } from "../../../stores/recordPageStore"
import { RecordPageShell } from "./RecordPageShell"
import { FIELD, FORM, PAGE_X, S, TABLE } from "./recordPageSpec"

/**
 * 혈압 기록 페이지 — 시안 `My Page Home*.svg`(2026-09-05).
 *
 * 종전 시트와 다른 점은 **끼니 × 시점 격자**다. 혈압은 하루에 여러 번 재고 언제 쟀는지가
 * 곧 그 값의 뜻인데(아침 공복과 저녁 식후는 다른 수치다), 서버 유니크가 `(user, date)` 라
 * 하루 한 행이 상한이었다 — 저녁에 다시 재면 아침 값이 조용히 사라졌다. 마이그레이션
 * 093 이 혈당(081)과 같은 격자를 열었고 이 화면이 그 칸을 고른다.
 */
export function BloodPressureRecordPage({
  params,
  onBack,
}: {
  params: BloodPressurePageParams
  onBack: () => void
}) {
  const { t } = useTranslation("common")
  const s = useSurface()
  const [isInfoOpen, setInfoOpen] = useState(false)
  const { width, fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const systolicRef = useRef<TextInput>(null)
  const diastolicRef = useRef<TextInput>(null)
  const heartRateRef = useRef<TextInput>(null)
  /*
    이력은 **선택 날짜 하루치**만 연다. 시안의 표가 그날의 칸들을 보여주는 것이고,
    창을 넓히면 표가 어제 것까지 섞여 "지금 무엇을 고치고 있는지" 가 흐려진다.
  */
  const history = useQuery({
    queryKey: ["blood-pressure-records", params.date],
    queryFn: () =>
      bloodMetricsService.fetchBloodPressureRecords(params.date, params.date),
  })
  const rows = useMemo<BloodPressureRangeRecord[]>(
    () => history.data ?? [],
    [history.data],
  )

  const form = useBloodPressureRecordForm(
    params,
    rows,
    () => history.refetch(),
    onBack,
  )
  const { slot, timing, save, canSubmit, submit } = form
  const { systolic, diastolic, heartRate } = form.draft
  const [pulseOpen, setPulseOpen] = useState(!!heartRate)
  const pressureError = form.errors.systolic
    ? "systolicRange"
    : form.errors.diastolic
      ? "diastolicRange"
      : null

  return (
    <>
      <RecordPageShell
        title={t("home.recordPage.bloodPressure.title")}
        intro={t("home.recordPage.bloodPressure.intro")}
        subtitle={params.date.replace(/-/gu, ".")}
        onBack={onBack}
        onInfo={() => setInfoOpen(true)}
        ctaLabel={t("home.recordPage.bloodPressure.save")}
        ctaDisabled={!canSubmit}
        ctaLoading={save.isSaving || params.isSaving}
        ctaSuccess={save.saved}
        onCtaPress={() => void submit()}
      >
        {/* Paired measurements share a baseline and stack when text needs more room. */}
        <View style={styles.section}>
          <View
            style={[
              styles.fieldRow,
              width / fontScale < 320 && styles.stackedFields,
            ]}
          >
            <RecordNumberField
              paired
              inputRef={systolicRef}
              label={t("home.recordPage.bloodPressure.column.systolic")}
              editable={!save.isSaving && !params.isSaving}
              keyboardType="number-pad"
              maxLength={3}
              value={systolic}
              placeholder={t(
                "home.recordPage.bloodPressure.systolicPlaceholder",
              )}
              unit="mmHg"
              invalid={form.errors.systolic}
              onChangeText={(text) => form.setReading("systolic", text)}
            />
            <RecordNumberField
              paired
              inputRef={diastolicRef}
              label={t("home.recordPage.bloodPressure.column.diastolic")}
              editable={!save.isSaving && !params.isSaving}
              keyboardType="number-pad"
              maxLength={3}
              value={diastolic}
              placeholder={t(
                "home.recordPage.bloodPressure.diastolicPlaceholder",
              )}
              unit="mmHg"
              invalid={form.errors.diastolic}
              onChangeText={(text) => form.setReading("diastolic", text)}
            />
          </View>
          <RecordFieldHint error={!!pressureError}>
            {t(`home.recordPage.bloodPressure.${pressureError ?? "inputHint"}`)}
          </RecordFieldHint>
        </View>

        <View style={styles.section}>
          <Text style={[styles.groupLabel, { color: s.textStrong }]}>
            {t("home.recordPage.bloodPressure.slotLabel")}
          </Text>
          <PressureSlotSelector
            value={slot}
            disabled={save.isSaving || params.isSaving}
            onChange={form.changeSlot}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.groupLabel, { color: s.textStrong }]}>
            {t("home.sheet.bloodGlucose.timing")}
          </Text>
          <RecordChoices
            value={slot === TIMELESS_SLOT ? null : timing}
            disabled={
              save.isSaving || params.isSaving || slot === TIMELESS_SLOT
            }
            options={BLOOD_PRESSURE_TIMING_OPTIONS.map((value) => ({
              value,
              label: t(
                `home.recordPage.bloodPressure.timing.${value}` as never,
              ),
            }))}
            onChange={form.changeTiming}
          />
        </View>

        <View style={styles.section}>
          <RecordOptionalSection
            title={t("home.recordPage.bloodPressure.pulseOptional")}
            value={heartRate ? `${heartRate} bpm` : undefined}
            open={pulseOpen || form.errors.heartRate}
            onChange={setPulseOpen}
            disabled={save.isSaving || params.isSaving}
          >
            <RecordNumberField
              inputRef={heartRateRef}
              label={t("home.recordPage.bloodPressure.pulseOptional")}
              editable={!save.isSaving && !params.isSaving}
              keyboardType="number-pad"
              maxLength={3}
              value={heartRate}
              placeholder={t(
                "home.recordPage.bloodPressure.heartRatePlaceholder",
              )}
              unit="bpm"
              invalid={form.errors.heartRate}
              onChangeText={(text) => form.setReading("heartRate", text)}
            />
            <RecordFieldHint error={form.errors.heartRate}>
              {t(
                `home.recordPage.bloodPressure.${form.errors.heartRate ? "pulseRange" : "pulseHint"}`,
              )}
            </RecordFieldHint>
          </RecordOptionalSection>
        </View>

        <View>
          <View style={styles.historyHeading}>
            <Text style={[styles.historyTitle, { color: s.textStrong }]}>
              {t("home.recordPage.history")}
            </Text>
            <Text style={[styles.historyDate, { color: s.text }]}>
              {params.date.replace(/-/gu, ".")}
            </Text>
          </View>
          <HistoryTable
            rows={rows}
            date={params.date}
            loading={history.isPending}
            error={history.isError}
            retry={() => void history.refetch()}
            slot={slot}
            timing={slot === TIMELESS_SLOT ? "" : timing}
          />
        </View>
      </RecordPageShell>

      <V2BottomSheet
        surface="home_blood_pressure_info"
        visible={isInfoOpen}
        onClose={() => setInfoOpen(false)}
      >
        <View style={styles.infoSheet}>
          <Text style={[styles.infoTitle, { color: s.textStrong }]}>
            {t("home.recordPage.bloodPressure.title")}
          </Text>
          <Text
            style={[styles.infoBody, { color: s.text }]}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("home.recordPage.bloodPressure.info")}
          </Text>
        </View>
      </V2BottomSheet>
    </>
  )
}

/** 그날의 칸들 — 시간·최고·최저·심박수. 시안 헤더 34 + 행 48. */
function HistoryTable({
  rows,
  date,
  loading,
  error,
  retry,
  slot,
  timing,
}: {
  rows: BloodPressureRangeRecord[]
  date: string
  loading: boolean
  error: boolean
  retry: () => void
  slot: string
  timing: string
}) {
  const { t } = useTranslation("common")
  const s = useSurface()
  return (
    <View style={styles.table}>
      <View style={[styles.tableDivider, { backgroundColor: s.hairline }]} />
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.cellTime, styles.headerCell, { color: s.text }]}>
          {t("home.recordPage.bloodPressure.column.time")}
        </Text>
        <Text style={[styles.cellValue, styles.headerCell, { color: s.text }]}>
          {t("home.recordPage.bloodPressure.column.systolic")}
        </Text>
        <Text style={[styles.cellValue, styles.headerCell, { color: s.text }]}>
          {t("home.recordPage.bloodPressure.column.diastolic")}
        </Text>
        <Text style={[styles.cellPulse, styles.headerCell, { color: s.text }]}>
          {t("home.recordPage.bloodPressure.column.heartRate")}
        </Text>
      </View>
      {rows.length === 0 ? (
        <RecordHistoryState
          loading={loading}
          error={error}
          onRetry={retry}
          emptyLabel={t("home.recordPage.bloodPressure.empty")}
        />
      ) : (
        rows.map((row) => (
          <View
            key={`${row.recordDate}-${row.slot}-${row.timing}`}
            style={[
              styles.tableRow,
              {
                backgroundColor:
                  row.slot === slot && row.timing === timing
                    ? s.surfaceSunken
                    : "transparent",
                borderBottomColor: s.hairline,
              },
            ]}
          >
            <Text style={[styles.cellTime, { color: s.text }]}>
              {timeLabel(row, date, t)}
            </Text>
            <Text style={[styles.cellValue, { color: s.textStrong }]}>
              {row.systolic}
            </Text>
            <Text style={[styles.cellValue, { color: s.textStrong }]}>
              {row.diastolic}
            </Text>
            <Text style={[styles.cellPulse, { color: s.textStrong }]}>
              {row.heartRate ?? "—"}
            </Text>
          </View>
        ))
      )}
    </View>
  )
}

/**
 * 표의 "시간" 칸. 서버가 시각을 아는 기록(093 이후)은 시:분을, 모르는 기록은 **칸 이름**을
 * 보여준다 — 093 이전 행은 시각이 null 이고, 그것을 0시로 지어내면 거짓이 된다.
 */
function timeLabel(
  row: BloodPressureRangeRecord,
  _date: string,
  t: (key: never) => string,
): string {
  if (row.recordedAt !== null) {
    const match = /T(\d{2}):(\d{2})/u.exec(row.recordedAt)
    if (match) {
      // 서버 시각은 naive UTC 다. 표시는 KST(+9) 로 옮긴다.
      const hour = (Number(match[1]) + 9) % 24
      return `${String(hour).padStart(2, "0")}:${match[2]}`
    }
  }
  if (row.slot === "") return "—"
  const slotName = t(`home.recordPage.bloodPressure.slot.${row.slot}` as never)
  if (row.timing === "") return slotName
  return `${slotName} ${t(`home.recordPage.bloodPressure.timing.${row.timing}` as never)}`
}

const styles = StyleSheet.create({
  infoSheet: { paddingHorizontal: PAGE_X, gap: S[3] },
  infoTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  infoBody: { fontSize: 15, lineHeight: 22 },
  section: { paddingHorizontal: PAGE_X, marginBottom: FORM.sectionGap },
  historyHeading: {
    paddingHorizontal: PAGE_X,
    marginTop: S[5],
    marginBottom: S[3],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyTitle: FORM.label,
  historyDate: { fontSize: 12, lineHeight: 18, fontVariant: ["tabular-nums"] },
  groupLabel: { ...FORM.label, marginBottom: FORM.labelGap },
  fieldRow: { flexDirection: "row", gap: FIELD.gap },
  stackedFields: { flexDirection: "column" },
  table: {
    marginTop: S[2],
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
  cellTime: {
    flex: 1.2,
    fontSize: TABLE.fontSize,
    lineHeight: TABLE.lineHeight,
  },
  cellValue: {
    flex: 1,
    textAlign: "right",
    fontSize: TABLE.fontSize,
    lineHeight: TABLE.lineHeight,
    fontVariant: ["tabular-nums"],
  },
  cellPulse: {
    flex: 0.8,
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
