import { Linking } from "react-native"
import i18n from "@/src/i18n"
import { showConfirm } from "@/src/lib/dialog"

/**
 * 권한이 막혔을 때의 안내. 사용자가 OS 설정으로 나가야 풀리는 상황이라
 * 토스트가 아니라 선택형 다이얼로그다.
 */
export async function showOpenSettingsAlert(title: string, message: string) {
  const confirmed = await showConfirm({
    title,
    description: message,
    confirmLabel: i18n.t("shared.openSettings", { ns: "settings" }),
    cancelLabel: i18n.t("shared.cancel", { ns: "settings" }),
  })
  if (confirmed) void Linking.openSettings()
}
