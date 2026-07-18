// t() 키 자동완성/타입체크 — 신규 작업자가 존재하는 키를 IDE에서 바로 확인 가능.
// 네임스페이스 추가 시 resources에 해당 json 타입을 등록.
import "i18next"

import type common from "./locales/ko/common.json"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common"
    resources: {
      common: typeof common
    }
  }
}
