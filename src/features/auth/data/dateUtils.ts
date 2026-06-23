interface PickerOption {
  label: string
  value: string
}

export interface BirthDateInputState {
  isValid: boolean
  message: string
  parts: {
    year: string
    month: string
    day: string
  } | null
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

export function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`
}

export function getBirthDateInputState(
  value: string,
  referenceDate = new Date(),
): BirthDateInputState {
  const formatted = formatBirthDateInput(value)
  if (formatted.length < 10) {
    return {
      isValid: false,
      message: "",
      parts: null,
    }
  }

  const [year, month, day] = formatted.split(".")
  const yearNumber = Number(year)
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  const date = new Date(yearNumber, monthNumber - 1, dayNumber)
  const validDate =
    date.getFullYear() === yearNumber &&
    date.getMonth() === monthNumber - 1 &&
    date.getDate() === dayNumber

  if (!validDate || yearNumber < 1900) {
    return {
      isValid: false,
      message: "잘못된 생년월일입니다.",
      parts: null,
    }
  }

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )
  if (date > today) {
    return {
      isValid: false,
      message: "미래 날짜는 입력할 수 없습니다.",
      parts: null,
    }
  }

  return {
    isValid: true,
    message: "",
    parts: { year, month, day },
  }
}
