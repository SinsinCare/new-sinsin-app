import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useRef } from "react"
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
import { orderGlucoseByDay, glucoseCellKey } from "../../../utils/glucoseGrid"
import { RecordPageShell } from "./RecordPageShell"
import { RecordNumberField } from "./RecordNumberField"
import { RecordFieldHint } from "./RecordFieldHint"
import { RecordChoices } from "./RecordChoices"
import { FORM, PAGE_X, S, TABLE } from "./recordPageSpec"

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
  return (
    <RecordPageShell
      title={t("home.sheet.bloodGlucose.title")}
      intro={t("home.recordPage.bloodGlucose.intro")}
      subtitle={params.date.replace(/-/gu, ".")}
      onBack={onBack}
      ctaLabel={t("home.recordPage.bloodGlucose.save")}
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
