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
    title: "저염 식단 문의",
    summary:
      "만성신장병 3기 환자의 나트륨 섭취 제한 방법에 대해 상담한 내용입니다.",
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
    title: "칼륨 수치가 높을 때 과일 섭취 제한은?",
    summary:
      "고칼륨혈증 시 바나나, 멜론, 키위 등을 피하고, 사과, 배, 블루베리 등 저칼륨 과일을 소량 섭취하세요.",
    status: "ACTIVE",
    category: "FOOD_DIET",
    messageCount: 2,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: 3,
    title: "GFR 수치 해석 방법이 궁금합니다",
    summary:
      "GFR(사구체여과율)은 신장 기능을 나타내는 핵심 지표입니다. 정상은 90 이상이며, 60 미만이면 만성신장질환으로 분류됩니다.",
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
          "만성신장병 3기 환자분의 경우 하루 나트륨 섭취량을 2,000mg 이하로 제한하는 것이 권장됩니다. 소금 대신 레몬즙, 식초, 후추 등 천연 양념을 활용하세요.",
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
        content: "칼륨 수치가 높을 때 과일 섭취 제한은?",
        createdAt: yesterday,
      },
      {
        id: 4,
        conversationId: 2,
        role: "assistant",
        content:
          "고칼륨혈증이 있을 때는 바나나, 멜론, 키위, 오렌지를 피하세요. 사과, 배, 블루베리 등 저칼륨 과일을 소량 섭취하는 것이 좋습니다.",
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
        content: "GFR 수치 해석 방법이 궁금합니다",
        createdAt: twoDaysAgo,
      },
      {
        id: 6,
        conversationId: 3,
        role: "assistant",
        content:
          "GFR(사구체여과율)은 신장 기능의 핵심 지표입니다. 정상은 90 이상이며, 60 미만이면 만성신장질환으로 분류됩니다.",
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
