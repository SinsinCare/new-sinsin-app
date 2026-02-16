interface PickerOption {
  label: string
  value: string
}

export function generateYearOptions(): PickerOption[] {
  const currentYear = new Date().getFullYear()
  const options: PickerOption[] = []
  for (let y = currentYear; y >= 1920; y--) {
    options.push({ label: `${y}년`, value: String(y) })
  }
  return options
}

export function generateMonthOptions(): PickerOption[] {
  return Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}월`,
    value: String(i + 1).padStart(2, "0"),
  }))
}

export function generateDayOptions(
  year: string,
  month: string,
): PickerOption[] {
  if (!year || !month) {
    return Array.from({ length: 31 }, (_, i) => ({
      label: `${i + 1}일`,
      value: String(i + 1).padStart(2, "0"),
    }))
  }
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => ({
    label: `${i + 1}일`,
    value: String(i + 1).padStart(2, "0"),
  }))
}
