import type { TermItem } from "../types"

export const TERMS: TermItem[] = [
  {
    id: "service",
    label: "서비스 이용약관 동의",
    required: true,
    url: "",
  },
  {
    id: "privacy",
    label: "개인정보 수집 및 이용 동의",
    required: true,
    url: "",
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신 동의",
    required: false,
  },
]
