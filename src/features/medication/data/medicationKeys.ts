export const medicationKeys = {
  root: (uid: string | number) => ["medication-v2", String(uid)] as const,
  day: (uid: string | number, date: string) =>
    ["medication-v2", String(uid), "day", date] as const,
  plans: (uid: string | number) =>
    ["medication-v2", String(uid), "plans"] as const,
}
