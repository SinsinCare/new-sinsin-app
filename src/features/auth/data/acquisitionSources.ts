import type { AcquisitionSource } from "@/src/types"

export const ACQUISITION_SOURCE_OPTIONS = [
  { label: "앱스토어 검색", value: "APP_STORE" },
  { label: "병원", value: "HOSPITAL" },
  { label: "블로그", value: "BLOG" },
  { label: "네이버 카페", value: "NAVER_CAFE" },
  { label: "당근 커뮤니티", value: "DANGGEUN_COMMUNITY" },
  { label: "카카오톡", value: "KAKAO" },
  { label: "유튜브", value: "YOUTUBE" },
  { label: "인스타그램", value: "INSTAGRAM" },
  { label: "지인추천", value: "FRIEND" },
  { label: "기타(직접 입력)", value: "OTHER" },
] as const satisfies readonly { label: string; value: AcquisitionSource }[]

export type AcquisitionSourceInput = AcquisitionSource | ""
