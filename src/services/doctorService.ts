import { api } from "./core/apiClient"

export async function enrollDoctor(doctorCode: string) {
  const { data } = await api.post("/user/link-doctor", { inviteCode: doctorCode })
  return data.result
}
