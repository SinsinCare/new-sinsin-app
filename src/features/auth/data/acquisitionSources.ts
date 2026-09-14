import i18n from "@/src/i18n"
import type { AcquisitionSource } from "@/src/types"

export type AcquisitionSourceInput = AcquisitionSource | ""

const ACQUISITION_SOURCE_LABEL_KEYS: Record<
  AcquisitionSource,
  | "acquisition.appStore"
  | "acquisition.hospital"
  | "acquisition.blog"
  | "acquisition.naverCafe"
  | "acquisition.danggeun"
  | "acquisition.kakao"
  | "acquisition.youtube"
  | "acquisition.instagram"
  | "acquisition.friend"
  | "acquisition.other"
> = {
  APP_STORE: "acquisition.appStore",
  HOSPITAL: "acquisition.hospital",
  BLOG: "acquisition.blog",
  NAVER_CAFE: "acquisition.naverCafe",
  DANGGEUN_COMMUNITY: "acquisition.danggeun",
  KAKAO: "acquisition.kakao",
  YOUTUBE: "acquisition.youtube",
  INSTAGRAM: "acquisition.instagram",
  FRIEND: "acquisition.friend",
  OTHER: "acquisition.other",
}

//: 표시 순서의 정본. 라벨 맵의 키 순서를 그대로 따른다 — 목록을 따로 두면
//: 항목을 추가할 때 한쪽만 고쳐져 조용히 빠진다.
const ACQUISITION_SOURCE_VALUES = Object.keys(
  ACQUISITION_SOURCE_LABEL_KEYS,
) as AcquisitionSource[]

export function getAcquisitionSourceOptions(): {
  label: string
  value: AcquisitionSource
}[] {
  return ACQUISITION_SOURCE_VALUES.map((value) => ({
    value,
    label: i18n.t(ACQUISITION_SOURCE_LABEL_KEYS[value], { ns: "auth" }),
  }))
}
