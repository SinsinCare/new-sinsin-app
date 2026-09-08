// App i18n — react-i18next + expo-localization
// 첫 실행은 기기 언어를 따르고, 이후에는 설정에서 고른 언어를 유지한다.
// 화면에서: const { t } = useTranslation("common"); t("action.confirm")
// 문자열은 locales/<lang>/<namespace>.json. 리디자인 시 화면별로 한국어 → 키로 이전.
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getLocales } from "expo-localization"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enAuth from "./locales/en/auth.json"
import enBilling from "./locales/en/billing.json"
import enCommon from "./locales/en/common.json"
import enErrors from "./locales/en/errors.json"
import enMedication from "./locales/en/medication.json"
import koMedication from "./locales/ko/medication.json"
import enHealth from "./locales/en/health.json"
import enRecipe from "./locales/en/recipe.json"
import enSettings from "./locales/en/settings.json"
import koAuth from "./locales/ko/auth.json"
import koBilling from "./locales/ko/billing.json"
import koCommon from "./locales/ko/common.json"
import koErrors from "./locales/ko/errors.json"
import koHealth from "./locales/ko/health.json"
import koRecipe from "./locales/ko/recipe.json"
import koSettings from "./locales/ko/settings.json"

export const supportedLanguages = ["ko", "en"] as const
export type Language = (typeof supportedLanguages)[number]

export const defaultNS = "common"
const LANGUAGE_STORAGE_KEY = "sinsin:language"

/** 언어별 네임스페이스 리소스. 네임스페이스 추가 시 여기 + i18next.d.ts에 등록. */
export const resources = {
  ko: {
    auth: koAuth,
    billing: koBilling,
    common: koCommon,
    errors: koErrors,
    health: koHealth,
    medication: koMedication,
    recipe: koRecipe,
    settings: koSettings,
  },
  en: {
    auth: enAuth,
    billing: enBilling,
    common: enCommon,
    errors: enErrors,
    health: enHealth,
    medication: enMedication,
    recipe: enRecipe,
    settings: enSettings,
  },
} as const

function detectLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? "ko"
  return (supportedLanguages as readonly string[]).includes(code)
    ? (code as Language)
    : "ko"
}

export function normalizeLanguage(value: string | null | undefined): Language {
  return value?.toLowerCase().startsWith("en") ? "en" : "ko"
}

// eslint-disable-next-line import/no-named-as-default-member -- i18n 인스턴스의 .use() 체이닝 (named export 아님)
void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: "ko",
  defaultNS,
  ns: ["auth", "billing", "common", "errors", "health", "medication", "recipe", "settings"],
  interpolation: { escapeValue: false }, // RN은 XSS 이스케이프 불필요
  returnNull: false,
})

export function getAppLanguage(): Language {
  return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
}

export async function setAppLanguage(language: Language): Promise<void> {
  const previousLanguage = getAppLanguage()
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  try {
    await i18n.changeLanguage(language)
  } catch (error) {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, previousLanguage).catch(
      () => {
        // 원래 언어 복구 저장까지 실패해도 최초 오류를 그대로 전달한다.
      },
    )
    throw error
  }
}

async function restoreLanguagePreference(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (stored === "ko" || stored === "en") {
    await i18n.changeLanguage(stored)
  }
}

/**
 * 저장된 언어가 적용될 때까지의 약속. **첫 렌더와 첫 API 호출 전에 기다린다.**
 *
 * init 은 기기 언어로 먼저 뜨고 저장값은 AsyncStorage 라 한 박자 늦게 온다.
 * 그 사이에 화면이 그려지면 기기 언어로 한 프레임이 보였다가 바뀌고, 더 나쁘게는
 * 그 사이 나간 요청이 기기 언어로 `Accept-Language` 를 실어 보낸다 — 서버는
 * 그 언어로 리포트를 만들고, 뒤이어 저장 언어로 또 만든다. 리로드마다 리포트를
 * 두 번 생성하던 원인이었다.
 */
export const languageReady: Promise<void> = restoreLanguagePreference().catch(
  () => {
    // 저장값을 못 읽으면 기기 언어로 간다. 여기서 앱을 막지는 않는다.
  },
)

export default i18n
