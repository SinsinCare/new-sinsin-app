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
  date: string        // "2023.10.15"
  displayDate: string // "10월 12일"
  year: number
  type: string        // "건강검진" | "정기검사" | "내방문"
  values: LabValue[]
}
