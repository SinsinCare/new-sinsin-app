// App i18n — react-i18next + expo-localization
// 기기 언어 감지(ko/en) → 미지원 언어면 ko fallback.
// 화면에서: const { t } = useTranslation("common"); t("action.confirm")
// 문자열은 locales/<lang>/<namespace>.json. 리디자인 시 화면별로 한국어 → 키로 이전.
// TODO: 사용자 수동 언어 선택(설정) + AsyncStorage 영속화 (후속).
import { getLocales } from "expo-localization"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enCommon from "./locales/en/common.json"
import koCommon from "./locales/ko/common.json"

export const supportedLanguages = ["ko", "en"] as const
export type Language = (typeof supportedLanguages)[number]

export const defaultNS = "common"

/** 언어별 네임스페이스 리소스. 네임스페이스 추가 시 여기 + i18next.d.ts에 등록. */
export const resources = {
  ko: { common: koCommon },
  en: { common: enCommon },
} as const

function detectLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? "ko"
  return (supportedLanguages as readonly string[]).includes(code)
    ? (code as Language)
    : "ko"
}

// eslint-disable-next-line import/no-named-as-default-member -- i18n 인스턴스의 .use() 체이닝 (named export 아님)
void i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: "ko",
  defaultNS,
  ns: ["common"],
  interpolation: { escapeValue: false }, // RN은 XSS 이스케이프 불필요
  returnNull: false,
})

export default i18n
