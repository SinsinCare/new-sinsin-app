/**
 * WebView 프로세스 회수에서 **되살릴지, 포기할지**를 정하는 작은 상태 기계.
 *
 * iOS 는 앱이 백그라운드에 오래 있으면 메모리를 되찾으려고 WKWebView 의 콘텐츠
 * 프로세스를 죽인다(안드로이드는 렌더러 프로세스). 돌아오면 지도 자리는 빈 면이고
 * 브릿지는 끊겨 있다. 예전에는 이 이벤트를 곧장 `onMapError` 로 올려 화면이
 * "지도를 불러오지 못했어요" + 목록 모드로 내려갔다 — 사용자 신고 "지도 켜 둔 채
 * 다른 앱 갔다 오면 지도 오류"(2026-09-01)가 정확히 이것이다. 키·도메인·네트워크는
 * 멀쩡하므로 **다시 로드하면 그만**이다.
 *
 * 상한을 둔다: 같은 마운트에서 상한을 넘겨 죽으면 그건 프로세스 회수가 아니라
 * 페이지가 스스로 죽는 것(메모리 폭주 등)이라 그때는 실패로 올린다.
 *
 * 컴포넌트 밖에 두는 이유: 저장소의 jest 에는 렌더러가 없어 `RestaurantMapView` 를
 * 마운트해 `onContentProcessDidTerminate` 를 흘려 볼 수 없다. 판단만 떼어 두면
 * 그 판단은 검증되고, 배선은 타입이 지킨다.
 */

export interface ReviveController {
  /**
   * 프로세스가 죽었다. 되살리면 `true`(리로드가 호출됨), 포기하면 `false`(실패 콜백이
   * 호출됨).
   */
  processGone(reason: string): boolean
  /**
   * 페이지가 `ready` 를 보냈다. **되살아난 뒤의 ready** 였으면 `true` — 호출부는 그때만
   * 보던 자리·테마·문구를 되돌린다. 첫 로드의 ready 는 `false`.
   */
  consumeReady(): boolean
  /** 지금까지 되살린 횟수. */
  count(): number
}

export interface ReviveControllerOptions {
  /** 한 마운트에서 되살려 주는 상한. 넘기면 `fail`. */
  readonly maxRevives: number
  readonly reload: () => void
  readonly fail: (reason: string) => void
}

export function createReviveController({
  maxRevives,
  reload,
  fail,
}: ReviveControllerOptions): ReviveController {
  let revives = 0
  let reviving = false
  return {
    processGone: (reason) => {
      if (revives >= maxRevives) {
        fail(reason)
        return false
      }
      revives += 1
      reviving = true
      reload()
      return true
    },
    consumeReady: () => {
      const wasReviving = reviving
      reviving = false
      return wasReviving
    },
    count: () => revives,
  }
}
