import type {
  UserProfile,
  HealthRecord,
  FoodRecord,
  ChatConversation,
  ChatMessage,
  DailyHealthLog,
} from "../../types"
import { DEFAULT_MOCK_USER } from "./mockUser"

// CKD 3기 환자 프로필
export const MOCK_USER_PROFILE: UserProfile = {
  uid: DEFAULT_MOCK_USER.uid,
  email: DEFAULT_MOCK_USER.email || "",
  displayName: "김철수",
  nickname: "철수",
  birthDate: "1975-03-15",
  gender: "male",
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
export const MOCK_CONVERSATIONS: ChatConversation[] = [
  {
    id: "conv-001",
    userId: DEFAULT_MOCK_USER.uid,
    title: "저염 식단 문의",
    category: "diet",
    createdAt: new Date("2024-11-20"),
    updatedAt: new Date("2024-11-20"),
  },
]

// 채팅 메시지
export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "msg-001",
    conversationId: "conv-001",
    role: "user",
    content: "만성신장병 3기 환자인데 나트륨 섭취를 어떻게 줄일 수 있을까요?",
    createdAt: new Date("2024-11-20T10:00:00"),
  },
  {
    id: "msg-002",
    conversationId: "conv-001",
    role: "assistant",
    content:
      "만성신장병 3기 환자분의 경우 하루 나트륨 섭취량을 2,000mg 이하로 제한하는 것이 권장됩니다.",
    createdAt: new Date("2024-11-20T10:00:30"),
  },
]

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
