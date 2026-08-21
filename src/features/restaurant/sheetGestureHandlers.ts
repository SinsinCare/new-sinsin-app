/**
 * 지도 시트의 **손 뗀 뒤 스냅 규칙**만 갈아 끼우는 훅.
 *
 * `@gorhom/bottom-sheet` 는 `gestureEventsHandlersHook` 이라는 공개 확장점을 준다
 * (`BottomSheet` 의 prop). 기본 구현(`useGestureEventsHandlersDefault`)도 공개 export 라서,
 * **드래그 중 동작은 그대로 두고 `handleOnEnd` 하나만** 우리 규칙으로 바꾼다. 라이브러리를
 * 포크하거나 내부 파일을 import 하지 않는다.
 *
 * ## 왜 바꾸나 — 마우스로는 안 보이던 버그 (실측 2026-08-17, iOS 시뮬레이터)
 *
 * 기본 규칙은 `놓은 위치 + 0.2 × 속도` 에서 가장 가까운 스냅으로 간다. 시뮬레이터에서
 * 마우스로 끌면 속도가 300pt/s 안팎이라 투영이 60pt 뿐이고, 그래서 개발 내내 얌전해
 * 보인다. 실제 손가락 플릭은 3,000pt/s 가 예사고 투영이 600pt 다 —
 * **전체에서 180pt 만 튕겨 내렸는데 중간을 건너뛰고 접힘까지 내려갔다.**
 * 반대로 짧게 끌면(스냅 간격의 절반인 185pt 미만) 제자리로 되돌아온다.
 *
 * "조금 끌면 안 가고, 튕기면 끝까지 간다" 가 곧 사용자가 말한 **"너무 올렸다 내렸다"** 다.
 * 새 규칙과 그 근거는 `../sheetSnap` 의 `resolveDetentIndex` 머리말에 있다.
 *
 * ## 기본 구현에서 **반드시 그대로 가져와야 하는** 것
 *
 * - `source === CONTENT && contentOffsetY > 0 && 시트가 최상단` → **아무것도 하지 않는다.**
 *   목록을 스크롤하는 동안 시트가 따라 내려가지 않게 하는 유일한 방어다. 이걸 빠뜨리면
 *   목록을 훑을 때마다 시트가 중간으로 주저앉는다.
 * - 새로고침 컨트롤이 걸린 채 최상단이면 제스처를 넘기지 않는다(우리는 안 쓰지만 계약이다).
 * - 키보드로 인한 임시 위치(`isInTemporaryPosition`)와 `enablePanDownToClose` 는
 *   **기본 구현에 그대로 위임한다.** 이 시트에는 입력창도 닫힘 스냅도 없어서 우리 규칙이
 *   그 경우를 검증할 방법이 없다 — 검증 못 한 경로를 새로 쓰지 않는다.
 */

import { useCallback } from "react"
import { useSharedValue } from "react-native-reanimated"
import {
  ANIMATION_SOURCE,
  GESTURE_SOURCE,
  useBottomSheetInternal,
  useGestureEventsHandlersDefault,
  type GestureEventHandlerCallbackType,
  type GestureEventsHandlersHookType,
} from "@gorhom/bottom-sheet"

import { resolveDetentIndex } from "./sheetSnap"

export const useSheetGestureEventsHandlers: GestureEventsHandlersHookType =
  () => {
    const {
      animatedPosition,
      animatedDetentsState,
      animatedScrollableState,
      isInTemporaryPosition,
      enablePanDownToClose,
      animateToPosition,
    } = useBottomSheetInternal()

    const base = useGestureEventsHandlersDefault()
    const {
      handleOnStart: baseOnStart,
      handleOnChange: baseOnChange,
      handleOnEnd: baseOnEnd,
    } = base

    /**
     * 제스처가 시작될 때의 시트 윗변. 기본 구현도 같은 값을 자기 context 에 담지만
     * 그 context 는 훅 안에 갇혀 있어 밖에서 읽을 수 없다 — 그래서 한 번 더 적어 둔다.
     */
    const gestureStartPosition = useSharedValue(0)
    /**
     * 활성화 시점에 이미 쌓여 있던 `translationY`.
     *
     * 시트는 `activeOffsetY=[-10,10]` 로 **10pt 를 움직인 뒤에야** 팬을 시작한다(그래야
     * 카드 탭이 살아남는다 — `RestaurantListSheet` 의 그 prop 주석). 그런데 RNGH 의
     * `translationY` 는 **손가락이 닿은 지점**부터 재므로, 활성화되는 첫 프레임에 이미
     * ±10 이 들어 있다. 그대로 쓰면 시트가 손가락을 10pt 앞질러 **툭 튄다.**
     * 그 값을 빼면 시트 윗변이 손가락과 정확히 같이 움직인다.
     */
    const activationTranslationY = useSharedValue(0)

    const handleOnStart: GestureEventHandlerCallbackType = useCallback(
      function handleOnStart(source, payload) {
        "worklet"
        gestureStartPosition.value = animatedPosition.value
        activationTranslationY.value = payload.translationY
        baseOnStart(source, payload)
      },
      [
        gestureStartPosition,
        activationTranslationY,
        animatedPosition,
        baseOnStart,
      ],
    )

    const handleOnChange: GestureEventHandlerCallbackType = useCallback(
      function handleOnChange(source, payload) {
        "worklet"
        baseOnChange(source, {
          ...payload,
          translationY: payload.translationY - activationTranslationY.value,
        })
      },
      [activationTranslationY, baseOnChange],
    )

    const handleOnEnd: GestureEventHandlerCallbackType = useCallback(
      function handleOnEnd(source, payload) {
        "worklet"
        const { detents } = animatedDetentsState.get()
        const { refreshable, contentOffsetY } = animatedScrollableState.get()

        // 검증하지 않은 경로는 기본 구현에 맡긴다(파일 머리말).
        if (!detents || detents.length === 0) return
        if (enablePanDownToClose || isInTemporaryPosition.value) {
          baseOnEnd(source, payload)
          return
        }

        const highestDetent = detents[detents.length - 1]
        const isAtHighest = animatedPosition.value === highestDetent

        // 새로고침 중이면 제스처는 그쪽 것이다.
        if (source === GESTURE_SOURCE.CONTENT && refreshable && isAtHighest) {
          return
        }
        /*
          **목록을 스크롤한 제스처는 시트를 움직이지 않는다.** 최상단에서 목록을 훑다가
          손을 떼면 그 손짓의 이동·속도는 전부 스크롤의 것이므로, 그것으로 스냅을 고르면
          시트가 목록과 함께 주저앉는다.
        */
        if (
          source === GESTURE_SOURCE.CONTENT &&
          contentOffsetY > 0 &&
          isAtHighest
        ) {
          return
        }

        const destination =
          detents[
            resolveDetentIndex({
              detents,
              startPosition: gestureStartPosition.value,
              releasePosition: animatedPosition.value,
              velocityY: payload.velocityY,
            })
          ]

        if (destination === animatedPosition.value) return
        /*
          속도를 스프링에 넘겨 손짓이 애니메이션으로 이어지게 한다. 목적지가 손가락이 간
          곳보다 앞설 수 없으므로(새 규칙) 이 속도가 과녁을 지나칠 일은 없고, 설정의
          `overshootClamping` 이 마지막 흔들림까지 막는다.
        */
        animateToPosition(
          destination,
          ANIMATION_SOURCE.GESTURE,
          payload.velocityY / 2,
        )
      },
      [
        animatedDetentsState,
        animatedScrollableState,
        animatedPosition,
        gestureStartPosition,
        isInTemporaryPosition,
        enablePanDownToClose,
        animateToPosition,
        baseOnEnd,
      ],
    )

    return {
      handleOnStart,
      handleOnChange,
      handleOnEnd,
      handleOnFinalize: base.handleOnFinalize,
    }
  }
