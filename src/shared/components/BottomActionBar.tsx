import { V2BottomCTA } from "@/src/design-system-v2"

interface BottomActionBarProps {
  label: string
  onPress: () => void
  disabled?: boolean
}

/**
 * 화면 하단의 주 행동 하나. 설정·탈퇴·문의·건강자료 화면이 전부 이걸 쓴다.
 *
 * **속은 정본 `V2BottomCTA`(Figma node 89:7358)다.** 예전에는 같은 역할을 하는 바가
 * 둘이었다 — 이쪽은 `SurfacePressable` 로 조립한 자체 버튼, 식당 탭은 `V2BottomCTA`.
 * 높이·라디우스는 같았지만 눌림·비활성·키보드 대응이 서로 달랐다.
 *
 * 껍데기를 남긴 이유는 호출부 9곳의 이름과 프롭을 그대로 두기 위해서다. 새 화면은
 * `V2BottomCTA` 를 직접 쓰는 쪽이 낫다 — 2버튼 배치(가로/세로)가 거기 있다.
 *
 * **`paddingBottom` 프롭은 없앴다.** 호출부 9곳이 전부 `insets.bottom + 16` 을 넘기고
 * 있었는데, 그건 CTA 가 스스로 알아야 하는 값이다. `V2BottomCTA` 는 홈 인디케이터를
 * 피하고 **키보드가 올라오면 그 여백을 걷는다** — 예전 바에는 없던 동작이라
 * 입력이 있는 편집 화면(닉네임·이름·비밀번호)에서 버튼이 키보드 위로 붙는다.
 */
export function BottomActionBar({
  label,
  onPress,
  disabled = false,
}: BottomActionBarProps) {
  return (
    <V2BottomCTA
      primaryLabel={label}
      onPrimary={onPress}
      primaryProps={{ disabled }}
    />
  )
}
