import * as ImagePicker from "expo-image-picker"
import { Alert, Linking } from "react-native"
import i18n from "@/src/i18n"

interface ImagePickerTrackingOptions {
  onPermissionDenied?: () => void
}

export async function pickImageFromGallery(
  options: ImagePickerTrackingOptions = {},
): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== "granted") {
    options.onPermissionDenied?.()
    return null
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  })

  if (result.canceled || !result.assets[0]) {
    return null
  }

  return result.assets[0].uri
}

// TODO: uri 말고 필요한 인터페이스 뭘까나
export async function pickMultipleImages(
  selectionLimit: number,
): Promise<string[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== "granted") {
    Alert.alert(
      i18n.t("media.permissionTitle", { ns: "recipe" }),
      i18n.t("media.permissionBody", { ns: "recipe" }),
      [
        {
          text: i18n.t("media.notNow", { ns: "recipe" }),
          style: "cancel",
        },
        {
          text: i18n.t("media.openSettings", { ns: "recipe" }),
          onPress: () => {
            void Linking.openSettings()
          },
        },
      ],
    )
    return []
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit,
    quality: 0.8,
  })

  if (result.canceled || !result.assets.length) {
    return []
  }

  return result.assets.map((asset) => asset.uri)
}

export async function takePhoto(
  options: ImagePickerTrackingOptions = {},
): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== "granted") {
    options.onPermissionDenied?.()
    return null
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
  })

  if (result.canceled || !result.assets[0]) {
    return null
  }

  return result.assets[0].uri
}
