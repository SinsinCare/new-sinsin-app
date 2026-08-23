// Design System v2 — 시트 안의 스크롤
//
// `V2BottomSheet` 는 콘텐츠 높이대로 자라므로 대개 스크롤이 필요 없다. 이건 **목록이
// 화면을 다 먹으면 안 되는 경우**를 위한 것이다 — 소비처가 `style={{ maxHeight }}` 로
// 상한을 정하고, 그 안에서 넘치는 만큼만 스크롤된다(카테고리 목록, 필터 칩 무리).
//
// 담고 있는 것은 시트 안 스크롤의 기본값 세 줄뿐이다:
//  - `bounces={false}` / `overScrollMode="never"` — 시트 안에서 튕기면 시트가 같이
//    끌리는 것처럼 보인다. 팬은 핸들만 잡는다는 규칙(V2BottomSheet 머리말)과 맞춘다.
//  - `keyboardShouldPersistTaps="handled"` — 없으면 키패드가 떠 있을 때 첫 탭이 키보드
//    닫기에 먹혀 행을 두 번 눌러야 한다.
//  - 스크롤 인디케이터는 숨긴다(시트 안에서는 소음이다).
//
// **바닥 여백은 주지 않는다.** 예전 `AppBottomSheetScrollView` 는 여기서
// safe-area + 16 을 더했는데, `V2BottomSheet` 가 이미 콘텐츠 바닥에 같은 몫을 준다 —
// 두 겹이 되면서 필터 시트에서는 스크롤 끝에 빈 50pt 가 생기고(그 아래 적용 버튼이
// 따로 있다) 카테고리 시트에서는 마지막 행 밑이 두 배로 벌어졌다. 시트 바닥의 여백은
// 시트 몫이다.

import { ScrollView, type ScrollViewProps } from "react-native"

export function V2SheetScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      {...props}
      showsVerticalScrollIndicator={props.showsVerticalScrollIndicator ?? false}
    />
  )
}
