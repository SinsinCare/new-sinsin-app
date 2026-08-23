// Design System v2 — 시트 안의 텍스트 입력
//
// `V2BottomSheet` 안에서 입력을 받을 때는 **평범한 RN `TextInput` 을 쓰면 안 된다.**
// 시트가 키보드를 피해 주지 않는다.
//
// gorhom 은 키보드가 떴다는 사실만으로는 시트를 움직이지 않는다. `useAnimatedKeyboard`
// 가 keyboardDidShow 를 받을 때 **어떤 입력이 포커스를 가졌는지(`target`)** 가 아직
// 비어 있으면 그 이벤트를 캐시만 하고 그대로 빠져나간다 — 그리고 `target` 은 이
// 컴포넌트(`BottomSheetTextInput`)의 `onFocus` 만이 채운다. 즉 평범한 `TextInput` 에
// 포커스를 주면 키보드는 뜨고 시트는 제자리에 남아, 키패드가 CTA 를 그대로 덮는다.
// (조용히 아무 일도 일어나지 않는 종류의 결함이다 — 경고도 없다.)
//
// 그래서 시트 안의 입력은 전부 이걸 쓴다. props 는 RN `TextInput` 과 같다.
//
// 주의: 이 입력은 `V2BottomSheet`(gorhom) **안에서만** 산다 — 시트 컨텍스트가 없으면
// 마운트 시점에 던진다. 시트 밖 화면 입력은 `V2TextField` 다.
//
// ## `V2TextField` 의 `inputComponent` 와의 관계 — **대체가 아니라 보완**
//
// `V2TextField` 는 라벨·헬퍼·에러·박스/밑줄 크롬을 그리는 **필드**고, 이건 그 안에 들어가는
// **입력 하나**다. 그래서 시트 안에서 라벨 달린 필드가 필요하면 둘을 겹쳐 쓴다:
//
//   <V2TextField variant="line" label="기타 사유" inputComponent={V2SheetTextInput} … />
//
// 왜 `V2TextField` 가 "시트 안이면 알아서" 이걸 쓰지 않는가:
//  1. 이 입력은 시트 컨텍스트가 없으면 **던진다.** 자동 판별이 틀리면 화면이 죽는다.
//  2. `V2TextField` 가 이 파일을 import 하면 그 필드를 쓰는 **모든 화면**이 gorhom 을
//     번들에 끌고 온다. 시트 밖 소비처가 압도적으로 많다.
// 그래서 "시트 안이냐" 는 소비처만 아는 사실로 두고, 필드는 구현을 받기만 한다.
//
// 크롬이 필요 없는 맨 입력(댓글 컴포저처럼 자기 바를 직접 그리는 곳)은 이걸 **그대로** 쓴다.

import { BottomSheetTextInput } from "@gorhom/bottom-sheet"
import type { ComponentRef } from "react"

export const V2SheetTextInput = BottomSheetTextInput

/** `useRef<V2SheetTextInputRef>(null)` — `focus()` 로 칸을 옮길 때 쓴다. */
export type V2SheetTextInputRef = ComponentRef<typeof BottomSheetTextInput>
