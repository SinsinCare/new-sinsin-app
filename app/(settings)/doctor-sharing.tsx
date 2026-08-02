/**
 * 데이터 공유 설정.
 *
 * "분석하기" 는 검진 목록으로 보낸다 — 이 화면에서 공유를 켠 뒤 자연스럽게 이어지는 다음
 * 행동이 "그래서 내 수치가 어떤데?" 이고, 그 답이 검진 분석이다.
 */
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { DataSharingScreen } from "@/src/features/doctor-link"
import { decodeDoctorParam } from "@/src/features/doctor-link/data/doctorParams"
import type { DoctorConnectionStatus } from "@/src/types/doctorLink"

const STATUSES: DoctorConnectionStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REVOKED",
]

function asStatus(
  value: string | string[] | undefined,
): DoctorConnectionStatus {
  const raw = Array.isArray(value) ? value[0] : value
  // 모르는 값이면 가장 보수적인 쪽으로 — 잠긴 토글이 열린 토글보다 안전하다.
  return STATUSES.includes(raw as DoctorConnectionStatus)
    ? (raw as DoctorConnectionStatus)
    : "PENDING"
}

export default function DoctorSharingRoute() {
  const router = useAppRouter()
  const params = useLocalSearchParams<{
    connectionId?: string | string[]
    status?: string | string[]
    doctor?: string | string[]
  }>()
  const connectionId = Array.isArray(params.connectionId)
    ? params.connectionId[0]
    : params.connectionId

  return (
    <DataSharingScreen
      connectionId={connectionId ?? ""}
      doctor={decodeDoctorParam(params.doctor)}
      status={asStatus(params.status)}
      onBack={() => router.back()}
      onAnalyze={() => router.push("/(settings)/checkup-list")}
    />
  )
}
