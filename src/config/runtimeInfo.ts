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

function resolveBuildNumber(platform: MobilePolicyPlatform): number {
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
