// t() 키 자동완성/타입체크 — 신규 작업자가 존재하는 키를 IDE에서 바로 확인 가능.
// 네임스페이스 추가 시 resources에 해당 json 타입을 등록.
import "i18next"

import type auth from "./locales/ko/auth.json"
import type billing from "./locales/ko/billing.json"
import type common from "./locales/ko/common.json"
import type errors from "./locales/ko/errors.json"
import type health from "./locales/ko/health.json"
import type recipe from "./locales/ko/recipe.json"
import type settings from "./locales/ko/settings.json"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common"
    resources: {
      auth: typeof auth
      billing: typeof billing
      common: typeof common
      errors: typeof errors
      health: typeof health
      recipe: typeof recipe
      settings: typeof settings
    }
  }
}
