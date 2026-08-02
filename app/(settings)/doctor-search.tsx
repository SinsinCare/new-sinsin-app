/** 의사 검색 → 연결 확인. */
import { useAppRouter } from "@/src/shared/navigation"

import { DoctorSearchScreen } from "@/src/features/doctor-link"
import { encodeDoctorParam } from "@/src/features/doctor-link/data/doctorParams"

export default function DoctorSearchRoute() {
  const router = useAppRouter()
  return (
    <DoctorSearchScreen
      onBack={() => router.back()}
      onSelect={(doctor) =>
        router.push({
          pathname: "/(settings)/doctor-preview",
          params: { doctor: encodeDoctorParam(doctor) },
        })
      }
    />
  )
}
