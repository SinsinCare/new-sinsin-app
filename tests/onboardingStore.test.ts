const mockAsyncStorage = {
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: mockAsyncStorage,
}))

// eslint-disable-next-line import/first
import { useOnboardingStore } from "../src/stores/onboardingStore"

describe("onboarding progress ownership", () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset()
    jest.clearAllMocks()
  })

  it("starts a new user at the CKD diagnosis screen and removes stale answers", () => {
    const state = useOnboardingStore.getState()
    state.setHasCkd(true)
    state.setCurrentStepIndex(2)
    state.setAnswer(3, {
      step: 3,
      type: "only",
      selectedKeys: ["yes"],
    })

    expect(state.prepareForUser("user-a")).toBe(false)
    expect(useOnboardingStore.getState()).toMatchObject({
      ownerUserId: "user-a",
      hasCkd: null,
      currentStepIndex: 0,
      answers: {},
    })
  })

  it("resumes progress only for the same user", () => {
    const state = useOnboardingStore.getState()
    state.prepareForUser("user-a")
    state.setHasCkd(false)
    state.setCurrentStepIndex(1)

    expect(useOnboardingStore.getState().prepareForUser("user-a")).toBe(true)
    expect(useOnboardingStore.getState()).toMatchObject({
      ownerUserId: "user-a",
      hasCkd: false,
      currentStepIndex: 1,
    })
  })

  it("restarts at diagnosis when a different account enters onboarding", () => {
    const state = useOnboardingStore.getState()
    state.prepareForUser("user-a")
    state.setHasCkd(true)
    state.setCurrentStepIndex(3)

    expect(useOnboardingStore.getState().prepareForUser("user-b")).toBe(false)
    expect(useOnboardingStore.getState()).toMatchObject({
      ownerUserId: "user-b",
      hasCkd: null,
      currentStepIndex: 0,
      answers: {},
    })
  })

  it("keeps ownership when returning from the first question to diagnosis", () => {
    const state = useOnboardingStore.getState()
    state.prepareForUser("user-a")
    state.setOnboardingInProgress(true)
    state.setHasCkd(true)
    state.setCurrentStepIndex(1)

    useOnboardingStore.getState().resetProgress()

    expect(useOnboardingStore.getState()).toMatchObject({
      isOnboardingInProgress: true,
      ownerUserId: "user-a",
      hasCkd: null,
      currentStepIndex: 0,
      answers: {},
    })
  })
})
