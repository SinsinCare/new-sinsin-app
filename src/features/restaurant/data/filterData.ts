export const REGIONS = [
  { key: "all", labelKey: "restaurant.filter.regions.all" },
  { key: "seoul", labelKey: "restaurant.filter.regions.seoul" },
  { key: "gyeonggi", labelKey: "restaurant.filter.regions.gyeonggi" },
  { key: "incheon", labelKey: "restaurant.filter.regions.incheon" },
  { key: "busan", labelKey: "restaurant.filter.regions.busan" },
  { key: "jeju", labelKey: "restaurant.filter.regions.jeju" },
  { key: "ulsan", labelKey: "restaurant.filter.regions.ulsan" },
  { key: "gyeongnam", labelKey: "restaurant.filter.regions.gyeongnam" },
  { key: "daegu", labelKey: "restaurant.filter.regions.daegu" },
  { key: "gyeongbuk", labelKey: "restaurant.filter.regions.gyeongbuk" },
  { key: "gangwon", labelKey: "restaurant.filter.regions.gangwon" },
  { key: "daejeon", labelKey: "restaurant.filter.regions.daejeon" },
  { key: "chungnam", labelKey: "restaurant.filter.regions.chungnam" },
  { key: "chungbuk", labelKey: "restaurant.filter.regions.chungbuk" },
  { key: "sejong", labelKey: "restaurant.filter.regions.sejong" },
  { key: "jeonnam", labelKey: "restaurant.filter.regions.jeonnam" },
  { key: "gwangju", labelKey: "restaurant.filter.regions.gwangju" },
  { key: "jeonbuk", labelKey: "restaurant.filter.regions.jeonbuk" },
] as const

export const SUB_REGIONS = {
  seoul: [
    { key: "seoul-all", labelKey: "restaurant.filter.subRegions.seoulAll" },
    { key: "gangnam", labelKey: "restaurant.filter.subRegions.gangnam" },
    { key: "seocho", labelKey: "restaurant.filter.subRegions.seocho" },
    { key: "jamsil", labelKey: "restaurant.filter.subRegions.jamsil" },
    {
      key: "yeongdeungpo",
      labelKey: "restaurant.filter.subRegions.yeongdeungpo",
    },
    { key: "kondae", labelKey: "restaurant.filter.subRegions.kondae" },
    { key: "jongno", labelKey: "restaurant.filter.subRegions.jongno" },
    { key: "hongdae", labelKey: "restaurant.filter.subRegions.hongdae" },
    { key: "yongsan", labelKey: "restaurant.filter.subRegions.yongsan" },
    { key: "seongbuk", labelKey: "restaurant.filter.subRegions.seongbuk" },
    { key: "guro", labelKey: "restaurant.filter.subRegions.guro" },
  ],
} as const

export const FOOD_TYPES = [
  {
    key: "korean",
    labelKey: "restaurant.filter.foodTypes.korean",
    icon: "korean",
  },
  {
    key: "chinese",
    labelKey: "restaurant.filter.foodTypes.chinese",
    icon: "chinese",
  },
  {
    key: "japanese",
    labelKey: "restaurant.filter.foodTypes.japanese",
    icon: "japanese",
  },
  {
    key: "american",
    labelKey: "restaurant.filter.foodTypes.american",
    icon: "american",
  },
  {
    key: "world",
    labelKey: "restaurant.filter.foodTypes.world",
    icon: "globe",
  },
] as const

export const NUTRIENTS = [
  { key: "low-sugar", labelKey: "restaurant.filter.nutrients.lowSugar" },
  { key: "low-salt", labelKey: "restaurant.filter.nutrients.lowSalt" },
  {
    key: "low-potassium",
    labelKey: "restaurant.filter.nutrients.lowPotassium",
  },
  {
    key: "low-phosphorus",
    labelKey: "restaurant.filter.nutrients.lowPhosphorus",
  },
] as const

export const DEFAULT_FILTER_STATE: import("../types").FilterState = {
  region: null,
  subRegions: [],
  foodTypes: [],
  nutrients: [],
}
