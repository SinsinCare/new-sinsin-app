import * as Haptics from "expo-haptics"

/**
 * 햅틱은 "됐다/안 됐다"를 눈보다 먼저 알려주는 신호다. 실패해도 화면이 멈추면 안 되므로
 * 전부 fire-and-forget 으로 두고 오류는 삼킨다(시뮬레이터·햅틱 없는 기기에서 흔히 거절된다).
 */
function fire(run: () => Promise<void>) {
  // 동기 throw 도 삼킨다. 네이티브 모듈이 없는 빌드(구 dev client, 시뮬레이터)에서는
  // 호출 즉시 던지는데, 그게 눌림 핸들러를 통째로 죽여 버튼이 먹통이 된다.
  try {
    void run().catch(() => {})
  } catch {
    // 촉감은 보조 신호다. 없으면 없는 대로 간다.
  }
}

/** 선택지를 고를 때. 가장 가벼운 톡. */
export function hapticSelection() {
  fire(() => Haptics.selectionAsync())
}

/** 다음 단계로 넘어갈 때. */
export function hapticStepAdvance() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

/** 입력이 막혔을 때. 화면의 흔들림과 짝을 이룬다. */
export function hapticInvalid() {
  fire(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  )
}
