export const ACQUISITION_SOURCE_OPTIONS = [
  { label: "앱스토어 검색", value: "APP_STORE" },
  { label: "인스타그램", value: "INSTAGRAM" },
  { label: "유튜브", value: "YOUTUBE" },
  { label: "카카오톡", value: "KAKAO" },
  { label: "블로그", value: "BLOG" },
  { label: "네이버 카페", value: "NAVER_CAFE" },
  { label: "지인 추천", value: "FRIEND" },
  { label: "기타", value: "OTHER" },
] as const

export type AcquisitionSource =
  (typeof ACQUISITION_SOURCE_OPTIONS)[number]["value"]

export type AcquisitionSourceInput = AcquisitionSource | ""
