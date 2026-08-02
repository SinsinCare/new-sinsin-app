/**
 * 연결 확인 → 요청 전송.
 *
 * 요청 직후에는 아직 PENDING 이다. 승인 전에는 공유 범위를 저장할 수 없으므로
 * (서버가 409) 공유 설정으로 밀어 넣지 않고 **목록으로 replace** 한다 —
 * 목록에서 "승인 대기" 배지로 상태를 보는 편이 정직하다.
 * replace 인 이유: 뒤로가기가 방금 보낸 요청 화면으로 돌아가면 다시 보내게 된다.
 */
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { DoctorPreviewScreen } from "@/src/features/doctor-link"
import { decodeDoctorParam } from "@/src/features/doctor-link/data/doctorParams"

export default function DoctorPreviewRoute() {
  const router = useAppRouter()
  const params = useLocalSearchParams<{ doctor?: string | string[] }>()
  return (
    <DoctorPreviewScreen
      doctor={decodeDoctorParam(params.doctor)}
      onBack={() => router.back()}
      onConnected={() => router.replace("/(settings)/doctor-connections")}
    />
  )
}
