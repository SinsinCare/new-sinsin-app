import type { DateAnalysisBloodGlucoseRecord } from "@/src/types"
import type {
  GlucoseElapsed,
  GlucoseTiming,
} from "../data/bloodMetricsConstants"

export type BloodGlucoseDraft = Partial<
  Record<GlucoseTiming, { value: string; elapsed: GlucoseElapsed }>
>

export function buildBloodGlucoseDraftFromAnalysis(
  records: DateAnalysisBloodGlucoseRecord[],
): BloodGlucoseDraft {
  return Object.fromEntries(
    records.map((record) => [
      record.timing,
      {
        value: String(record.value),
        elapsed: record.elapsed ?? "2H",
      },
    ]),
  ) as BloodGlucoseDraft
}

export function mergeBloodGlucoseDraftFromAnalysis(
  records: DateAnalysisBloodGlucoseRecord[],
  currentDraft: BloodGlucoseDraft,
  { isNewDate }: { isNewDate: boolean },
): BloodGlucoseDraft {
  const serverDraft = buildBloodGlucoseDraftFromAnalysis(records)

  if (isNewDate) {
    return serverDraft
  }

  return {
    ...serverDraft,
    ...currentDraft,
  }
}

export function getInitialGlucoseTiming(
  draft: BloodGlucoseDraft,
): GlucoseTiming {
  return (
    (["FASTING", "BEFORE_MEAL", "AFTER_MEAL"] as GlucoseTiming[]).find(
      (option) => draft[option]?.value,
    ) ?? "FASTING"
  )
}
