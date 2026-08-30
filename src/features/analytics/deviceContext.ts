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
import { resolveBuildNumber } from "@/src/config/runtimeInfo"

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
  const buildNumber = resolveBuildNumber(
    Platform.OS === "android" ? "android" : "ios",
  )
  cached = {
    appVersion: Constants.expoConfig?.version ?? null,
    /*
      **정책 게이트와 같은 값을 보낸다**(`config/runtimeInfo.ts`). 예전에는 여기서만
      `app.json` 값을 읽었는데, 그 값은 릴리스마다 안 올라가서 1.1.5·1.1.26·1.1.35 가
      전부 `4` 로 들어왔다. 같은 앱이 접근 로그(UA)에는 `56`, 분석에는 `4` 를 남겨서
      "어느 빌드에서 난 일인가" 를 계측만으로 못 정했다(2026-08-30 추적).
      0 은 "못 읽었다" 는 뜻이라 `null` 로 접는다 — 있지도 않은 빌드 0 을 만들지 않는다.
    */
    appBuild: buildNumber > 0 ? String(buildNumber) : null,
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
