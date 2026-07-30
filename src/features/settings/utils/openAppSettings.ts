import { Alert, Linking } from "react-native"
import i18n from "@/src/i18n"

export function showOpenSettingsAlert(title: string, message: string) {
  Alert.alert(title, message, [
    {
      text: i18n.t("shared.cancel", { ns: "settings" }),
      style: "cancel",
    },
    {
      text: i18n.t("shared.openSettings", { ns: "settings" }),
      onPress: () => {
        void Linking.openSettings()
      },
    },
  ])
}
