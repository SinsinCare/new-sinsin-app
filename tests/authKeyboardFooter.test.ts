import {
  AUTH_KEYBOARD_FOOTER_CLEARANCE,
  getAuthKeyboardFooterPadding,
} from "../src/features/auth/components/authKeyboardFooterLayout"

describe("auth keyboard footer layout", () => {
  it("uses the safe-area inset only while the keyboard is closed", () => {
    expect(getAuthKeyboardFooterPadding(34)).toEqual({
      closed: 58,
      opened: 12,
    })
  })

  it("reserves enough keyboard clearance for the primary action and focused input", () => {
    expect(AUTH_KEYBOARD_FOOTER_CLEARANCE).toBe(76)
  })

  it("keeps the open gap platform-safe when there is no bottom inset", () => {
    expect(getAuthKeyboardFooterPadding(0)).toEqual({
      closed: 24,
      opened: 12,
    })
  })
})

/**
 * 전역 키보드 툴바("완료")가 인증 화면의 CTA 를 덮던 결함(2026-09-11 비밀번호 재설정 녹화).
 * 자기 도크인 이 바는 전역 툴바를 끄고, 대신 키보드가 열린 동안 키보드 내리기 버튼을 제공해야 한다.
 */
import { readFileSync } from "fs"
import { join } from "path"

describe("auth keyboard footer owns the keyboard dock", () => {
  const src = readFileSync(
    join(__dirname, "../src/features/auth/components/AuthKeyboardFooter.tsx"),
    "utf8",
  )
  const stripped = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")

  it("suppresses the global keyboard toolbar while mounted", () => {
    expect(stripped).toMatch(/useSuppressGlobalKeyboardToolbar\(\)/)
  })

  it("renders its own keyboard-dismiss escape while the keyboard is visible", () => {
    expect(stripped).toMatch(/isKeyboardVisible\s*&&/)
    expect(stripped).toMatch(/accessibilityLabel=\{t\("keyboard\.dismiss"\)\}/)
    expect(stripped).toMatch(/onPress=\{Keyboard\.dismiss\}/)
  })
})

/**
 * iOS 자동 강력 비밀번호가 20자를 채워 "18자 이하" 오류를 내던 결함(2026-09-12).
 * newPassword 칸은 전부 앱 정책과 같은 passwordRules 를 달아야 한다.
 */
import { IOS_PASSWORD_RULES } from "../src/features/auth/data/passwordValidation"

describe("newPassword fields carry iOS password rules", () => {
  it("rules match the app policy (6~18, two classes)", () => {
    expect(IOS_PASSWORD_RULES).toMatch(/minlength: 6;/)
    expect(IOS_PASSWORD_RULES).toMatch(/maxlength: 18;/)
    expect(IOS_PASSWORD_RULES).toMatch(/required: lower;/)
    expect(IOS_PASSWORD_RULES).toMatch(/required: digit;/)
  })

  it.each([
    "ForgotPasswordScreen",
    "SignupPasswordScreen",
    "EmailLoginLinkPasswordScreen",
  ])("%s: every newPassword field has passwordRules", (name) => {
    const src = readFileSync(
      join(__dirname, `../src/features/auth/views/${name}.tsx`),
      "utf8",
    )
    const newPasswordCount = (src.match(/textContentType="newPassword"/g) ?? [])
      .length
    const rulesCount = (
      src.match(/passwordRules=\{IOS_PASSWORD_RULES\}/g) ?? []
    ).length
    expect(newPasswordCount).toBeGreaterThan(0)
    expect(rulesCount).toBe(newPasswordCount)
  })
})

/**
 * 비밀번호 재설정 화면의 단계 컨테이너 key — react-hook-form 7.7x 의 useController 는 첫
 * 렌더의 control.register 결과를 ref 로 붙들므로, 이메일/인증번호 Controller 인스턴스가
 * 그대로 비밀번호 Controller 로 재사용되면 onChange 가 옛 폼에 값을 쓴다(2026-09-11 재설정 오류).
 */
describe("forgot-password step containers are keyed", () => {
  const src = readFileSync(
    join(__dirname, "../src/features/auth/views/ForgotPasswordScreen.tsx"),
    "utf8",
  )
  it("verify step and password step never share a React slot", () => {
    expect(src).toMatch(/<View key="verify" style=\{styles\.body\}>/)
    expect(src).toMatch(/<View key="password" style=\{styles\.body\}>/)
  })
  it("the two Controller forms are different instances", () => {
    expect(src).toMatch(/control=\{emailOtpForm\.control\}/)
    expect(src).toMatch(/control=\{passwordForm\.control\}/)
  })
})
