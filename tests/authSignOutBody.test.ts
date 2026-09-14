import { readFileSync } from "fs"
import { join } from "path"

/**
 * 로그아웃은 자기 리프레시 토큰을 body 로 보낸다(2026-09-12, 서버 refresh_token 세션당 한 행).
 * 안 보내면 서버가 구 앱으로 보고 사용자 세션 전부를 끊어 부스의 다른 기기가 튕긴다.
 */
describe("signOut sends its own refresh token", () => {
  const src = readFileSync(
    join(__dirname, "../src/services/auth/authService.ts"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
  const block = src.slice(
    src.indexOf("async signOut()"),
    src.indexOf("async promoteSession()"),
  )
  it("reads the refresh token and posts it to /auth/logout", () => {
    expect(block).toMatch(/tokenService\.getRefreshToken\(\)/)
    expect(block).toMatch(
      /"\/auth\/logout",\s*refreshToken \? \{ refreshToken \} : undefined/,
    )
  })
})
