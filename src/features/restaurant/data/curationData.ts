import type { CurationSectionData, PlaceRestaurant } from "../types"

const PLACEHOLDER_IMAGE = require("@/assets/images/SIn_2.png")

// Restaurant images
const CHOROK_GIMBAP = [
  require("@/assets/images/restaurant/chorok-gimbap-1.jpg"),
  require("@/assets/images/restaurant/chorok-gimbap-2.jpg"),
  require("@/assets/images/restaurant/chorok-gimbap-3.jpg"),
  require("@/assets/images/restaurant/chorok-gimbap-4.jpg"),
]
const SONGHWA = [
  require("@/assets/images/restaurant/songhwa-1.jpg"),
  require("@/assets/images/restaurant/songhwa-2.jpg"),
  require("@/assets/images/restaurant/songhwa-3.jpg"),
  require("@/assets/images/restaurant/songhwa-4.jpg"),
]
const MASHITJEOYEOM = [
  require("@/assets/images/restaurant/mashitjeoyeom-1.jpg"),
  require("@/assets/images/restaurant/mashitjeoyeom-2.jpg"),
  require("@/assets/images/restaurant/mashitjeoyeom-3.jpg"),
  require("@/assets/images/restaurant/mashitjeoyeom-4.jpg"),
]
const SONYEO_BANGATGAN = [
  require("@/assets/images/restaurant/sonyeo-bangatgan-1.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-2.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-3.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-4.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-5.jpg"),
  require("@/assets/images/restaurant/sonyeo-bangatgan-6.jpg"),
]
const JEONGHEE_GANGNAM = [
  require("@/assets/images/restaurant/jeonghee-gangnam-1.jpg"),
  require("@/assets/images/restaurant/jeonghee-gangnam-2.jpg"),
  require("@/assets/images/restaurant/jeonghee-gangnam-3.jpg"),
  require("@/assets/images/restaurant/jeonghee-gangnam-4.jpg"),
]
const CHOIGANE_SHABU = [
  require("@/assets/images/restaurant/choigane-shabu-1.jpg"),
  require("@/assets/images/restaurant/choigane-shabu-2.jpg"),
  require("@/assets/images/restaurant/choigane-shabu-3.jpg"),
  require("@/assets/images/restaurant/choigane-shabu-4.jpg"),
  require("@/assets/images/restaurant/choigane-shabu-5.jpg"),
]

export const MAP_CENTER = {
  latitude: 37.5022,
  longitude: 127.0281,
}

export const MOCK_CURATION_SECTIONS: CurationSectionData[] = [
  {
    id: "section-1",
    title: "마포구 성산동 저염식당",
    subtitle: "신장 건강을 위해 인증된 내주변 저염식당을 확인해보세요.",
    restaurants: [
      {
        id: "r1",
        name: "신신식당",
        description: "저염식 한식으로 든든한 한 끼를 즐겨보세요",
        imageUri: PLACEHOLDER_IMAGE,
        tags: ["한식", "저당", "저염"],
        address: "마포구 성산동 123",
      },
      {
        id: "r2",
        name: "신신식당",
        description: "저염식 한식으로 든든한 한 끼를 즐겨보세요",
        imageUri: PLACEHOLDER_IMAGE,
        tags: ["한식", "저당", "저염"],
        address: "마포구 성산동 456",
      },
      {
        id: "r3",
        name: "그린키친",
        description: "신선한 채소로 만든 건강한 한 끼",
        imageUri: PLACEHOLDER_IMAGE,
        tags: ["양식", "저염", "샐러드"],
        address: "마포구 성산동 789",
      },
      {
        id: "r4",
        name: "담백한상",
        description: "담백하고 깔끔한 한식 정식 전문점",
        imageUri: PLACEHOLDER_IMAGE,
        tags: ["한식", "저당", "정식"],
        address: "마포구 성산동 101",
      },
    ],
  },
  {
    id: "section-2",
    title: "마포구 망원동 큐레이션",
    subtitle: "신장 건강을 위해 인증된 내주변 저염식당을 확인해보세요.",
    restaurants: [
      {
        id: "r5",
        name: "맑은국밥",
        description: "깔끔한 국물이 일품인 저염 국밥집",
        imageUri: PLACEHOLDER_IMAGE,
        tags: ["한식", "저염", "국밥"],
        address: "마포구 성산동 202",
      },
      {
        id: "r6",
        name: "건강밥상",
        description: "매일 달라지는 저염 건강 정식",
        imageUri: PLACEHOLDER_IMAGE,
        tags: ["한식", "저당", "저염"],
        address: "마포구 성산동 303",
      },
      {
        id: "r7",
        name: "소금꽃",
        description: "소금을 줄인 특별한 한식 코스",
        imageUri: PLACEHOLDER_IMAGE,
        tags: ["한식", "코스", "저염"],
        address: "마포구 성산동 404",
      },
      {
        id: "r8",
        name: "채움밥집",
        description: "영양 가득 저염식 가정식 백반",
        imageUri: PLACEHOLDER_IMAGE,
        tags: ["한식", "백반", "저염"],
        address: "마포구 성산동 505",
      },
    ],
  },
]

export const MOCK_PLACE_RESTAURANTS: PlaceRestaurant[] = [
  {
    id: "p1",
    name: "오늘의 초록김밥",
    tags: ["한식", "저염"],
    description: "영업중 · 저염명란 통계란김밥이 인기인 건강 김밥 전문점",
    rating: 4.3,
    reviewCount: 198,
    distance: "0.5km",
    address: "서울 강남구 강남대로98길 14",
    latitude: 37.5007624,
    longitude: 127.0277757,
    images: CHOROK_GIMBAP,
  },
  {
    id: "p2",
    name: "송화",
    tags: ["한식", "저염"],
    description: "영업중 · 강된장과 불고기가 맛있는 신선한 한정식 전문점",
    rating: 4.5,
    reviewCount: 294,
    distance: "0.8km",
    address: "서울 강남구 강남대로94길 69",
    latitude: 37.5001365,
    longitude: 127.030754,
    images: SONGHWA,
  },
  {
    id: "p3",
    name: "맛있저염",
    tags: ["한식", "저염", "저당"],
    description: "영업중 · 맛있게 즐기는 저염식 건강 한식 전문점",
    rating: 4.4,
    reviewCount: 156,
    distance: "2.1km",
    address: "서울 강남구 선릉로93길 40",
    latitude: 37.5046606,
    longitude: 127.0462786,
    images: MASHITJEOYEOM,
  },
  {
    id: "p4",
    name: "소녀방앗간 서울고속터미널점",
    tags: ["한식", "저염", "저인"],
    description: "영업중 · 산나물밥과 건강 정식이 맛있는 자연식 전문점",
    rating: 4.3,
    reviewCount: 87,
    distance: "3.5km",
    address: "서울 서초구 신반포로 194",
    latitude: 37.5049285,
    longitude: 127.0055927,
    images: SONYEO_BANGATGAN,
  },
  {
    id: "p5",
    name: "정희 강남역점",
    tags: ["한식", "저염"],
    description: "영업중 · 고사리 크림 수제비와 지짐밥이 인기인 퓨전 한식",
    rating: 4.6,
    reviewCount: 312,
    distance: "0.3km",
    address: "서울 강남구 강남대로102길 15",
    latitude: 37.5025765,
    longitude: 127.0274505,
    images: JEONGHEE_GANGNAM,
  },
  {
    id: "p6",
    name: "최가네샤브샤브버섯칼국수 강남",
    tags: ["한식", "저염", "저칼륨"],
    description: "영업중 · 푸짐한 버섯 샤브샤브와 칼국수를 한 번에",
    rating: 4.4,
    reviewCount: 231,
    distance: "0.8km",
    address: "서울 강남구 강남대로94길 20",
    latitude: 37.5001365,
    longitude: 127.030754,
    images: CHOIGANE_SHABU,
  },
]
