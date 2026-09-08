/** Native text/link sharing: one presentation at a time, including modal transitions. */
import { Platform, Share } from "react-native"

import i18n from "@/src/i18n"
import { hapticSelection } from "@/src/lib/haptics"
import { showErrorToast } from "@/src/lib/toast"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"
import { buildSharePayload, type SharePayloadInput } from "./sharePayload"

export { buildSharePayload } from "./sharePayload"

export interface ShareContentInput extends SharePayloadInput {
  readonly scope: string
}

let activeShare: Promise<void> | null = null

/** Repeated taps join the current presentation; they never queue another sheet. */
export function shareContent(input: ShareContentInput): Promise<void> {
  if (activeShare) return activeShare
  activeShare = Promise.resolve()
    .then(async () => {
      try {
        hapticSelection()
        // UIKit cannot present a share controller during another modal transition.
        await afterModalTransitions()
        // Native dismissal resolves with dismissedAction; it is not an error.
        await Share.share(buildSharePayload(input, Platform.OS))
      } catch {
        // Native errors may contain shared text/URLs. Do not log their raw payload.
        showErrorToast(
          i18n.t("shareUi.errorTitle", { ns: "common" }),
          i18n.t("shareUi.errorBody", { ns: "common" }),
        )
      }
    })
    .finally(() => {
      activeShare = null
    })
  return activeShare
}
