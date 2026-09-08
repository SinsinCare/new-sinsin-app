import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { Linking, View, Pressable } from "react-native"
import { showActionSheet } from "@/src/lib/dialog"
import { useTranslation } from "react-i18next"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Button, V2Text } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { useGoBack } from "@/src/shared/navigation"
import { RecordPageShell } from "@/src/features/home/components/record/pages/RecordPageShell"
import { MedicationChoice } from "../components/MedicationChoice"
import { MedicationReminderSettings } from "../components/MedicationReminderSettings"
import { MedicationProduct } from "../components/MedicationProduct"
import { medStyles, FORM } from "../components/medicationStyles"
import { useMedicationEditor } from "../hooks/useMedicationEditor"
import { SLOTS, TIMINGS, UNITS } from "../types"
export function MedicationEditorScreen() {
  const { t } = useTranslation("medication"),
    s = useSurface(),
    back = useGoBack("/medication/add"),
    form = useMedicationEditor(back)
  const disabled = form.save.isSaving || form.permissionBusy
  return (
    <RecordPageShell
      title={t("editorTitle")}
      navigationTitle={t(form.existing ? "editTitle" : "addTitle")}
      intro={t("editorIntro")}
      onBack={back}
      ctaLabel={t(form.existing ? "update" : "register")}
      ctaDisabled={
        !form.valid || form.permissionBusy || (!!form.existing && !form.dirty)
      }
      ctaLoading={disabled}
      ctaSuccess={form.save.saved}
      onCtaPress={() => void form.submit()}
    >
      <View style={medStyles.body}>
        {form.drug ? (
          <MedicationProduct drug={form.drug} />
        ) : (
          <View style={medStyles.section}>
            <V2Text style={FORM.label} color={s.textStrong}>
              {t("name")}
            </V2Text>
            <TextInput
              value={form.plan.name}
              onChangeText={(name) => form.set({ name })}
              maxLength={120}
              editable={!disabled}
              accessibilityLabel={t("name")}
              placeholder={t("namePlaceholder")}
              placeholderTextColor={s.textMuted}
              style={[
                medStyles.field,
                { backgroundColor: s.surfaceSunken, color: s.textStrong },
              ]}
              returnKeyType="next"
            />
          </View>
        )}
        <View style={medStyles.section}>
          <V2Text style={FORM.label} color={s.textStrong}>
            {t("when")}
          </V2Text>
          <V2Text style={FORM.hint} color={s.text}>
            {t("whenHint")}
          </V2Text>
          <View style={medStyles.wrap}>
            {SLOTS.map((slot) => (
              <MedicationChoice
                key={slot}
                label={t(`slots.${slot}`)}
                selected={form.plan.slots.includes(slot)}
                disabled={disabled}
                onPress={() => form.toggleSlot(slot)}
              />
            ))}
          </View>
        </View>
        <MedicationReminderSettings
          plan={form.plan}
          confirmed={form.confirmedTimes}
          taken={form.takenSlots}
          takenDate={form.takenDate}
          disabled={disabled || form.permissionBusy}
          permission={form.reminderPermission.permission}
          onToggle={form.reminder}
          onTime={form.setReminderTime}
          onSettings={form.reminderPermission.openSettings}
        />
        <View style={medStyles.section}>
          <V2Text style={FORM.label} color={s.textStrong}>
            {t("dose")}
          </V2Text>
          <View style={medStyles.row}>
            <TextInput
              value={form.amount}
              onChangeText={form.setAmount}
              editable={!disabled}
              keyboardType="decimal-pad"
              maxLength={8}
              accessibilityLabel={t("dose")}
              placeholder={t("dosePlaceholder")}
              placeholderTextColor={s.textMuted}
              style={[
                medStyles.field,
                {
                  flex: 1,
                  backgroundColor: s.surfaceSunken,
                  color: s.textStrong,
                },
              ]}
            />
            <Pressable
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t("unit")}
              style={[
                medStyles.field,
                {
                  minWidth: 112,
                  backgroundColor: s.surfaceSunken,
                  justifyContent: "center",
                },
              ]}
              onPress={() =>
                void showActionSheet({
                  title: t("unit"),
                  actions: UNITS.map((unit) => ({ label: t(`units.${unit}`) })),
                  cancelLabel: t("cancel"),
                }).then((index) => {
                  if (index === null) return
                  const unit = UNITS[index]
                  if (unit) {
                    form.set({ unit })
                    form.setUnitChosen(true)
                  }
                })
              }
            >
              <View style={[medStyles.row, { gap: 4 }]}>
                <V2Text
                  style={FORM.option}
                  color={form.unitChosen ? s.textStrong : s.text}
                >
                  {form.unitChosen ? t(`units.${form.plan.unit}`) : t("unit")}
                </V2Text>
                <Ionicons
                  accessible={false}
                  name="chevron-down"
                  size={16}
                  color={s.text}
                />
              </View>
            </Pressable>
          </View>
          <V2Text style={FORM.hint} color={s.text}>
            {t("doseHint")}
          </V2Text>
        </View>
        <View style={medStyles.section}>
          <V2Text style={FORM.label} color={s.textStrong}>
            {t("timing")}
          </V2Text>
          <V2Text style={FORM.hint} color={s.text}>
            {t("timingHint")}
          </V2Text>
          <View style={medStyles.wrap}>
            {TIMINGS.map((timing) => (
              <MedicationChoice
                role="radio"
                key={timing}
                label={t(`timings.${timing}`)}
                selected={form.plan.timing === timing}
                disabled={disabled}
                onPress={() => form.set({ timing })}
              />
            ))}
          </View>
        </View>
        {form.drug?.guide ? (
          <View style={[medStyles.note, { backgroundColor: s.surfaceSunken }]}>
            <V2Text style={FORM.option} color={s.textStrong}>
              {t("guide")}
            </V2Text>
            <V2Text style={FORM.body} color={s.text}>
              {form.drug.guide.text}
            </V2Text>
            <V2Text
              style={FORM.hint}
              color={s.text}
              onPress={() => void Linking.openURL(form.drug!.guide!.sourceUrl)}
            >
              {t("source", { name: form.drug.guide.reviewedBy })}
            </V2Text>
          </View>
        ) : null}
        {form.error ? (
          <View accessibilityRole="alert" style={medStyles.section}>
            <V2Text style={FORM.hint} color={s.danger}>
              {form.error}
            </V2Text>
            {form.conflict ? (
              <V2Button
                multilineLabel
                color="neutral"
                variant="weak"
                size="m"
                onPress={() => void form.reloadExisting()}
              >
                {t("conflictReload")}
              </V2Button>
            ) : null}
          </View>
        ) : !form.valid ? (
          <V2Text style={FORM.hint} color={s.text}>
            {t(
              form.plan.reminder &&
                form.plan.slots.some(
                  (slot) => !form.confirmedTimes.includes(slot),
                )
                ? "reminderScheduleNeeded"
                : "requiredHint",
            )}
          </V2Text>
        ) : null}
      </View>
    </RecordPageShell>
  )
}
