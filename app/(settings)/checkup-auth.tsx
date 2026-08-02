/**
 * 건강검진 불러오기 — 본인인증.
 *
 * 인증이 끝나면 목록으로 **replace** 한다. push 하면 뒤로가기가 인증 폼으로 돌아가는데,
 * 그 폼은 이미 쓴 것이라 다시 제출하면 HYPHEN 유료 트랜잭션을 한 번 더 태운다.
 */
import { useAppRouter } from "@/src/shared/navigation"

import { CheckupAuthScreen } from "@/src/features/health-checkup"

export default function CheckupAuthRoute() {
  const router = useAppRouter()
  return (
    <CheckupAuthScreen
      onDone={() => router.replace("/(settings)/checkup-list")}
    />
  )
}
