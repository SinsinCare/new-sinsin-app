import type { ConsultAction, ConsultActivity } from "@/src/types/chat"

const readActions = new Set(["profile", "intake", "recipes", "recipe"])
type ProgressHeadline =
  | `consult.activity.${ConsultAction | "waiting"}`
  | "consult.answerFailed"
  | "consult.activity.stopped"
  | "consult.activity.partial"
  | "consult.activity.checkedInfo"
  | "consult.activity.finished"

/** Public phases describe the current state; only actual reads belong in receipts. */
export function consultProgress(
  activities: readonly ConsultActivity[],
  active: boolean,
  deliveryState?: "failed" | "stopped",
  answerStarted = false,
) {
  const latest = [
    ...new Map(activities.map((item) => [item.id, item])).values(),
  ]
  const current = latest.findLast(
    (item) => item.status === "running" && item.action !== "thinking",
  )
  const tools = latest
    .filter((item) => readActions.has(item.action))
    .map((item) =>
      !active && item.status === "running"
        ? {
            ...item,
            status:
              deliveryState === "failed"
                ? ("error" as const)
                : ("stopped" as const),
          }
        : item,
    )
  const headlineKey: ProgressHeadline = active
    ? answerStarted
      ? "consult.activity.answer"
      : `consult.activity.${current?.action ?? (tools.length ? "answer" : "waiting")}`
    : deliveryState === "failed"
      ? "consult.answerFailed"
      : deliveryState === "stopped" ||
          tools.some((item) => item.status === "stopped")
        ? "consult.activity.stopped"
        : tools.some((item) => item.status === "error")
          ? "consult.activity.partial"
          : tools.length
            ? "consult.activity.checkedInfo"
            : "consult.activity.finished"
  return { tools, headlineKey, canExpand: tools.length > 0 }
}
