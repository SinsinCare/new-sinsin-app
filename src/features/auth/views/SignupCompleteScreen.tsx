import { Redirect } from "expo-router"
import { useAuthStore } from "@/src/stores"
import { getDestinationForAccountState } from "../utils/accountStateRoute"

export function SignupCompleteScreen() {
  const entryGate = useAuthStore((state) => state.entryGate)
  const accountState = useAuthStore((state) => state.accountState)

  /*
    entryGate 만 보고 홈으로 보내면, gate=HOME·state=PENDING_ONBOARDING 으로
    어긋난 계정이 가입 직후 홈(기능 화면)에 먼저 도착한다 — 목적지 판정은
    한 곳(getDestinationForAccountState)이 entryGate 와 accountState 를 함께 본다.
  */
  return (
    <Redirect
      href={getDestinationForAccountState(accountState, false, entryGate)}
    />
  )
}
