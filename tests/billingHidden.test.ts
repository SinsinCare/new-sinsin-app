/**
 * 결제 숨김 스위치 — **기본이 숨김이라는 것**과, 숨김이면 페이월이 어디서도 안 열린다는 것.
 */
import { isBillingHidden } from "../src/features/billing/billingVisibility"
import {
  openPaywall,
  registerPaywallHost,
} from "../src/features/billing/paywallHost"

const PREVIOUS = process.env.EXPO_PUBLIC_BILLING_HIDDEN

afterEach(() => {
  if (PREVIOUS === undefined) delete process.env.EXPO_PUBLIC_BILLING_HIDDEN
  else process.env.EXPO_PUBLIC_BILLING_HIDDEN = PREVIOUS
})

describe("isBillingHidden", () => {
  it("환경변수가 없으면 숨김 — 이게 계약이다", () => {
    expect(isBillingHidden({})).toBe(true)
    expect(isBillingHidden({ EXPO_PUBLIC_BILLING_HIDDEN: "" })).toBe(true)
  })

  it("애매한 값은 전부 숨김으로 읽는다", () => {
    for (const raw of ["true", "1", "no", "off", "maybe", " ", "FALSE_"]) {
      expect(isBillingHidden({ EXPO_PUBLIC_BILLING_HIDDEN: raw })).toBe(true)
    }
  })

  it('명시적인 "false" 만 보이게 한다', () => {
    for (const raw of ["false", "FALSE", " False "]) {
      expect(isBillingHidden({ EXPO_PUBLIC_BILLING_HIDDEN: raw })).toBe(false)
    }
  })
})

describe("openPaywall", () => {
  it("숨김이면 등록된 호스트가 있어도 열지 않는다", () => {
    process.env.EXPO_PUBLIC_BILLING_HIDDEN = "true"
    const host = jest.fn()
    const unregister = registerPaywallHost(host)
    openPaywall({ entry: "settings_subscription" })
    unregister()
    expect(host).not.toHaveBeenCalled()
  })

  it("보이게 하면 호스트가 받는다 — 스위치가 장식이 아니다", () => {
    process.env.EXPO_PUBLIC_BILLING_HIDDEN = "false"
    const host = jest.fn()
    const unregister = registerPaywallHost(host)
    openPaywall({ entry: "settings_subscription" })
    unregister()
    expect(host).toHaveBeenCalledTimes(1)
  })
})
