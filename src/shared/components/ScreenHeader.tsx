/**
 * 설정·마이페이지 계열의 앱바.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ■ 2026-07-31: **껍데기만 남기고 DS 헤더에 위임한다**
 *
 * 이 컴포넌트는 28개 화면(설정 전부 + 몇몇)이 쓰는데, 앱의 나머지가 서 있는
 * `V2ScreenHeader` 와 다르게 생겼었다:
 *
 * | | 이 헤더(종전) | `V2ScreenHeader`(앱의 나머지) |
 * |---|---|---|
 * | 제목 위치 | 가운데(양옆 24pt 자리표시자) | **왼쪽**, 뒤로가기 바로 옆 |
 * | 제목 크기 | 18 / `fontWeight: "600"` | `typography.label.small`(15, semibold **face**) |
 * | 좌우 여백 | 20 | `spacing[4]` + 터치타깃이 시각 여백을 겸함 |
 * | 색 | `tokens.color.textDark` / `#17191C` 하드코딩 | `colors.label.strong`(테마) |
 * | 안전영역 | **호출부가 `paddingTop` 으로** 넘김 | 컴포넌트가 스스로 처리 |
 *
 * 그래서 설정에서 레시피 상세로 넘어가면 제목이 가운데 → 왼쪽으로 튀고 크기도 달라졌다.
 * 화면 28개를 각각 고치는 대신 **이 파일 하나가 위임**하게 만들었다 — 호출부는 한 줄도
 * 바뀌지 않고, 앱의 헤더가 하나가 된다.
 *
 * `fontWeight` 를 쓰지 않게 된 것도 부수 효과가 아니다: Pretendard 가 굵기별 4파일로
 * 로드돼 있어 face 위에 weight 를 겹치면 iOS 에서 가짜 볼드가 난다(`typography.ts` 머리말).
 *
 * ■ `paddingTop` 은 **받되 쓰지 않는다**
 *
 * 호출부 대부분이 `insets.top + 8` 을 넘긴다. `V2ScreenHeader` 는 안전영역을 스스로 넣으므로
 * 그 값을 그대로 더하면 노치 아래가 두 번 밀린다. 그렇다고 prop 을 지우면 28곳을 동시에
 * 고쳐야 한다 — 그건 이 변경의 목적(호출부를 건드리지 않는 것)과 반대다.
 *
 * 대신 **의도를 읽는다**: 양수를 넘겼다는 것은 "노치를 피해 달라" 는 뜻이므로 안전영역을
 * 켜고, 0/미지정이면 이미 여백이 있는 컨테이너 안이라는 뜻이므로 끈다. 값 자체는 버린다.
 */
import type { ReactNode } from "react"

import { V2ScreenHeader } from "@/src/design-system-v2"

interface ScreenHeaderProps {
  title: string
  /**
   * @deprecated 값은 쓰이지 않는다. 양수면 안전영역을 켜는 신호로만 읽는다(머리말 참고).
   * 새 화면은 `V2ScreenHeader` 를 직접 쓰고 이 prop 을 넘기지 않는다.
   */
  paddingTop?: number
  onBack?: () => void
  rightElement?: ReactNode
}

export function ScreenHeader({
  title,
  paddingTop = 0,
  onBack,
  rightElement,
}: ScreenHeaderProps) {
  return (
    <V2ScreenHeader
      title={title}
      onBack={onBack}
      right={rightElement}
      safeAreaTop={paddingTop > 0}
    />
  )
}
