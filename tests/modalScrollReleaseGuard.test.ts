/**
 * 모달·시트를 닫은 뒤 투명한 네이티브 표면이 스크롤을 계속 먹는 회귀를 막는다.
 *
 * UIKit 전환 경합은 타입이나 렌더 스냅샷으로 보이지 않는다. 이 저장소에는 RN 렌더러도
 * 없으므로, 실제 사고를 막는 공통 계약이 우회되지 않는지 소스 경계에서 확인한다.
 */
import fs from "node:fs"
import path from "node:path"

import { codeOnly } from "./helpers/codeOnly"

const ROOT = path.join(__dirname, "..")

function read(relative: string): string {
  return codeOnly(fs.readFileSync(path.join(ROOT, relative), "utf8"))
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue
    const full = path.join(dir, entry)
    if (fs.statSync(full).isDirectory()) sourceFiles(full, out)
    else if (/\.tsx?$/u.test(entry)) out.push(full)
  }
  return out
}

describe("모달 수명주기 — 닫힌 표면이 스크롤을 가로막지 않는다", () => {
  test("AppModal 구현 외에는 RN Modal 을 직접 쓰지 않는다", () => {
    const directImport =
      /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*["']react-native["']/u
    const offenders = ["app", "src"].flatMap((dir) =>
      sourceFiles(path.join(ROOT, dir))
        .filter((file) =>
          directImport.test(codeOnly(fs.readFileSync(file, "utf8"))),
        )
        .map((file) => path.relative(ROOT, file))
        .filter((file) => file !== "src/shared/components/AppModal.tsx"),
    )

    expect(offenders).toEqual([])
  })

  test("빠른 false→true 에서도 이미 떠 있는 AppModal dismiss 는 취소하지 않는다", () => {
    const source = read("src/shared/components/AppModal.tsx")
    const dismissStart = source.indexOf("void enqueueTransition(async () => {")
    const dismissCommit = source.indexOf(
      "mountedRef.current = false",
      dismissStart,
    )
    expect(dismissStart).toBeGreaterThan(-1)
    expect(dismissCommit).toBeGreaterThan(dismissStart)
    expect(source.slice(dismissStart, dismissCommit)).not.toContain(
      "if (!isCurrent())",
    )
  })

  test("명령형 다이얼로그 Promise 는 dismiss 전이가 끝난 뒤 resolve 된다", () => {
    const source = read("src/lib/dialog.ts")
    const dispatch = source.slice(source.indexOf("function dispatch("))
    expect(dispatch.slice(0, 900)).toMatch(
      /result\.then\(async \(value\) => \{[\s\S]*?visibleModalCount\(\) - 1[\s\S]*?await afterSiblingModalsGone\(parentModalDepth\)/u,
    )
  })

  test("바텀시트는 backdrop·드래그 시작 모두 부모 닫힘과 안전장치를 깨운다", () => {
    const source = read("src/design-system-v2/components/V2BottomSheet.tsx")
    expect(source).toContain("const closeRequestedRef = useRef(false)")
    expect(source).toMatch(/onPress=\{requestClose\}/u)
    expect(source).toMatch(/onAnimate=\{handleSheetAnimate\}/u)
    expect(source).toMatch(
      /if \(toIndex !== -1 \|\| closingByPropRef\.current\) return\s*requestClose\(\)/u,
    )
  })

  test("닫히는 중 다시 열면 내부 시트도 복구하고 낡은 -1 신호는 무시한다", () => {
    const source = read("src/design-system-v2/components/V2BottomSheet.tsx")
    expect(source).toContain("const desiredVisibleRef = useRef(visible)")
    expect(source).toMatch(
      /requestAnimationFrame\(\(\) =>\s*sheetRef\.current\?\.snapToIndex\(0\)/u,
    )
    expect(source).toMatch(
      /if \(desiredVisibleRef\.current && closingByPropRef\.current\) \{[\s\S]*?sheetRef\.current\?\.snapToIndex\(0\)[\s\S]*?return/u,
    )
    expect(source).toMatch(
      /if \(index !== -1\) \{[\s\S]*?closingByPropRef\.current = false/u,
    )
  })
})

describe("세션 전환 — 확인 모달을 먼저 내린다", () => {
  test("탈퇴 취소 세션은 호출부의 dismiss 완료 뒤 적용한다", () => {
    const source = read("src/hooks/useAuth.ts")
    const callback = source.indexOf("await options?.beforeSessionApply?.()")
    const apply = source.indexOf("applyAuthSession(result)", callback)
    expect(callback).toBeGreaterThan(-1)
    expect(apply).toBeGreaterThan(callback)

    for (const file of [
      "src/features/auth/hooks/useEmailLogin.ts",
      "src/features/auth/hooks/useSocialLogin.ts",
    ]) {
      const caller = read(file)
      expect(caller).toMatch(
        /beforeSessionApply:\s*async \(\) => \{[\s\S]*?setWithdrawalPending\(null\)[\s\S]*?await afterModalTransitions\(\)/u,
      )
    }
  })

  test("로그아웃은 확인 모달 dismiss 뒤 세션을 비운다", () => {
    const source = read("src/features/settings/views/SettingsScreen.tsx")
    expect(source).toMatch(
      /setLogoutModalVisible\(false\)\s*await afterModalTransitions\(\)\s*await signOut\("explicit"\)/u,
    )
  })

  test("상담 기록 메뉴는 닫힌 뒤 이름 변경·삭제 후속 동작을 시작한다", () => {
    const source = read(
      "src/features/consultation/components/ChatHistoryCard.tsx",
    )
    const gatedActions = source.match(
      /setMenuOpen\(false\)\s*await afterModalTransitions\(\)\s*on(?:Rename|Delete)\?\.\(\)/gu,
    )
    expect(gatedActions).toHaveLength(2)
  })
})
