export const REGIONS = [
  { key: "all", label: "전체" },
  { key: "seoul", label: "서울" },
  { key: "gyeonggi", label: "경기" },
  { key: "incheon", label: "인천" },
  { key: "busan", label: "부산" },
  { key: "jeju", label: "제주" },
  { key: "ulsan", label: "울산" },
  { key: "gyeongnam", label: "경남" },
  { key: "daegu", label: "대구" },
  { key: "gyeongbuk", label: "경북" },
  { key: "gangwon", label: "강원" },
  { key: "daejeon", label: "대전" },
  { key: "chungnam", label: "충남" },
  { key: "chungbuk", label: "충북" },
  { key: "sejong", label: "세종" },
  { key: "jeonnam", label: "전남" },
  { key: "gwangju", label: "광주" },
  { key: "jeonbuk", label: "전북" },
]

export const SUB_REGIONS: Record<string, { key: string; label: string }[]> = {
  seoul: [
    { key: "seoul-all", label: "서울 전체" },
    { key: "gangnam", label: "강남" },
    { key: "seocho", label: "서초" },
    { key: "jamsil", label: "잠실/송파/강동" },
    { key: "yeongdeungpo", label: "영등포/여의도/강서" },
    { key: "kondae", label: "건대/성수/왕십리" },
    { key: "jongno", label: "종로/중구" },
    { key: "hongdae", label: "홍대/합정/마포" },
    { key: "yongsan", label: "용산/이태원/한남" },
    { key: "seongbuk", label: "성북/노원/중랑" },
    { key: "guro", label: "구로/관악/동작" },
  ],
}

export const FOOD_TYPES = [
  { key: "korean", label: "한식", icon: "korean" as const },
  { key: "chinese", label: "중식", icon: "chinese" as const },
  { key: "japanese", label: "일식", icon: "japanese" as const },
  { key: "american", label: "양식", icon: "american" as const },
  { key: "world", label: "세계음식", icon: "globe" as const },
]

export const NUTRIENTS = [
  { key: "low-sugar", label: "저당" },
  { key: "low-protein", label: "저단백" },
  { key: "low-salt", label: "저염" },
  { key: "low-potassium", label: "저칼륨" },
  { key: "low-phosphorus", label: "저인" },
]

export const DEFAULT_FILTER_STATE: import("../types").FilterState = {
  region: null,
  subRegions: [],
  foodTypes: [],
  nutrients: [],
}
