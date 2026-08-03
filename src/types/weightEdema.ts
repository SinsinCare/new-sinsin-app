export interface WeightEdemaResponse {
  isSuccess: boolean
  code: string
  message: string
  result: null
  timestamp: string
}

/** GET /weight-records 의 한 건 — 체중 시트의 7일 추세가 쓴다. */
export interface WeightRangeRecord {
  recordDate: string
  weightKg: number
}

export interface WeightRangeResponse {
  isSuccess: boolean
  code: string
  message: string
  result: { records: WeightRangeRecord[] } | null
  timestamp: string
}
