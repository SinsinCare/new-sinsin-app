import { api } from "./core/apiClient"

export async function enrollDoctor(doctorCode: string) {
  const { data } = await api.post("/doctor/enroll", { doctorCode })
  return data.result
}
