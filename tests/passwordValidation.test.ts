import {
  getPasswordCriteriaState,
  isPasswordValid,
} from "../src/features/auth/data/passwordValidation"
import { getPasswordFlowToken } from "../src/features/auth/data/passwordFlow"

describe("password validation display state", () => {
  it("treats an empty password as neutral", () => {
    expect(getPasswordCriteriaState("")).toBe("empty")
  })

  it("marks passwords that do not meet all criteria as invalid", () => {
    expect(getPasswordCriteriaState("abcde")).toBe("invalid")
    expect(getPasswordCriteriaState("abcdef")).toBe("invalid")
    expect(getPasswordCriteriaState("abc1234567890123456")).toBe("invalid")
  })

  it("marks passwords with 6 to 18 chars and two character classes as valid", () => {
    expect(getPasswordCriteriaState("abc123")).toBe("valid")
    expect(getPasswordCriteriaState("ABCdef")).toBe("valid")
    expect(getPasswordCriteriaState("abcdef!")).toBe("valid")
    expect(isPasswordValid("abc123")).toBe(true)
  })
})

describe("password flow token guards", () => {
  it("rejects missing or blank tokens before the password form can submit", () => {
    expect(getPasswordFlowToken(undefined)).toBeNull()
    expect(getPasswordFlowToken("")).toBeNull()
    expect(getPasswordFlowToken("   ")).toBeNull()
  })

  it("preserves opaque server-issued tokens", () => {
    expect(getPasswordFlowToken("signup-token")).toBe("signup-token")
    expect(getPasswordFlowToken("email-link-token")).toBe("email-link-token")
  })
})
