import {
  subscriptionAccess,
  subscriptionDate,
} from "../src/features/billing/subscriptionPresentation"
import type { CapabilityState } from "../src/features/billing/types"
const open: CapabilityState = {
  capability: "scan.unlimited",
  lockState: "open",
  allowance: null,
  quota: null,
  cap: null,
}

test("subscription dates accept both server and ISO dates without shifting the displayed day", () => {
  for (const value of [
    "2026-09-06",
    "2026-09-06T00:00:00Z",
    "2026-09-06 00:00:00",
    "2026-09-06T00:00:00+09:00",
  ])
    expect(subscriptionDate(value)).toBe("2026.09.06")
  for (const value of [
    null,
    undefined,
    "",
    "not a date",
    "2026-02-30",
    "2026-13-06",
  ])
    expect(subscriptionDate(value)).toBeNull()
})
test("missing capabilities never imply a free quota or unlimited access", () => {
  expect(subscriptionAccess(undefined)).toEqual({ kind: "unknown" })
  expect(subscriptionAccess({ ...open, allowance: 3 })).toEqual({
    kind: "unknown",
  })
  expect(
    subscriptionAccess({
      ...open,
      cap: { limit: 3, used: null, remaining: null },
    }),
  ).toEqual({ kind: "unknown" })
  expect(subscriptionAccess(open)).toEqual({ kind: "unlimited" })
  expect(subscriptionAccess({ ...open, lockState: "peek" })).toEqual({
    kind: "locked",
  })
})
test("exhausted and customized server quotas retain zero and the actual limit", () => {
  const quota = {
    limit: 7,
    used: 7,
    remaining: 0,
    resetsAt: "2026-09-07",
    window: "day" as const,
  }
  expect(subscriptionAccess({ ...open, lockState: "blocked", quota })).toEqual({
    kind: "quota",
    window: "day",
    limit: 7,
    remaining: 0,
  })
  expect(
    subscriptionAccess({ ...open, quota: { ...quota, remaining: NaN } }),
  ).toEqual({ kind: "unknown" })
})
