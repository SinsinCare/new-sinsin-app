export type WheelPickerOption = {
  label: string
  value: string
}

export function resolveWheelPickerValue(
  value: string,
  options: readonly WheelPickerOption[],
): string {
  if (options.some((option) => option.value === value)) return value
  return options[0]?.value ?? ""
}

export function getWheelPickerIndex(
  value: string,
  options: readonly WheelPickerOption[],
): number {
  const index = options.findIndex((option) => option.value === value)
  return index >= 0 ? index : 0
}

export function getWheelPickerValueAtOffset(
  offset: number,
  itemHeight: number,
  options: readonly WheelPickerOption[],
): string {
  if (options.length === 0) return ""

  const index = Math.min(
    options.length - 1,
    Math.max(0, Math.round(offset / itemHeight)),
  )
  return options[index].value
}
