const pad = (n: number) => String(n).padStart(2, "0")

export const toDateStr = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
