import { api } from "./core/apiClient"

export async function enrollDoctor(patientCode: string) {
  const { data } = await api.post("/doctor/enroll", { patientCode })
  return data.result
}
