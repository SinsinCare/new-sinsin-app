import Constants from "expo-constants"
import * as Application from "expo-application"
import { Platform } from "react-native"

import { getBackendUrl } from "./appConfig"
import { resolveMobilePolicyEnvironment } from "./mobilePolicyEnvironment"
import type {
  MobilePolicyPlatform,
  MobilePolicyRuntimeInfo,
} from "@/src/features/mobilePolicy/types"

const API_CONTRACT_VERSION = 1

function resolvePlatform(): MobilePolicyPlatform {
  return Platform.OS === "android" ? "android" : "ios"
}

/**
 * **네이티브가 먼저다.** `app.json` 의 `ios.buildNumber`·`android.versionCode` 는
 * 릴리스마다 손으로 올리지 않아서 여러 버전이 같은 값으로 굳는다(실측: 1.1.5·1.1.26·
 * 1.1.35 가 전부 `4`). EAS 가 빌드할 때 붙이는 진짜 번호는 `Application.nativeBuildVersion`
 * 에만 있다. 분석 컨텍스트도 이 함수를 쓴다 — 두 곳이 다른 값을 보내면 로그의 빌드와
 * DB 의 빌드가 갈리고, 그 상태로는 "어느 빌드에서 난 일인가" 를 못 정한다(2026-08-30).
 */
export function resolveBuildNumber(platform: MobilePolicyPlatform): number {
  const nativeBuildVersion = Number(Application.nativeBuildVersion)
  if (Number.isFinite(nativeBuildVersion) && nativeBuildVersion > 0) {
    return nativeBuildVersion
  }

  const expoConfig = Constants.expoConfig
  const configBuildNumber =
    platform === "ios"
      ? Number(expoConfig?.ios?.buildNumber)
      : Number(expoConfig?.android?.versionCode)

  return Number.isFinite(configBuildNumber) && configBuildNumber > 0
    ? configBuildNumber
    : 0
}

export function getMobilePolicyRuntimeInfo(): MobilePolicyRuntimeInfo {
  const platform = resolvePlatform()
  const backendUrl = getBackendUrl()

  return {
    platform,
    environment: resolveMobilePolicyEnvironment({
      explicitEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
      backendUrl,
    }),
    appVersion:
      Application.nativeApplicationVersion ??
      Constants.expoConfig?.version ??
      "0.0.0",
    buildNumber: resolveBuildNumber(platform),
    apiContractVersion: API_CONTRACT_VERSION,
  }
}
