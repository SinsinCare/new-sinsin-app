import { createContext, useContext, useEffect, useRef, useState } from "react"
import { Modal, type ModalProps, Platform } from "react-native"
import { logger } from "@/src/lib/logger"
import {
  afterModalTransitions,
  afterSiblingModalsGone,
  allocateModalId,
  enqueueTransition,
  markModalGone,
  markModalPresented,
  visibleModalCount,
  whenRegistryChanges,
  withDeadline,
} from "./appModalGate"

/**
 * RN Modal 의 드롭인 대체 — iOS 에서 present/dismiss 를 전역 게이트로 직렬화한다.
 *
 * **왜**: 네이티브 모달 두 개의 전환이 겹치면 iOS 에서 앱 전체 터치가 죽는다
 * (appModalGate 머리말). 호출부마다 지연을 심는 대신, 모달 쪽에서 한 번에
 * 하나씩만 움직이게 한다. 새 코드에서 RN Modal 을 직접 쓰지 말고 이걸 쓸 것.
 *
 * - **전이 직렬화**: visible 이 바뀌면 즉시 present/dismiss 하지 않고 게이트
 *   큐에 세운다. 앞 전이의 onShow/onDismiss(또는 800ms 폴백)가 끝난 뒤 실행.
 * - **형제 대기**: 다른 모달이 이미 떠 있으면(내 조상이 아닌) 그 모달이 닫힐
 *   때까지 present 를 미룬다 — iOS 는 이 present 를 조용히 거부해 "보이지 않는
 *   유령 모달"을 만들기 때문. 닫히면 순서대로 뜬다(대기 모달리티).
 * - **중첩 인지**: 이 컴포넌트 안에 렌더된 AppModal 은 깊이 컨텍스트로 부모가
 *   떠 있는 상태를 정상으로 간주한다(FoodAnalysisResult 안의 이름 수정 모달 등).
 * - **Android**: UIKit 경합이 없으므로(모달=별도 Dialog 윈도) 그대로 통과.
 *
 * 라우터 push/pop 이나 Share 처럼 RN Modal 밖 네이티브 전환과 이어야 하면
 * 호출부에서 `afterModalTransitions()` 를 기다린 뒤 실행한다(appModalGate).
 */
export function AppModal(props: ModalProps) {
  if (Platform.OS !== "ios") return <Modal {...props} />
  return <IosGatedModal {...props} />
}

const ModalDepthContext = createContext(0)

/** 전이 완료 신호(onShow/onDismiss)가 유실됐을 때의 폴백. 전환은 길어야 ~500ms. */
const TRANSITION_DEADLINE_MS = 800
/** 언마운트 teardown 은 완료 신호가 없다 — 전환 길이만큼 큐를 잡아 둔다. */
const TEARDOWN_SETTLE_MS = 600
/**
 * 형제가 사라지길 기다리는 상한. 이 값을 넘기면 **기다림을 포기하고 present 한다.**
 *
 * 종전에는 `await whenRegistryChanges()` 를 조건이 맞을 때까지 무한히 돌았다. 그
 * 대기는 "레지스트리가 **다음에** 변할 때" 만 풀리므로, 해제 신호를 한 번이라도
 * 잃으면 **영원히** 풀리지 않는다. 그리고 이 게이트는 앱의 모든 모달이 지나는
 * 길목이라, 한 번 잃으면 그 뒤의 모든 시트·확인창·다이얼로그가 뜨지 않는다 —
 * 사용자에게는 "버튼을 눌러도 아무 일도 안 일어난다 = 앱이 얼었다" 로 보인다.
 * 이 파일의 다른 모든 대기(`withDeadline`)와 `afterSiblingModalsGone` 의 루프는
 * 이미 유한한데 여기만 아니었다.
 *
 * 포기하고 present 하는 쪽이 옳은 이유: 최악의 결과가 다르다. 계속 기다리면 앱이
 * 죽고, 포기하면 iOS 가 그 present 를 거부할 수 있을 뿐이다(그 경우 사용자는 다시
 * 누르면 된다). 회복 가능한 실패와 회복 불가능한 정지 중 어느 쪽인지는 비교할 필요가
 * 없다.
 */
const SIBLING_WAIT_DEADLINE_MS = 2_500

function IosGatedModal({
  visible = false,
  onShow,
  onDismiss,
  children,
  ...rest
}: ModalProps) {
  const depth = useContext(ModalDepthContext)
  const [mounted, setMounted] = useState(false)
  const idRef = useRef(0)
  if (idRef.current === 0) idRef.current = allocateModalId()
  const mountedRef = useRef(false)
  // visible 이 바뀔 때마다 +1 — 큐에서 차례를 기다리던 낡은 작업을 무효화한다.
  const generationRef = useRef(0)
  const showResolveRef = useRef<(() => void) | null>(null)
  const dismissResolveRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const id = idRef.current
    generationRef.current += 1
    const generation = generationRef.current
    const isCurrent = () => generationRef.current === generation

    if (visible) {
      void (async () => {
        for (;;) {
          /*
            형제가 보이는 동안은 큐 밖에서 기다린다 — 큐 안에서 기다리면 그 형제의
            dismiss 전이까지 막아 데드락이 된다.

            조건이 `!== depth` 가 아니라 `> depth` 인 이유: 내가 기다려야 하는 것은
            **나보다 많이** 떠 있는 경우뿐이다. 조상이 먼저 걷혀 수가 depth 아래로
            내려가면 그 수는 다시 올라오지 않으므로, `!==` 로 재면 영원히 못 빠져
            나온다. 그 상태에서 나는 그냥 뜨면 된다.

            그리고 이 대기에는 상한이 있다(`SIBLING_WAIT_DEADLINE_MS`). 근거는 그
            상수 주석에.
          */
          let waited = false
          const waitUntil = Date.now() + SIBLING_WAIT_DEADLINE_MS
          while (isCurrent() && visibleModalCount() > depth) {
            const remaining = waitUntil - Date.now()
            if (remaining <= 0) {
              logger.error(
                `[AppModal] 형제 대기 상한 초과 — 그대로 present 한다: depth=${depth}, visible=${visibleModalCount()}`,
              )
              break
            }
            if (!waited) {
              waited = true
              logger.debug(
                `[AppModal] present 대기: depth=${depth}, visible=${visibleModalCount()}`,
              )
            }
            await withDeadline(whenRegistryChanges(), remaining)
          }
          if (!isCurrent()) return
          const outcome = await enqueueTransition(async () => {
            if (!isCurrent()) return "cancelled" as const
            /*
              차례가 오는 사이 다른 형제가 떴을 수 있다 — 다시 대기로. 단 위 루프가
              상한을 넘겨 빠져나온 경우에는 재시도하지 않는다. 그러면 "대기 → 상한 →
              재시도 → 대기" 가 무한히 도는, 마감시한을 둔 의미가 없는 고리가 된다.
            */
            if (visibleModalCount() > depth && Date.now() < waitUntil) {
              return "retry" as const
            }
            markModalPresented(id)
            mountedRef.current = true
            const shown = new Promise<void>((resolve) => {
              showResolveRef.current = resolve
            })
            setMounted(true)
            await withDeadline(shown, TRANSITION_DEADLINE_MS)
            return "done" as const
          })
          if (outcome !== "retry") return
        }
      })()
    } else {
      void enqueueTransition(async () => {
        // present 차례가 오기 전에 취소된 경우 — 내릴 것이 없다.
        if (!mountedRef.current) return
        /*
          dismiss 는 세대가 바뀌어도 취소하지 않는다.

          visible: true → false → true 가 dismiss 차례 전에 빠르게 이어지면 마지막
          true 가 generation 을 갱신한다. 예전 코드는 이 false 작업을 "낡았다"고
          버렸지만, 이미 떠 있는 네이티브 Modal 과 레지스트리는 그대로였다. 새 true
          작업은 `visibleModalCount() !== depth` 에서 자기 자신이 사라지길 기다리므로
          영원히 진행하지 못하고, 투명 모달이 아래 스크롤을 계속 먹었다.

          이미 떠 있는 것을 먼저 완전히 dismiss 한 뒤 최신 true 가 다시 present 하는
          것이 유일하게 직렬화되는 순서다. 뒤에 false 가 한 번 더 와도 그 작업은
          `mountedRef.current === false` 에서 안전하게 끝난다.
        */
        mountedRef.current = false
        const gone = new Promise<void>((resolve) => {
          dismissResolveRef.current = resolve
        })
        setMounted(false)
        await withDeadline(gone, TRANSITION_DEADLINE_MS)
        markModalGone(id)
      })
    }
  }, [visible, depth])

  useEffect(() => {
    const id = idRef.current
    return () => {
      generationRef.current += 1
      if (mountedRef.current) {
        // 보이는 채 언마운트 — teardown 전환이 돌므로 그 시간만큼 큐를 잡는다.
        mountedRef.current = false
        void enqueueTransition(
          () => new Promise<void>((r) => setTimeout(r, TEARDOWN_SETTLE_MS)),
        )
      }
      markModalGone(id)
    }
  }, [])

  return (
    <Modal
      {...rest}
      visible={mounted}
      onShow={(event) => {
        showResolveRef.current?.()
        showResolveRef.current = null
        onShow?.(event)
      }}
      onDismiss={() => {
        dismissResolveRef.current?.()
        dismissResolveRef.current = null
        onDismiss?.()
      }}
    >
      <ModalDepthContext.Provider value={depth + 1}>
        {children}
      </ModalDepthContext.Provider>
    </Modal>
  )
}

export { afterModalTransitions, afterSiblingModalsGone }
