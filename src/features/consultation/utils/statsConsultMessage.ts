const MARKER = "\n\n[STATS_REPORT_V1]\n"

export interface StatsConsultCardData {
  question: string
  label: string
  startDate: string
  endDate: string
}

/** Versioned envelope survives saved conversation reloads; report facts stay in the prompt. */
export function encodeStatsConsultMessage(
  card: StatsConsultCardData,
  context: string,
): string {
  return `${card.question}${MARKER}${JSON.stringify({ ...card, context })}`
}

export function parseStatsConsultMessage(
  text: string,
): StatsConsultCardData | null {
  const index = text.indexOf(MARKER)
  if (index <= 0) return null
  try {
    const data: unknown = JSON.parse(text.slice(index + MARKER.length))
    if (!data || typeof data !== "object") return null
    const entry = data as Record<string, unknown>
    if (
      !["question", "label", "startDate", "endDate", "context"].every(
        (key) =>
          typeof entry[key] === "string" && (entry[key] as string).trim(),
      )
    )
      return null
    if (entry.question !== text.slice(0, index)) return null
    if (
      ![entry.startDate, entry.endDate].every((date) =>
        /^\d{4}-\d{2}-\d{2}$/.test(String(date)),
      )
    )
      return null
    return {
      question: entry.question as string,
      label: entry.label as string,
      startDate: entry.startDate as string,
      endDate: entry.endDate as string,
    }
  } catch {
    return null
  }
}
