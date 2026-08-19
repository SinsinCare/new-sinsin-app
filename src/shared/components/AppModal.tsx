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
          // 형제가 보이는 동안은 큐 밖에서 기다린다 — 큐 안에서 기다리면
          // 그 형제의 dismiss 전이까지 막아 데드락이 된다.
          let waited = false
          while (isCurrent() && visibleModalCount() !== depth) {
            if (!waited) {
              waited = true
              logger.debug(
                `[AppModal] present 대기: depth=${depth}, visible=${visibleModalCount()}`,
              )
            }
            await whenRegistryChanges()
          }
          if (!isCurrent()) return
          const outcome = await enqueueTransition(async () => {
            if (!isCurrent()) return "cancelled" as const
            // 차례가 오는 사이 다른 형제가 떴을 수 있다 — 다시 대기로.
            if (visibleModalCount() !== depth) return "retry" as const
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
        if (!isCurrent()) return
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
