/**
 * **헤더 아이콘 버튼의 터치 상자가 규격을 채우는가.**
 *
 * 실측된 결함(2026-08-24): 헤더의 ✕·‹ 는 대부분 `Pressable + hitSlop={8}` 로
 * 24pt 아이콘을 감쌌다 — **40pt**. iOS HIG 44, Android 48 둘 다 밑이고, 하필
 * 화면 맨 위 구석(엄지가 가장 부정확한 자리)이다. "닫기가 잘 안 눌린다" 의
 * 가장 흔한 원인이 이것이다.
 *
 * 이 파일이 지키는 것:
 *  1. `HeaderIconButton` 이 실제로 규격 상자를 만든다 — 그리고 **레이아웃 폭은
 *     아이콘 크기 그대로** 남긴다(음수 마진). 후자를 잃으면 헤더 간격이 틀어져
 *     디자인 리뷰에서 되돌려질 물건이 된다.
 *  2. 사용자가 지목한 두 화면(상담 헤더 · 자유글 작성 헤더)이 맨
 *     `Pressable hitSlop` 으로 되돌아가지 않는다.
 *
 * 2번을 소스 스캔으로 하는 이유: 되돌아가는 방법이 "컴포넌트를 안 쓰는 것" 이라
 * 렌더 테스트로는 잡히지 않는다(그 버튼이 아예 없어지므로).
 */
import fs from "node:fs"
import path from "node:path"

import {
  HEADER_TOUCH_SIZE,
  HeaderIconButton,
} from "@/src/shared/components/HeaderIconButton"

const ROOT = path.join(__dirname, "..")

/** 사용자가 "안 눌린다" 로 지목한 헤더들. */
const MIGRATED_HEADERS = [
  "src/features/consultation/components/ConsultChatHeader.tsx",
  "src/features/recipe/components/FreePostEditor.tsx",
  // 커뮤니티 동선 — 피드 → 글 상세 → 검색 → 수정. 사용자가 "타고 들어간다" 고 한 길.
  "src/features/recipe/views/PostDetailScreen.tsx",
  "app/(tabs)/community.tsx",
  "src/features/recipe/views/FreePostEditScreen.tsx",
  "src/features/recipe/views/CommunitySearchScreen.tsx",
]

type Style = Record<string, number>

/** `HeaderIconButton` 이 Pressable 에 넘기는 style 배열을 눌린/안 눌린 상태로 편다. */
function boxStyle(visualSize?: number): Style {
  const element = HeaderIconButton({
    onPress: () => {},
    accessibilityLabel: "닫기",
    children: null,
    ...(visualSize === undefined ? {} : { visualSize }),
  }) as { props: { style: (state: { pressed: boolean }) => unknown } }
  const styles = element.props.style({ pressed: false })
  return (Array.isArray(styles) ? styles : [styles])
    .flat(Infinity)
    .filter((s): s is Style => typeof s === "object" && s !== null)
    .reduce<Style>((acc, s) => ({ ...acc, ...s }), {})
}

describe("헤더 터치 타깃", () => {
  test("상자가 플랫폼 최소 규격이다", () => {
    // 테스트는 node 환경(Platform.OS='ios' 스텁)에서 돈다 — 상수와 상자를 함께 본다.
    expect(HEADER_TOUCH_SIZE).toBeGreaterThanOrEqual(44)
    const style = boxStyle()
    expect(style.width).toBe(HEADER_TOUCH_SIZE)
    expect(style.height).toBe(HEADER_TOUCH_SIZE)
  })

  test("레이아웃 자리는 아이콘 크기 그대로다 (음수 마진)", () => {
    const style = boxStyle(24)
    // 상자(44/48) + 마진×2 = 24. 이 등식이 깨지면 헤더 간격이 눈에 띄게 벌어진다.
    expect(style.width + style.margin * 2).toBe(24)
    expect(style.margin).toBeLessThan(0)
  })

  test("아이콘이 커지면 마진도 따라 준다", () => {
    const style = boxStyle(32)
    expect(style.width + style.margin * 2).toBe(32)
  })

  test("지목된 헤더들이 맨 Pressable+hitSlop 으로 되돌아가지 않았다", () => {
    for (const relative of MIGRATED_HEADERS) {
      const source = fs.readFileSync(path.join(ROOT, relative), "utf8")
      expect(source).toContain("HeaderIconButton")
    }
  })

  test("아이콘만 있는 액션 행에는 자리를 만들어 준다", () => {
    /*
      안드로이드는 부모 경계 밖 터치를 자식에게 안 준다. 콘텐츠 높이로 사는
      액션 행(글 상세 앱바 우측, 커뮤니티 헤더 우측)은 규격 상자보다 낮으므로
      `headerActionRowRoom` 없이는 상자를 키운 절반이 죽는다.
    */
    for (const relative of ["src/features/recipe/views/PostDetailScreen.tsx", "app/(tabs)/community.tsx"]) {
      const source = fs.readFileSync(path.join(ROOT, relative), "utf8")
      expect(source).toContain("headerActionRowRoom(")
    }
  })

  test("상담 헤더의 버튼 셋이 전부 규격 컴포넌트다", () => {
    const source = fs.readFileSync(
      path.join(ROOT, MIGRATED_HEADERS[0]),
      "utf8",
    )
    // 닫기 · 기록 · 새 상담 — 조건부 갈래까지 세면 여는 태그가 4개다.
    expect(source.match(/<HeaderIconButton/gu)?.length).toBe(4)
    // 맨 Pressable 이 하나라도 남아 있으면 그 버튼만 40pt 로 남는다.
    expect(source).not.toMatch(/<Pressable/u)
  })
})
