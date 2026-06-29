import { api } from "./core/apiClient"

export type DoctorDirectoryItem = {
  id: string
  email?: string
  name: string
  speciality?: string | null
  department?: string | null
  organizationId?: string | null
  organizationName?: string | null
  needsProfileCompletion?: boolean
}

export type DoctorConnectionStatus = "PENDING" | "APPROVED" | "REJECTED"

export type DoctorConnection = {
  id: string
  doctor: DoctorDirectoryItem | null
  status: DoctorConnectionStatus
  initiatedBy?: "PATIENT" | "DOCTOR"
  requestMessage?: string | null
  requestedAt?: string | null
  respondedAt?: string | null
}

export type DoctorConnectionList = {
  items: DoctorConnection[]
  total: number
}

export type DoctorSearchResult = {
  items: DoctorDirectoryItem[]
  total: number
}

export async function enrollDoctor(doctorCode: string) {
  const { data } = await api.post("/doctor/enroll", { inviteCode: doctorCode })
  return data.result
}

export async function searchDoctors(params: {
  name?: string
  hospital?: string
  department?: string
}): Promise<DoctorSearchResult> {
  const { data } = await api.get("/doctors/search", { params })
  return data.result ?? data
}

export async function requestDoctorConnection(params: {
  doctorId: string
  message?: string
}): Promise<DoctorConnection> {
  const { data } = await api.post("/doctor/connections", {
    doctorId: params.doctorId,
    message: params.message,
  })
  return data.result ?? data
}

export async function listDoctorConnections(): Promise<DoctorConnectionList> {
  const { data } = await api.get("/doctor/connections")
  return data.result ?? data
}
