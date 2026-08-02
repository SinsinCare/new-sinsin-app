/** 의사 연결 온보딩. */
import { useAppRouter } from "@/src/shared/navigation"

import { DoctorIntroScreen } from "@/src/features/doctor-link"

export default function DoctorIntroRoute() {
  const router = useAppRouter()
  return (
    <DoctorIntroScreen
      onBack={() => router.back()}
      onNext={() => router.push("/(settings)/doctor-search")}
    />
  )
}
