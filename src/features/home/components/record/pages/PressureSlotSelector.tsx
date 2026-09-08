import { useTranslation } from "react-i18next"
import {
  BLOOD_PRESSURE_SLOT_OPTIONS,
  type BloodPressureSlot,
} from "@/src/types/bloodMetrics"
import { RecordChoices } from "./RecordChoices"

export function PressureSlotSelector({
  value,
  onChange,
  disabled,
}: {
  value: Exclude<BloodPressureSlot, "">
  onChange: (value: Exclude<BloodPressureSlot, "">) => void
  disabled: boolean
}) {
  const { t } = useTranslation("common")
  return (
    <RecordChoices
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={BLOOD_PRESSURE_SLOT_OPTIONS.map((option) => ({
        value: option,
        label: t(`home.recordPage.bloodPressure.slot.${option}` as never),
      }))}
    />
  )
}
