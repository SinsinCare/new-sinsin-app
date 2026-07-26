import { bootstrapAuthSession } from "../src/features/auth/utils/authSessionBootstrap"
import type { AuthSessionResult } from "../src/services/types/serviceTypes"

const restoredSession: AuthSessionResult = {
  user: {
    uid: "restored-user",
    email: null,
    displayName: null,
  },
  accountState: "ACTIVE",
  requiresAdditionalInfo: false,
  entryGate: "HOME",
  sessionPersistence: "persistent",
}

describe("bootstrapAuthSession", () => {
  it("does not restore again when an active session already exists", async () => {
    const restoreSession = jest.fn()
    const applyAuthSession = jest.fn()
    const clearClientSession = jest.fn()

    await expect(
      bootstrapAuthSession({
        isAuthenticated: () => true,
        restoreSession,
        applyAuthSession,
        clearClientSession,
      }),
    ).resolves.toBe("already_authenticated")

    expect(restoreSession).not.toHaveBeenCalled()
    expect(applyAuthSession).not.toHaveBeenCalled()
    expect(clearClientSession).not.toHaveBeenCalled()
  })

  it("preserves an interactive login completed during restore", async () => {
    let authenticated = false
    const applyAuthSession = jest.fn()
    const clearClientSession = jest.fn()

    await expect(
      bootstrapAuthSession({
        isAuthenticated: () => authenticated,
        restoreSession: async () => {
          authenticated = true
          return null
        },
        applyAuthSession,
        clearClientSession,
      }),
    ).resolves.toBe("preserved_active_session")

    expect(applyAuthSession).not.toHaveBeenCalled()
    expect(clearClientSession).not.toHaveBeenCalled()
  })

  it("applies a restored session when no newer login exists", async () => {
    const applyAuthSession = jest.fn()
    const clearClientSession = jest.fn()

    await expect(
      bootstrapAuthSession({
        isAuthenticated: () => false,
        restoreSession: async () => restoredSession,
        applyAuthSession,
        clearClientSession,
      }),
    ).resolves.toBe("restored")

    expect(applyAuthSession).toHaveBeenCalledWith(restoredSession)
    expect(clearClientSession).not.toHaveBeenCalled()
  })

  it("clears a missing persisted session when still signed out", async () => {
    const applyAuthSession = jest.fn()
    const clearClientSession = jest.fn().mockResolvedValue(undefined)

    await expect(
      bootstrapAuthSession({
        isAuthenticated: () => false,
        restoreSession: async () => null,
        applyAuthSession,
        clearClientSession,
      }),
    ).resolves.toBe("cleared")

    expect(applyAuthSession).not.toHaveBeenCalled()
    expect(clearClientSession).toHaveBeenCalledTimes(1)
  })
})
