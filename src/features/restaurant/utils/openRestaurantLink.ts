import { Linking } from "react-native"
import i18n from "@/src/i18n"
import { showErrorToast } from "@/src/lib/toast"

const pending = new Map<string, Promise<boolean>>()
/** Callers supply a validated web/phone target; duplicate taps share one launch. */
export function openRestaurantLink(
  target: string | null,
  kind: "web" | "phone" = "web",
): Promise<boolean> {
  if (!target) return Promise.resolve(false)
  const current = pending.get(target)
  if (current) return current
  const request = Promise.resolve()
    .then(async () => {
      try {
        await Linking.openURL(target)
        return true
      } catch {
        showErrorToast(
          i18n.t(
            kind === "phone"
              ? "restaurant.detail.callFailed"
              : "restaurant.detail.linkFailed",
            { ns: "common" },
          ),
        )
        return false
      }
    })
    .finally(() => pending.delete(target))
  pending.set(target, request)
  return request
}
