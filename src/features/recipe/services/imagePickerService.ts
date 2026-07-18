import * as ImagePicker from "expo-image-picker"

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
