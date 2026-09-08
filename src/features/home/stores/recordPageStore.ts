import { create } from "zustand"
import { router } from "expo-router"

import type {
  DateAnalysisBloodPressureRecord,
  DateAnalysisBodyRecord,
  DateAnalysisBloodGlucoseRecord,
} from "@/src/types"
import type { GlucoseContextInference } from "../utils/glucoseInference"
import type { EdemaEntry } from "../utils/edemaEntry"
import type { BloodPressureRangeRecord } from "@/src/types/bloodMetrics"
import type { MedicationIntakeResult } from "@/src/services/data/medicationService"

/**
 * 물·혈압·체중 기록 **페이지**가 받을 재료.
 *
 * 2026-09-05 시안부터 이 셋은 바텀시트가 아니라 별도 페이지다. 라우트 파라미터에는
 * 콜백과 서버 객체를 실을 수 없고(리포트 페이지가 같은 이유로 스토어를 쓴다), 여는 쪽
 * (홈 `RecordView`)이 이미 그날의 데이터와 저장 핸들러를 들고 있다. 그래서 여는 순간
 * 여기 두고 페이지가 꺼내 쓴다. **한 번에 한 페이지만** 열린다.
 *
 * `onClose` 는 여는 쪽의 정리(그날 데이터 다시 읽기 등)다. 페이지를 실제로 내리는 것은
 * 페이지 자신이 한다(`useGoBack`).
 */
export interface WaterPageParams {
  kind: "water"
  date?: string
  /** 페이지를 연 시점의 오늘 총량. 열려 있는 동안 페이지가 스스로 더한다. */
  consumed: number
  /** 서버가 등록한 신장 정보로 계산한 하루 권장량. 모르면 null. */
  limit: number | null
  /** 프로필을 못 받아 일반 참고값을 쓰는 중인지. */
  isReferenceLimit: boolean
  /** 증감을 서버에 보낸다. 성공 여부를 돌려준다. */
  onLog: (delta: number) => Promise<boolean>
  onClose?: () => void
}

export interface BloodPressurePageParams {
  kind: "bloodPressure"
  /** 오늘(선택 날짜)의 대표 기록. 없으면 null. */
  record: DateAnalysisBloodPressureRecord | null
  /** 지난번 기록 — 가정혈압의 앵커. */
  previousRecord: DateAnalysisBloodPressureRecord | null
  /** 선택 날짜("YYYY-MM-DD"). 이력 조회와 저장에 쓴다. */
  date: string
  isSaving: boolean
  onSubmit: (body: {
    systolic: number
    diastolic: number
    heartRate: number | null
    slot: "BREAKFAST" | "LUNCH" | "DINNER" | "BEDTIME"
    timing: "FASTING" | "BEFORE_MEAL" | "AFTER_MEAL_1H" | "AFTER_MEAL_2H" | null
  }) => Promise<boolean>
  onClose?: () => void
}

export interface WeightPageParams {
  kind: "weight"
  today: DateAnalysisBodyRecord | null
  previous: DateAnalysisBodyRecord | null
  /**
   * 선택 날짜("YYYY-MM-DD"). 7일 창은 **페이지가 직접** 읽는다 — 여는 쪽이 배열을 넘기면
   * 그것은 연 순간의 눈금이라 저장해도 표가 갱신되지 않는다(2026-09-05 실측).
   */
  endDate: string
  isToday: boolean
  isSaving: boolean
  onSubmit: (weightKg: number) => Promise<boolean>
  onClose?: () => void
}

export type RecordPageParams =
  | MedicationPageParams
  | WaterPageParams
  | BloodPressurePageParams
  | WeightPageParams
  | BloodGlucosePageParams
  | EdemaPageParams

export interface MedicationPageParams {
  kind: "medication"
  date: string
  taken: number
  planned: number
  onSubmit: () => Promise<MedicationIntakeResult>
  onClose?: () => void
}

export interface BloodGlucosePageParams {
  kind: "bloodGlucose"
  date: string
  records: DateAnalysisBloodGlucoseRecord[]
  inference?: GlucoseContextInference | null
  onSubmit: (
    body: Omit<DateAnalysisBloodGlucoseRecord, "recordDate" | "slot"> & {
      slot: "BREAKFAST" | "LUNCH" | "DINNER" | null
    },
  ) => Promise<boolean>
  onClose?: () => void
}

export interface EdemaPageParams {
  kind: "edema"
  date: string
  today: DateAnalysisBodyRecord | null
  previous: DateAnalysisBodyRecord | null
  onSubmit: (entry: EdemaEntry) => Promise<boolean>
  onClose?: () => void
}

interface RecordPageState {
  params: RecordPageParams | null
  set: (params: RecordPageParams) => void
  /** 여는 쪽이 재료를 갱신할 때(저장 중 표시 등). 열려 있지 않으면 무시한다. */
  patch: (partial: Partial<RecordPageParams>) => void
  clear: () => void
}

export const useRecordPageStore = create<RecordPageState>()((set) => ({
  params: null,
  set: (params) => set({ params }),
  patch: (partial) =>
    set((state) =>
      state.params
        ? { params: { ...state.params, ...partial } as RecordPageParams }
        : state,
    ),
  clear: () => set({ params: null }),
}))

const ROUTE = {
  medication: "/record/medication",
  water: "/record/water",
  bloodPressure: "/record/blood-pressure",
  weight: "/record/weight",
  bloodGlucose: "/record/blood-glucose",
  edema: "/record/edema",
} as const

/**
 * 기록 페이지를 연다. 재료를 스토어에 두고 라우트를 민다 — 두 줄이 늘 같이 가야 해서
 * 한 함수로 묶었다. 이미 열려 있으면 재료만 갈아 끼운다(페이지가 두 장 쌓이면 뒤로가기를
 * 두 번 눌러야 한다).
 */
export function openRecordPage(params: RecordPageParams): void {
  const store = useRecordPageStore.getState()
  const wasOpen = store.params !== null
  store.set(params)
  if (!wasOpen) router.push(ROUTE[params.kind])
}

/** 혈압 이력 표가 쓰는 한 줄. 서버 `GET /blood-pressure-records` 의 모양 그대로다. */
export type BloodPressureHistoryRow = BloodPressureRangeRecord
