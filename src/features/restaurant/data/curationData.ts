import type { CurationSectionData } from "../types"

const PLACEHOLDER_IMAGE = require("@/assets/images/SIn_2.png")

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
