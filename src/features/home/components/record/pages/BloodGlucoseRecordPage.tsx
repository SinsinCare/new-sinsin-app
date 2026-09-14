import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useMemo, useRef } from "react"
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { V2Disclosure, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import type { BloodGlucosePageParams } from "../../../stores/recordPageStore"
import { useGlucoseRecordForm } from "../../../hooks/useGlucoseRecordForm"
import {
  GLUCOSE_TIMING_OPTIONS,
  GLUCOSE_SLOT_OPTIONS,
  GLUCOSE_ELAPSED_OPTIONS,
} from "../../../data/bloodMetricsConstants"
import {
  orderGlucoseByDay,
  glucoseCellKey,
  glucoseCellOrder,
  type GlucoseCell,
} from "../../../utils/glucoseGrid"
import type { DateAnalysisBloodGlucoseRecord } from "@/src/types/foodCamera"
import { RecordPageShell } from "./RecordPageShell"
import { RecordNumberField } from "./RecordNumberField"
import { RecordFieldHint } from "./RecordFieldHint"
import { RecordChoices } from "./RecordChoices"
import { RecordRangeBar, RecordStatusLine } from "./RecordRangeBar"
import { classifyValue, glucoseRangeFor, parseReading } from "./recordRanges"
import { FORM, PAGE_X, S, TABLE } from "./recordPageSpec"

/**
 * "지난번" — 그날 기록 중 지금 고른 칸 **앞**의 가장 가까운 것. 앞에 없으면 뒤의 마지막.
 * 지금 칸에 저장된 값은 이미 입력칸에 떠 있으니 제외한다. 없으면 `null` — 지어내지 않는다.
 */
function previousGlucose(
  records: readonly DateAnalysisBloodGlucoseRecord[],
  cell: GlucoseCell,
): DateAnalysisBloodGlucoseRecord | null {
  const current = glucoseCellOrder(cell)
  const others = orderGlucoseByDay(records).filter(
    (row) =>
      glucoseCellKey({ ...row, slot: row.slot ?? "" }) !== glucoseCellKey(cell),
  )
  const before = others.filter(
    (row) =>
      glucoseCellOrder({ slot: row.slot ?? "", timing: row.timing }) < current,
  )
  return before.at(-1) ?? others.at(-1) ?? null
}

export function BloodGlucoseRecordPage({
  params,
  onBack,
}: {
  params: BloodGlucosePageParams
  onBack: () => void
}) {
  const { t } = useTranslation("common")
  const s = useSurface()
  const input = useRef<TextInput>(null)
  const form = useGlucoseRecordForm(params, onBack)
  const value = form.valid ? parseReading(form.draft.text) : null
  const range = glucoseRangeFor(form.cell.timing)
  const status = classifyValue(value, range)
  const previous = useMemo(
    () => previousGlucose(form.records, form.cell),
    [form.records, form.cell],
  )
  const targetLabel = t("home.recordPage.bloodGlucose.target", {
    low: range.targetLow,
    high: range.targetHigh,
  })
  return (
    <RecordPageShell
      title={t("home.sheet.bloodGlucose.title")}
      intro={t("home.recordPage.bloodGlucose.intro")}
      subtitle={params.date.replace(/-/gu, ".")}
      onBack={onBack}
      ctaLabel={
        value !== null
          ? t("home.recordPage.bloodGlucose.saveWith", { value })
          : t("home.recordPage.bloodGlucose.save")
      }
      ctaDisabled={!form.valid}
      ctaLoading={form.save.isSaving}
      ctaSuccess={form.save.saved}
      onCtaPress={form.submit}
    >
      <View style={styles.content}>
        <View>
          <RecordNumberField
            inputRef={input}
            prominent
            label={t("home.recordPage.bloodGlucose.value")}
            unit="mg/dL"
            value={form.draft.text}
            invalid={form.draft.text.length > 0 && !form.valid}
            onChangeText={form.setText}
            placeholder="100"
            keyboardType="number-pad"
            maxLength={3}
            editable={!form.save.isSaving}
          />
          <RecordFieldHint error={form.draft.text.length > 0 && !form.valid}>
            {t(
              form.draft.text && !form.valid
                ? "home.recordPage.bloodGlucose.range"
                : "home.recordPage.bloodGlucose.hint",
            )}
          </RecordFieldHint>
          <View style={styles.judgement}>
            <RecordStatusLine
              status={status}
              lowIsDanger
              statusLabel={
                status === null
                  ? ""
                  : t(`home.recordPage.bloodGlucose.status.${status}`)
              }
              targetLabel={targetLabel}
              previousLabel={
                previous === null
                  ? null
                  : t("home.recordPage.bloodGlucose.previous", {
                      value: previous.value,
                    })
              }
            />
            <RecordRangeBar
              range={range}
              value={value}
              status={status}
              lowIsDanger
              targetLabel={targetLabel}
            />
          </View>
        </View>
        <View>
          <View style={styles.group}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("home.sheet.bloodGlucose.timing")}
            </V2Text>
            <RecordChoices
              value={form.cell.timing}
              disabled={form.save.isSaving}
              options={GLUCOSE_TIMING_OPTIONS.map((value) => ({
                value,
                label: t(`home.bloodGlucose.timing.${value}`),
              }))}
              onChange={form.changeTiming}
            />
          </View>
          <V2Disclosure open={form.cell.timing !== "FASTING"}>
            <View style={styles.context}>
              <View style={styles.group}>
                <V2Text style={styles.label} color={s.textStrong}>
                  {t("home.sheet.bloodGlucose.mealSlot")}
                </V2Text>
                <RecordChoices
                  value={form.cell.timing === "FASTING" ? null : form.cell.slot}
                  disabled={
                    form.save.isSaving || form.cell.timing === "FASTING"
                  }
                  options={[
                    ...GLUCOSE_SLOT_OPTIONS.map((value) => ({
                      value,
                      label: t(`meal.${value}`),
                    })),
                    {
                      value: "",
                      label: t("home.recordPage.bloodGlucose.unspecified"),
                    },
                  ]}
                  onChange={(slot) => form.changeCell({ ...form.cell, slot })}
                />
              </View>
              <V2Disclosure open={form.cell.timing === "AFTER_MEAL"}>
                <View style={[styles.group, styles.elapsed]}>
                  <V2Text style={styles.label} color={s.textStrong}>
                    {t("home.sheet.bloodGlucose.elapsed")}
                  </V2Text>
                  <RecordChoices
                    value={
                      form.cell.timing === "AFTER_MEAL"
                        ? form.draft.elapsed
                        : null
                    }
                    disabled={
                      form.save.isSaving || form.cell.timing !== "AFTER_MEAL"
                    }
                    onChange={form.setElapsed}
                    options={GLUCOSE_ELAPSED_OPTIONS.map((value) => ({
                      value,
                      label: t(
                        `home.sheet.bloodGlucose.elapsedOption.${value}`,
                      ),
                    }))}
                  />
                </View>
              </V2Disclosure>
            </View>
          </V2Disclosure>
        </View>
        <View style={[styles.history, { borderTopColor: s.border }]}>
          <V2Text style={styles.label} color={s.textStrong}>
            {t("home.recordPage.bloodGlucose.history")}
          </V2Text>
          {form.records.length === 0 ? (
            <V2Text style={styles.empty} color={s.text}>
              {t("home.recordPage.bloodGlucose.empty")}
            </V2Text>
          ) : (
            orderGlucoseByDay(form.records).map((row) => (
              <View
                key={glucoseCellKey({ ...row, slot: row.slot ?? "" })}
                style={[styles.row, { borderBottomColor: s.hairline }]}
              >
                <View style={styles.rowLabel}>
                  <V2Text style={styles.body} color={s.textStrong}>
                    {row.slot ? `${t(`meal.${row.slot}`)} · ` : ""}
                    {t(`home.bloodGlucose.timing.${row.timing}`)}
                  </V2Text>
                  {row.elapsed && (
                    <V2Text style={styles.hint} color={s.text}>
                      {t(
                        `home.sheet.bloodGlucose.elapsedOption.${row.elapsed}`,
                      )}
                    </V2Text>
                  )}
                </View>
                <V2Text style={styles.number} color={s.textStrong}>
                  {row.value}{" "}
                  <V2Text style={styles.hint} color={s.text}>
                    mg/dL
                  </V2Text>
                </V2Text>
              </View>
            ))
          )}
        </View>
      </View>
    </RecordPageShell>
  )
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_X, gap: FORM.sectionGap },
  group: { gap: FORM.labelGap },
  judgement: { marginTop: S[2], gap: S[3] },
  context: { paddingTop: FORM.sectionGap },
  elapsed: { paddingTop: FORM.sectionGap },
  label: FORM.label,
  hint: FORM.hint,
  history: {
    paddingTop: FORM.sectionGap,
    gap: S[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  empty: { fontSize: 14, lineHeight: 22, paddingVertical: S[4] },
  row: {
    minHeight: TABLE.rowHeight,
    paddingVertical: S[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: S[3],
  },
  rowLabel: { flex: 1 },
  body: FORM.body,
  number: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
})
