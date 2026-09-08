import {
  FONT_SCALE,
  effectiveTextScale,
} from "@/src/design-system-v2/tokens/fontScaling"
import { StyleSheet, Pressable, View, useWindowDimensions } from "react-native"
import { useTranslation } from "react-i18next"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Disclosure, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import type { EdemaPageParams } from "../../../stores/recordPageStore"
import { useEdemaRecordForm } from "../../../hooks/useEdemaRecordForm"
import { EDEMA_PARTS } from "../../../utils/edemaEntry"
import {
  EDEMA_OPTIONS,
  normalizeEdemaLevel,
} from "../../../data/EdemaConstants"
import { RecordPageShell } from "./RecordPageShell"
import { RecordChoices } from "./RecordChoices"
import { FORM, PAGE_X, S } from "./recordPageSpec"
import { recordFieldLabel } from "./recordInk"

export function EdemaRecordPage({
  params,
  onBack,
}: {
  params: EdemaPageParams
  onBack: () => void
}) {
  const { t } = useTranslation("common")
  const s = useSurface()
  const { fontScale: systemFontScale } = useWindowDimensions()
  const fontScale = effectiveTextScale(systemFontScale, FONT_SCALE.body)
  const form = useEdemaRecordForm(params, onBack)
  const degreeDisabled = !form.part || form.save.isSaving
  const pittingDisabled =
    degreeDisabled || !form.current || form.current.level === "NONE"
  const previous = normalizeEdemaLevel(params.previous?.edemaLevel)
  return (
    <RecordPageShell
      title={t("home.sheet.edema.title")}
      intro={t("home.recordPage.edema.intro")}
      subtitle={params.date.replace(/-/gu, ".")}
      keyboardEnabled={false}
      onBack={onBack}
      ctaLabel={t("home.recordPage.edema.save")}
      ctaDisabled={!form.valid}
      ctaLoading={form.save.isSaving}
      ctaSuccess={form.save.saved}
      onCtaPress={form.submit}
    >
      <View style={styles.content}>
        <View style={styles.group}>
          <V2Text style={styles.label} color={s.textStrong}>
            {t("home.recordPage.edema.where")}
          </V2Text>
          <V2Text style={styles.hint} color={s.text}>
            {t("home.recordPage.edema.partHint")}
          </V2Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={t("home.recordPage.edema.none")}
            accessibilityState={{
              checked: form.none,
              expanded: !form.none,
              disabled: form.save.isSaving,
            }}
            disabled={form.save.isSaving}
            onPress={form.selectNone}
            style={({ pressed }) => [
              styles.none,
              {
                borderColor: form.none ? s.textStrong : s.surfaceSunken,
                backgroundColor: pressed ? s.surfacePressed : s.surfaceSunken,
              },
            ]}
          >
            <V2Text
              style={[styles.option, styles.noneLabel]}
              color={s.textStrong}
            >
              {t("home.recordPage.edema.none")}
            </V2Text>
            <Ionicons
              accessible={false}
              name={form.none ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={form.none ? s.brand : s.placeholder}
            />
          </Pressable>
        </View>
        <V2Disclosure open={!form.none}>
          <View style={styles.details}>
            <View style={styles.parts}>
              {EDEMA_PARTS.map((part) => {
                const selected = form.part === part
                const recorded = form.observations.some(
                  (item) => item.part === part,
                )
                return (
                  <Pressable
                    key={part}
                    accessibilityRole="tab"
                    accessibilityLabel={`${t(`home.recordPage.edema.part.${part}`)}${recorded ? `, ${t("home.recordPage.edema.entered")}` : ""}`}
                    accessibilityState={{
                      selected,
                      disabled: form.save.isSaving,
                    }}
                    disabled={form.save.isSaving}
                    onPress={() => form.selectPart(part)}
                    style={({ pressed }) => [
                      styles.part,
                      { width: fontScale > 1.2 ? "47%" : "31%" },
                      {
                        borderColor: selected ? s.textStrong : s.surfaceSunken,
                        backgroundColor: pressed
                          ? s.surfacePressed
                          : s.surfaceSunken,
                      },
                    ]}
                  >
                    <V2Text
                      style={styles.option}
                      color={selected ? s.textStrong : recordFieldLabel(s)}
                    >
                      {t(`home.recordPage.edema.part.${part}`)}
                    </V2Text>
                    <Ionicons
                      accessible={false}
                      style={[styles.partCheck, { opacity: recorded ? 1 : 0 }]}
                      name="checkmark"
                      size={14}
                      color={s.brand}
                    />
                  </Pressable>
                )
              })}
            </View>
            <V2Disclosure open={form.part !== null}>
              <View style={styles.observation}>
                <View style={styles.group}>
                  <V2Text style={styles.label} color={s.textStrong}>
                    {form.part
                      ? t("home.recordPage.edema.degree", {
                          part: t(`home.recordPage.edema.part.${form.part}`),
                        })
                      : t("home.recordPage.edema.degreeLabel")}
                  </V2Text>
                  <RecordChoices
                    value={
                      degreeDisabled ? null : (form.current?.level ?? null)
                    }
                    disabled={degreeDisabled}
                    onChange={form.setLevel}
                    options={EDEMA_OPTIONS.filter(
                      (value) => value !== "NONE",
                    ).map((value) => ({
                      value,
                      label: t(`home.recordPage.edema.level.${value}`),
                    }))}
                  />
                </View>
                <V2Disclosure
                  open={!!form.current && form.current.level !== "NONE"}
                >
                  <View style={styles.pitting}>
                    <View style={styles.group}>
                      <V2Text style={styles.label} color={s.textStrong}>
                        {t("home.recordPage.edema.pitting")}
                      </V2Text>
                      <V2Text style={styles.hint} color={s.text}>
                        {t("home.recordPage.edema.pittingHint")}
                      </V2Text>
                      <RecordChoices
                        value={
                          pittingDisabled
                            ? null
                            : form.current?.pitting === null
                              ? "UNKNOWN"
                              : form.current?.pitting
                                ? "YES"
                                : "NO"
                        }
                        disabled={pittingDisabled}
                        onChange={(value) =>
                          form.setPitting(
                            value === "UNKNOWN" ? null : value === "YES",
                          )
                        }
                        options={(["YES", "NO", "UNKNOWN"] as const).map(
                          (value) => ({
                            value,
                            label: t(`home.recordPage.edema.mark.${value}`),
                          }),
                        )}
                      />
                    </View>
                  </View>
                </V2Disclosure>
              </View>
            </V2Disclosure>
            {form.observations.length > 0 && (
              <View style={styles.summary}>
                <V2Text style={styles.label} color={s.textStrong}>
                  {t("home.recordPage.edema.summary")}
                </V2Text>
                {form.observations.map((item) => (
                  <View
                    key={item.part}
                    style={[
                      styles.summaryRow,
                      { borderBottomColor: s.hairline },
                    ]}
                  >
                    <V2Text style={styles.body} color={s.text}>
                      {t(`home.recordPage.edema.part.${item.part}`)}
                    </V2Text>
                    <View style={styles.summaryValue}>
                      <V2Text style={styles.option} color={s.textStrong}>
                        {t(`home.recordPage.edema.level.${item.level}`)}
                      </V2Text>
                      {item.level !== "NONE" && (
                        <V2Text style={styles.hint} color={s.text}>
                          {t(
                            `home.recordPage.edema.mark.${item.pitting === null ? "UNKNOWN" : item.pitting ? "YES" : "NO"}`,
                          )}
                        </V2Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </V2Disclosure>
        {(previous || form.storedLevel) && (
          <View style={[styles.history, { borderTopColor: s.hairline }]}>
            <V2Text style={styles.label} color={s.textStrong}>
              {t("home.recordPage.history")}
            </V2Text>
            {[
              { recordDate: params.date, edemaLevel: form.storedLevel },
              params.previous,
            ].map((row) => {
              const level = normalizeEdemaLevel(row?.edemaLevel)
              return row && level ? (
                <View key={row.recordDate} style={styles.historyRow}>
                  <V2Text style={styles.body} color={s.text}>
                    {row.recordDate.replace(/-/gu, ".")}
                  </V2Text>
                  <V2Text style={styles.option} color={s.textStrong}>
                    {t(`home.recordPage.edema.level.${level}`)}
                  </V2Text>
                </View>
              ) : null
            })}
          </View>
        )}
      </View>
    </RecordPageShell>
  )
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: PAGE_X },
  details: { paddingTop: FORM.labelGap },
  observation: { paddingTop: FORM.sectionGap },
  pitting: { paddingTop: FORM.sectionGap },
  summary: { gap: FORM.labelGap, paddingTop: FORM.sectionGap },
  group: { gap: FORM.labelGap },
  label: FORM.label,
  hint: FORM.hint,
  body: FORM.body,
  option: FORM.option,
  noneLabel: { flex: 1, marginRight: S[3] },
  none: {
    minHeight: FORM.choiceHeight + S[2],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: S[4],
    borderRadius: FORM.choiceRadius,
    borderWidth: 1,
  },
  parts: { flexDirection: "row", flexWrap: "wrap", gap: S[2] },
  part: {
    flexGrow: 1,
    minHeight: FORM.choiceHeight + S[2],
    padding: S[3],
    borderWidth: 1,
    borderRadius: FORM.choiceRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S[1],
  },
  partCheck: { position: "absolute", right: S[2] },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: S[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryValue: { alignItems: "flex-end" },
  history: {
    marginTop: FORM.sectionGap,
    paddingTop: S[5],
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: S[3],
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: S[3],
  },
})
