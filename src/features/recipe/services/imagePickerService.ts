import * as ImagePicker from "expo-image-picker"
import { Linking } from "react-native"
import i18n from "@/src/i18n"

import { showConfirm } from "@/src/lib/dialog"
import { afterModalTransitions } from "@/src/shared/components/appModalGate"

interface ImagePickerTrackingOptions {
  onPermissionDenied?: () => void
}

export interface PickedImageAsset {
  uri: string
  /** 앨범 원본의 픽셀 크기. 미리보기를 원래 비율로 그리는 데 쓴다. */
  width: number
  height: number
}

/**
 * 권한을 확인하고, 막혀 있으면 **이유와 나갈 길을 말한 뒤** false 를 돌려준다.
 *
 * 안내를 호출부가 아니라 여기서 하는 이유: 예전에는 이 파일의 세 함수 중
 * `pickMultipleImages` 만 안내를 띄우고, 한 장짜리 둘은 조용히 null 을 돌려줬다.
 * 그 둘을 쓰는 곳이 하필 **식사 기록**(앱의 핵심 동작)이라, 권한을 거부한 사용자는
 * 버튼을 눌러도 아무 일도 안 일어나는 화면을 보게 됐다 — 앱의 다른 사진 경로
 * (상담·건강자료·식당 제보·프로필)는 전부 설명하고 설정으로 보내는데 여기만 침묵했다.
 * 안내를 서비스 안에 두면 새 호출부가 생겨도 잊을 수가 없다.
 *
 * 안내를 띄운 뒤 전이가 가라앉기를 기다린다 — 호출부는 대개 이 직후에 자기 시트를
 * 다시 열기 때문에(식사 기록), 다이얼로그가 닫히는 중에 시트가 올라오면 겹친다.
 */
async function ensurePermission(
  kind: "photo" | "camera",
  options: ImagePickerTrackingOptions,
): Promise<boolean> {
  const { status } =
    kind === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status === "granted") return true

  options.onPermissionDenied?.()
  // 키를 `permission.${kind}Title` 로 조립하지 않는다 — 정적으로 못 찾는 키는
  // i18n 존재 보증 테스트가 열거 대상으로 등록하라고 막는다(tests/i18nKeyExistence).
  // 경우가 둘뿐이라 리터럴이 더 짧고, grep 으로도 찾힌다.
  const copy =
    kind === "camera"
      ? {
          title: i18n.t("permission.cameraTitle", { ns: "common" }),
          body: i18n.t("permission.cameraBody", { ns: "common" }),
        }
      : {
          title: i18n.t("permission.photoTitle", { ns: "common" }),
          body: i18n.t("permission.photoBody", { ns: "common" }),
        }
  const confirmed = await showConfirm({
    title: copy.title,
    description: copy.body,
    confirmLabel: i18n.t("permission.openSettings", { ns: "common" }),
    cancelLabel: i18n.t("permission.notNow", { ns: "common" }),
  })
  if (confirmed) void Linking.openSettings()
  await afterModalTransitions()
  return false
}

/**
 * 앨범에서 사진 한 장 — **크기까지** 돌려준다.
 *
 * uri 만 돌려주지 않는 이유는 확인 화면 때문이다. 고른 사진을 크게 보여 주고 시작할지
 * 묻는 화면(MealPhotoConfirmSheet)은 사진을 **원래 비율로** 그려야 한다 — 정해진 틀에
 * 맞춰 잘라 보여 주면 "이 사진이 맞나"를 확인하는 화면이 정작 잘린 부분을 감춘다.
 */
export async function pickImageAssetFromGallery(
  options: ImagePickerTrackingOptions = {},
): Promise<PickedImageAsset | null> {
  if (!(await ensurePermission("photo", options))) return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  })

  const asset = result.canceled ? undefined : result.assets[0]
  if (!asset) {
    return null
  }

  return { uri: asset.uri, width: asset.width, height: asset.height }
}

// TODO: uri 말고 필요한 인터페이스 뭘까나
export async function pickMultipleImages(
  selectionLimit: number,
): Promise<string[]> {
  if (!(await ensurePermission("photo", {}))) return []

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
  if (!(await ensurePermission("camera", options))) return null

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
  })

  if (result.canceled || !result.assets[0]) {
    return null
  }

  return result.assets[0].uri
}
