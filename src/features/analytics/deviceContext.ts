/**
 * 이벤트에 붙는 기기·앱 컨텍스트.
 *
 * expo-device 는 설치돼 있지 않다(네이티브 모듈 추가 = 재빌드 사이클) — JS 로 닿는
 * 범위만 담는다. iOS 는 세부 모델명을 JS 만으로 못 얻으므로 "iPhone"/"iPad" 수준이고,
 * `Constants.deviceName` 은 **쓰지 않는다**(사용자가 지은 기기 이름 = PII).
 */
import { Platform } from "react-native"
import Constants from "expo-constants"
import { getLocales } from "expo-localization"
import { appConfig } from "@/src/config/appConfig"

export interface AnalyticsDeviceContext {
  readonly appVersion: string | null
  readonly appBuild: string | null
  readonly osName: string
  readonly osVersion: string
  readonly deviceModel: string | null
  readonly locale: string | null
  readonly appEnv: string
}

let cached: AnalyticsDeviceContext | null = null

function androidModel(): string | null {
  const constants = Platform.constants as { Model?: string } | undefined
  return typeof constants?.Model === "string" ? constants.Model : null
}

export function getDeviceContext(): AnalyticsDeviceContext {
  if (cached) return cached
  cached = {
    appVersion: Constants.expoConfig?.version ?? null,
    appBuild:
      typeof Constants.expoConfig?.ios?.buildNumber === "string"
        ? Constants.expoConfig.ios.buildNumber
        : (Constants.expoConfig?.android?.versionCode?.toString() ?? null),
    osName: Platform.OS,
    osVersion: String(Platform.Version),
    deviceModel:
      Platform.OS === "android"
        ? androidModel()
        : Platform.OS === "ios" && Platform.isPad
          ? "iPad"
          : "iPhone",
    locale: getLocales()[0]?.languageTag ?? null,
    appEnv: appConfig.appEnvironment,
  }
  return cached
}
