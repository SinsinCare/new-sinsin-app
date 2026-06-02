export type LabResultStatus = "normal" | "caution" | "warning"

export type LabValue = {
  id: string
  name: string
  nameEn: string
  value: string
  unit: string
  status: LabResultStatus
  normalRange: string
  tags?: string[]
}

export type LabRecord = {
  id: string
  date: string // "2023.10.15"
  displayDate: string // "10월 12일"
  year: number
  type: string // "건강검진" | "정기검사" | "내방문"
  values: LabValue[]
}

// ===== 검사지 OCR =====

// 업로드할 검사지 파일 (이미지 또는 PDF)
export type OcrUploadFile = {
  uri: string
  name: string
  kind: "image" | "pdf"
}

export type OcrReportStatus = "PENDING" | "CONFIRMED"

// OCR로 추출된 개별 검사 항목 (확정 전)
export type OcrExamItem = {
  itemId: number
  examName: string // 표준 표기명
  rawText: string // 검사지 원문 표기
  loincCode: string | null // 표준코드(LOINC). 매핑 실패 시 null
  examValue: string // 추출된 원본 수치 문자열
  normalizedValue: number | null // 숫자 정규화 값(없으면 null)
  unit: string | null // 표준 단위로 보정됨
  mapped: boolean // 표준코드 매핑 성공 여부
}

// ① 업로드/추출 & ② 재조회 응답
export type OcrReport = {
  reportId: number
  status: OcrReportStatus
  measuredAt: string | null // 검사일 (자동 인식, null일 수 있음)
  imageUrl: string
  items: OcrExamItem[]
}

// ③ 확정 저장 요청 항목 (include: false는 저장 제외, itemId 없으면 사용자 추가 항목)
export type OcrConfirmItem = {
  itemId?: number
  examName: string
  examValue: string
  unit: string | null
  include: boolean
}

export type OcrConfirmRequest = {
  measuredAt: string
  items: OcrConfirmItem[]
}

// ③ 확정 저장 응답 항목
export type OcrSavedExamResult = {
  id: number
  examName: string
  loincCode: string | null
  examValue: string
  unit: string | null
  measuredAt: string
}

export type OcrConfirmResult = {
  reportId: number
  status: OcrReportStatus
  savedCount: number
  examResults: OcrSavedExamResult[]
}
