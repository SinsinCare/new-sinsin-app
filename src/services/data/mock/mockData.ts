import type {
  UserProfile,
  HealthRecord,
  FoodRecord,
  DailyHealthLog,
} from "../../../types"
import type { Chat, Message } from "../../../types/chat"
import { DEFAULT_MOCK_USER } from "../../auth/mock/mockUser"

// CKD 3기 환자 프로필
export const MOCK_USER_PROFILE: UserProfile = {
  uid: DEFAULT_MOCK_USER.uid,
  email: DEFAULT_MOCK_USER.email || "",
  displayName: "김철수",
  nickname: "철수",
  birthDate: "1975-03-15",
  gender: "MALE",
  height: 172,
  weight: 68,
  ckdStage: 3,
  onDialysis: false,
  onboardingCompleted: false,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-12-01"),
}

// 건강 기록
export const MOCK_HEALTH_RECORDS: HealthRecord[] = [
  {
    id: "hr-001",
    userId: DEFAULT_MOCK_USER.uid,
    gfr: 45,
    creatinine: 1.8,
    potassium: 4.5,
    bun: 28,
    uricAcid: 6.2,
    recordDate: new Date("2024-11-15"),
    createdAt: new Date("2024-11-15"),
  },
]

// 오늘의 음식 기록
export const MOCK_FOOD_RECORDS: FoodRecord[] = [
  {
    id: "fr-001",
    userId: DEFAULT_MOCK_USER.uid,
    name: "현미밥",
    calories: 340,
    protein: 7,
    carbohydrates: 72,
    fat: 2.5,
    sodium: 5,
    potassium: 150,
    phosphorus: 200,
    hasBroth: false,
    brothConsumed: false,
    mealType: "breakfast",
    recordDate: new Date(),
  },
]

// 채팅 대화
const now = new Date()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

export const MOCK_CHATS: Chat[] = [
  {
    id: 1,
    title: "나트륨을 줄여 먹는 법",
    summary: "만성신장병 3기에서 나트륨 섭취를 줄이는 방법",
    status: "ACTIVE",
    category: "FOOD_DIET",
    messageCount: 2,
    createdAt: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      10,
      0,
    ),
    updatedAt: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      10,
      0,
    ),
  },
  {
    id: 2,
    title: "칼륨 수치가 높을 때 먹는 과일",
    summary:
      "과일마다 칼륨 함량이 달라요. 최근 검사 결과와 개인 식단 기준을 확인해 종류와 양을 정해요.",
    status: "ACTIVE",
    category: "FOOD_DIET",
    messageCount: 2,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: 3,
    title: "GFR 수치는 어떻게 보나요?",
    summary:
      "eGFR은 한 번의 숫자만으로 판단하지 않고 검사 기간과 다른 결과를 함께 봐요.",
    status: "ACTIVE",
    category: "EXAM",
    messageCount: 2,
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  },
]

// 채팅 메시지
export const MOCK_CHAT_MESSAGES: Map<number, Message[]> = new Map([
  [
    1,
    [
      {
        id: 1,
        conversationId: 1,
        role: "user",
        content:
          "만성신장병 3기 환자인데 나트륨 섭취를 어떻게 줄일 수 있을까요?",
        createdAt: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          10,
          0,
        ),
      },
      {
        id: 2,
        conversationId: 1,
        role: "assistant",
        content:
          "나트륨 목표는 검사 결과와 건강 상태에 따라 달라요. 담당 의료진이 정한 목표가 있다면 그 값을 먼저 따르세요. 일상에서는 소금 대신 레몬즙, 식초, 후추 같은 양념을 써 볼 수 있어요.",
        aiCategory: "FOOD_DIET",
        aiCategoryLabel: "음식·식단",
        createdAt: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          10,
          0,
          30,
        ),
      },
    ],
  ],
  [
    2,
    [
      {
        id: 3,
        conversationId: 2,
        role: "user",
        content: "칼륨 수치가 높으면 어떤 과일을 피해야 하나요?",
        createdAt: yesterday,
      },
      {
        id: 4,
        conversationId: 2,
        role: "assistant",
        content:
          "과일마다 칼륨 함량이 달라요. 최근 칼륨 검사 결과와 개인 식단 기준을 확인한 뒤, 의료진이나 영양사에게 종류와 하루 분량을 물어보세요.",
        aiCategory: "FOOD_DIET",
        aiCategoryLabel: "음식·식단",
        createdAt: yesterday,
      },
    ],
  ],
  [
    3,
    [
      {
        id: 5,
        conversationId: 3,
        role: "user",
        content: "GFR 수치는 어떻게 봐야 하나요?",
        createdAt: twoDaysAgo,
      },
      {
        id: 6,
        conversationId: 3,
        role: "assistant",
        content:
          "eGFR은 콩팥의 여과 기능을 살펴보는 지표 중 하나예요. 한 번의 숫자만으로 상태를 단정하지 않고 검사 기간과 다른 결과를 함께 봐요.",
        aiCategory: "EXAM",
        aiCategoryLabel: "검사·수치해석",
        createdAt: twoDaysAgo,
      },
    ],
  ],
])

// 일일 건강 로그
export const MOCK_DAILY_LOG: DailyHealthLog = {
  id: `${DEFAULT_MOCK_USER.uid}_${new Date().toISOString().split("T")[0]}`,
  userId: DEFAULT_MOCK_USER.uid,
  date: new Date(),
  steps: 5420,
  waterIntake: 1200,
  sleepHours: 7.5,
  weight: 68,
  bloodPressureSystolic: 128,
  bloodPressureDiastolic: 82,
  notes: "",
}
