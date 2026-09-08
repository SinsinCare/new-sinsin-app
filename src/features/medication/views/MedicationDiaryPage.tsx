import { Pressable, View } from "react-native"
import { router } from "expo-router"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import {
  V2Button,
  V2DotLoader,
  V2ErrorState,
  V2Text,
} from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { RecordPageShell } from "@/src/features/home/components/record/pages/RecordPageShell"
import { useMedicationDiary } from "../hooks/useMedicationDiary"
import { useMedicationPlanActions } from "../hooks/useMedicationPlanActions"
import { MedicationSlotTabs } from "../components/MedicationSlotTabs"
import { MedicationDoseRow } from "../components/MedicationDoseRow"
import { medStyles as styles, FORM, S } from "../components/medicationStyles"
import { useMedicationFlowStore } from "../stores/medicationFlowStore"
import type { Slot } from "../types"
export function MedicationDiaryPage({
  date,
  onBack,
  preferred,
  shifted = false,
}: {
  date: string
  onBack: () => void
  preferred?: Slot
  /** 새벽 4시 전이라 전날 자기전으로 열었다(EX-10). 조용히 바꾸지 않고 알린다. */
  shifted?: boolean
}) {
  const { t } = useTranslation("medication"),
    s = useSurface(),
    form = useMedicationDiary(date, onBack, preferred),
    actions = useMedicationPlanActions()
  const day = form.base,
    items = day?.occurrences.filter((o) => o.slot === form.slot) ?? []
  const checked = items.filter((o) => form.draft[o.key] ?? o.taken).length
  const empty = !!day && day.occurrences.length === 0
  // 등록한 약은 있는데 전부 일시중지면 "약부터 등록하세요" 는 틀린 안내다(DEF-16).
  const pausedOnly =
    empty &&
    !!day &&
    day.plans.some((p) => p.status === "PAUSED") &&
    !day.plans.some((p) => p.status === "ACTIVE")
  const add = () => {
    useMedicationFlowStore.getState().start(date)
    router.push("/medication/add")
  }
  return (
    <RecordPageShell
      title={t("title")}
      subtitle={date.replace(/-/g, ".")}
      intro={t("intro")}
      onBack={onBack}
      keyboardEnabled={false}
      ctaLabel={empty ? t("add") : t("save")}
      ctaDisabled={
        empty
          ? date > (day?.today ?? date)
          : !form.dirty || !day || date > day.today
      }
      ctaLoading={form.save.isSaving}
      ctaSuccess={form.save.saved}
      onCtaPress={empty ? add : () => void form.submit()}
    >
      <View style={styles.body}>
        {!day ? (
          form.query.isError ? (
            <V2ErrorState
              surface="home_medication"
              tone="quiet"
              title={t("loadError")}
              retryLabel={t("reload")}
              onRetry={() => void form.reload()}
            />
          ) : (
            <View style={[styles.empty, { minHeight: 300 }]}>
              <V2DotLoader />
            </View>
          )
        ) : (
          <>
            <View
              style={[
                styles.row,
                { justifyContent: "space-between", flexWrap: "wrap" },
              ]}
            >
              <View style={{ gap: S[1] }}>
                <V2Text style={FORM.hint} color={s.text}>
                  {t(date === day.today ? "total" : "totalDate")}
                </V2Text>
                <V2Text style={FORM.label} color={s.textStrong}>
                  {day.planned > 0
                    ? t("progressLine", {
                        taken: day.taken,
                        planned: day.planned,
                      })
                    : t("takenOnlyLine", { count: day.taken })}
                </V2Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/medication/manage")}
                style={styles.action}
              >
                <View style={[styles.row, { gap: 2 }]}>
                  <V2Text style={FORM.hint} color={s.textStrong}>
                    {t("manage")}
                  </V2Text>
                  <Ionicons
                    accessible={false}
                    name="chevron-forward"
                    size={14}
                    color={s.textStrong}
                  />
                </View>
              </Pressable>
            </View>
            {!empty ? (
              <MedicationSlotTabs
                day={day}
                draft={form.draft}
                value={form.slot}
                onChange={form.setSlot}
                disabled={form.save.isSaving}
              />
            ) : null}
            {shifted ? (
              <View style={[styles.note, { backgroundColor: s.surfaceSunken }]}>
                <V2Text style={FORM.hint} color={s.text}>
                  {t("bedtimeShifted")}
                </V2Text>
              </View>
            ) : date !== day.today ? (
              <View style={[styles.note, { backgroundColor: s.surfaceSunken }]}>
                <V2Text style={FORM.hint} color={s.text}>
                  {t(date > day.today ? "future" : "past")}
                </V2Text>
              </View>
            ) : null}
            {form.error ? (
              <View
                accessibilityRole="alert"
                style={[styles.note, { backgroundColor: s.surfaceSunken }]}
              >
                <V2Text style={FORM.hint} color={s.danger}>
                  {form.error}
                </V2Text>
                {form.conflict ? (
                  <V2Button
                    multilineLabel
                    color="neutral"
                    variant="weak"
                    size="m"
                    onPress={() => void form.reload()}
                  >
                    {t("reload")}
                  </V2Button>
                ) : null}
              </View>
            ) : null}
            {empty ? (
              <View style={[styles.empty, { paddingVertical: S[8] }]}>
                <View
                  style={[styles.card, { backgroundColor: s.surfaceSunken }]}
                >
                  <Ionicons
                    accessible={false}
                    name="medical-outline"
                    size={32}
                    color={s.brand}
                  />
                </View>
                <V2Text style={FORM.label} color={s.textStrong}>
                  {t(pausedOnly ? "pausedOnlyTitle" : "emptyTitle")}
                </V2Text>
                <V2Text style={[FORM.body, styles.center]} color={s.text}>
                  {t(pausedOnly ? "pausedOnlyBody" : "emptyBody")}
                </V2Text>
                {pausedOnly ? (
                  <V2Button
                    multilineLabel
                    color="neutral"
                    variant="weak"
                    onPress={() => router.push("/medication/manage")}
                  >
                    {t("manage")}
                  </V2Button>
                ) : null}
              </View>
            ) : (
              <View>
                <View
                  style={[
                    styles.row,
                    { justifyContent: "space-between", flexWrap: "wrap" },
                  ]}
                >
                  <View style={styles.section}>
                    <V2Text style={FORM.label} color={s.textStrong}>
                      {t("slotTitle", { slot: t(`slots.${form.slot}`) })}
                    </V2Text>
                    <V2Text
                      accessibilityLiveRegion="polite"
                      style={FORM.hint}
                      color={s.text}
                    >
                      {t("selection", { total: items.length, taken: checked })}
                    </V2Text>
                  </View>
                  {items.length ? (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={t(
                        checked === items.length ? "clearAll" : "selectAll",
                      )}
                      accessibilityState={{
                        checked: checked === items.length,
                        disabled: form.save.isSaving || date > day.today,
                      }}
                      disabled={form.save.isSaving || date > day.today}
                      style={styles.action}
                      onPress={form.toggleAll}
                    >
                      <V2Text style={FORM.hint} color={s.textStrong}>
                        {t(checked === items.length ? "clearAll" : "selectAll")}
                      </V2Text>
                    </Pressable>
                  ) : null}
                </View>
                {items.length ? (
                  items.map((item) => (
                    <MedicationDoseRow
                      key={item.key}
                      item={item}
                      checked={form.draft[item.key] ?? item.taken}
                      disabled={
                        form.save.isSaving || actions.busy || date > day.today
                      }
                      onToggle={() => form.toggle(item.key)}
                      onMore={() => void actions.open(item.plan, day.plans)}
                    />
                  ))
                ) : (
                  <View style={styles.empty}>
                    <V2Text style={FORM.body} color={s.text}>
                      {t("slotEmpty")}
                    </V2Text>
                  </View>
                )}
                <V2Button
                  multilineLabel
                  color="neutral"
                  variant="weak"
                  size="l"
                  fullWidth
                  onPress={add}
                  disabled={form.save.isSaving || date > day.today}
                  style={{ marginTop: S[5] }}
                >
                  {t("add")}
                </V2Button>
              </View>
            )}
            {form.changes ? (
              <V2Text style={FORM.hint} color={s.text}>
                {t("pending", { count: form.changes })}
              </V2Text>
            ) : null}
            {day.legacyTaken > 0 ? (
              <V2Text style={FORM.hint} color={s.text}>
                {t("legacy", { count: day.legacyTaken })}
              </V2Text>
            ) : null}
          </>
        )}
      </View>
    </RecordPageShell>
  )
}
