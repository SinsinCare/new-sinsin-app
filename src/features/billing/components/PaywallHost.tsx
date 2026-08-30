/**
 * 페이월 시트를 실제로 그리는 자리. 앱 루트에 하나 두면 화면 어디서든 열린다
 * (`V2DialogHost` 와 같은 계보 · 같은 스택 규칙).
 *
 * **RN Modal 안에서 열어야 하면 그 안에도 하나 더 얹는다** — iOS 는 이미 떠 있는
 * 모달 위에 present 를 거부해서, 루트의 호스트가 조용히 안 뜬다. 호스트는 스택이라
 * 안쪽에 마운트한 쪽이 요청을 가져간다.
 */

import { useEffect, useState } from "react"

import { registerPaywallHost, type PaywallRequest } from "../paywallHost"
import { PaywallSheet } from "./PaywallSheet"

export function PaywallHost() {
  const [request, setRequest] = useState<PaywallRequest | null>(null)

  useEffect(() => registerPaywallHost(setRequest), [])

  return <PaywallSheet request={request} onClose={() => setRequest(null)} />
}
