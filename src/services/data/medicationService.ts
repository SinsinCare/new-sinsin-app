import { api } from "../core"

/**
 * 약 복용(서버 2026-09-04). 일정은 아직 화면이 없다(약 분석 시트 예정) — 홈 타일은
 * "지금 한 번 먹었다" 만 기록하고, 하루 요약은 하루 화면(`date-analysis.medication`)이 실어 보낸다.
 */
export interface MedicationIntakeResult {
  intakeId: number
  date: string
  takenAt: string
  taken: number
  planned: number
}

export const medicationService = {
  async recordIntake(
    date: string,
    scheduleId: number | null = null,
  ): Promise<MedicationIntakeResult> {
    const response = await api.post("/medications/intakes", {
      date,
      scheduleId,
    })
    return response.data.result as MedicationIntakeResult
  },

  async deleteIntake(intakeId: number): Promise<void> {
    await api.delete(`/medications/intakes/${intakeId}`)
  },
}
