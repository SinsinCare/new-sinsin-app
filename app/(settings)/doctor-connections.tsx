/**
 * 연결된 기관 목록. 이 기능의 **홈**이다 — 마이페이지에서 여기로 들어온다.
 *
 * 연결이 하나도 없을 때 "추가하기" 는 온보딩(intro)으로, 이미 써 본 사람은 검색으로
 * 바로 갈 수 있어야 하지만, 온보딩이 1·2·3 스텝으로 무엇이 공유되는지 알려주는 화면이라
 * 매번 거치게 둔다. 건너뛰기는 화면 안에서 결정할 일이다.
 */
import { useAppRouter } from "@/src/shared/navigation"

import { ConnectedListScreen } from "@/src/features/doctor-link"
import { encodeDoctorParam } from "@/src/features/doctor-link/data/doctorParams"

export default function DoctorConnectionsRoute() {
  const router = useAppRouter()
  return (
    <ConnectedListScreen
      onBack={() => router.back()}
      onAdd={() => router.push("/(settings)/doctor-intro")}
      onOpen={(connection) => {
        if (!connection.doctor) return
        router.push({
          pathname: "/(settings)/doctor-sharing",
          params: {
            connectionId: connection.id,
            status: connection.status,
            doctor: encodeDoctorParam(connection.doctor),
          },
        })
      }}
    />
  )
}
