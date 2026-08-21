/**
 * 시트가 기억하는 **스크롤 오프셋을 실제 값과 맞춰 두는** 훅.
 *
 * `@gorhom/bottom-sheet` 의 `scrollEventsHandlersHook`(공개 prop) 자리에 끼우고,
 * 기본 구현(`useScrollEventsHandlersDefault`, 역시 공개 export)을 그대로 쓰되
 * `handleOnScroll` 에서 한 줄을 더 한다.
 *
 * ## 왜 필요한가 — **목록이 줄어들면 시트가 얼어붙는다** (실측 2026-08-17)
 *
 * 재현: 목록을 아래로 스크롤 → 필터를 걸어 0건(또는 결과가 적은 지역으로 이동) →
 * 시트가 펼침 상태에서 **콘텐츠를 아무리 끌어내려도 꿈쩍하지 않는다.** 핸들(32pt)로만
 * 내려간다. 중간 스냅에서는 멀쩡하다 — 이 비대칭이 원인을 가리킨다.
 *
 * gorhom 은 `animatedScrollableState.contentOffsetY` 를 **드래그 경계 이벤트에서만**
 * 갱신한다(`onBeginDrag`·`onEndDrag`·`onMomentumEnd`). 그런데 목록이 줄어들 때는
 * 스크롤뷰가 **손가락 없이** 오프셋을 0 으로 되감으므로 그 세 이벤트가 하나도 오지 않는다.
 * 결과: 실제 오프셋은 0 인데 시트는 "아직 1,500px 스크롤돼 있다" 고 믿는다.
 *
 * 그 낡은 값이 최상단 스냅에서만 치명적인 이유는 기본 팬 핸들러의 이 갈래다 —
 * `initialPosition === highestSnapPoint && source === CONTENT` 이면 드래그 변위에서
 * `contentOffsetY` 를 통째로 빼고(`negativeScrollableContentOffset`), 그 결과가 최상단으로
 * 클램프되어 **시트가 제자리에 못 박힌다.** 손을 뗄 때의 가드
 * (`contentOffsetY > 0 && 최상단이면 아무것도 하지 않는다`)가 마지막 못을 박는다.
 *
 * 그 가드 자체는 옳다 — 목록을 스크롤하던 손짓이 시트를 끌어내리면 안 된다. 틀린 것은
 * **입력값이 낡았다는 것**이다. 그래서 규칙을 바꾸지 않고 값을 맞춘다.
 *
 * ## 값을 맞추는 규칙
 *
 * - 잠긴 상태(최상단이 아닌 스냅)에서는 기본 구현이 이미 0/고정 위치로 못 박으므로 손대지 않는다.
 * - 스냅 애니메이션이 도는 중에는 건드리지 않는다(기본 구현이 같은 시점을 피한다).
 * - **콘텐츠가 뷰포트보다 짧으면 오프셋은 정의상 0이다.** 0건·1건처럼 스크롤이 불가능한
 *   목록에서 이 한 줄이 위 증상을 끝낸다.
 * - 값이 그대로면 쓰지 않는다 — 스크롤이 멈춰 있는 동안 매 프레임 shared value 를 만지지 않게.
 */

import { useCallback } from "react"
import {
  ANIMATION_STATUS,
  SCROLLABLE_STATUS,
  useBottomSheetInternal,
  useScrollEventsHandlersDefault,
  type ScrollEventHandlerCallbackType,
  type ScrollEventsHandlersHookType,
} from "@gorhom/bottom-sheet"

export const useSheetScrollEventsHandlers: ScrollEventsHandlersHookType = (
  scrollableRef,
  scrollableContentOffsetY,
) => {
  const {
    animatedScrollableState,
    animatedScrollableStatus,
    animatedAnimationState,
  } = useBottomSheetInternal()

  const base = useScrollEventsHandlersDefault(
    scrollableRef,
    scrollableContentOffsetY,
  )
  const baseOnScroll = base.handleOnScroll

  const handleOnScroll: ScrollEventHandlerCallbackType = useCallback(
    function handleOnScroll(event, context) {
      "worklet"
      baseOnScroll?.(event, context)

      if (animatedScrollableStatus.value === SCROLLABLE_STATUS.LOCKED) return
      if (animatedAnimationState.get().status === ANIMATION_STATUS.RUNNING) {
        return
      }

      /*
        스크롤이 가능한 목록인가. 불가능하면(0건·1건처럼 콘텐츠가 뷰포트보다 짧으면)
        오프셋은 실제 보고값과 무관하게 0 이다 — 이 판정이 있어야 "줄어든 목록" 이
        스크롤 이벤트를 한 번도 못 내보내는 경우까지 덮인다.
      */
      const canScroll =
        event.contentSize.height > event.layoutMeasurement.height + 1
      const offsetY = canScroll ? event.contentOffset.y : 0

      if (animatedScrollableState.get().contentOffsetY === offsetY) return
      scrollableContentOffsetY.value = offsetY
      animatedScrollableState.set((state) => ({
        ...state,
        contentOffsetY: offsetY,
      }))
    },
    [
      baseOnScroll,
      scrollableContentOffsetY,
      animatedScrollableState,
      animatedScrollableStatus,
      animatedAnimationState,
    ],
  )

  return { ...base, handleOnScroll }
}
