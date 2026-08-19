import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { StyleSheet, View } from "react-native"

/**
 * 화면 최상단으로 내용을 텔레포트하는 포털.
 *
 * ■ 왜 직접 만드나 — `@tamagui/portal` 을 걷어내려고 (2026-08-19)
 *
 *   tamagui 이행에서 `Portal` 은 색·레이아웃과 달리 **동작**이 걸린 의존이라
 *   그냥 지울 수 없었다. 세 곳이 쓴다:
 *     LoadingOverlay · RecommendedUpdatePrompt · AnnouncementPopupModal
 *   셋 다 "탭바까지 덮는 전면 막" 이 목적이고, 그래서 RN `Modal` 이 아니다 —
 *   iOS 에서 Modal 은 자기 VC 에서 present 하므로 다른 네이티브 모달과 전환이
 *   겹치면 UIKit 이 꼬인다(LoadingOverlay 머리말에 그 사고 기록이 있다).
 *
 *   `react-native-screens` 의 `FullWindowOverlay` 는 iOS 전용이라 대안이 못 된다.
 *   JS 트리 안에서 최상단에 그리는 방식이 세 곳의 요구를 그대로 만족한다.
 *
 * ■ 쓰는 법
 *
 *   루트에 호스트를 한 번 깔고(`<PortalProvider>` 안에 `<PortalHost />`),
 *   보내고 싶은 곳에서 `<Portal>{...}</Portal>` 로 감싼다.
 */

type PortalEntry = { id: string; node: ReactNode }

interface PortalRegistry {
  mount: (id: string, node: ReactNode) => void
  unmount: (id: string) => void
}

const PortalContext = createContext<PortalRegistry | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<PortalEntry[]>([])

  const mount = useCallback((id: string, node: ReactNode) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      next.push({ id, node })
      return next
    })
  }, [])

  const unmount = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const registry = useMemo(() => ({ mount, unmount }), [mount, unmount])

  return (
    <PortalContext.Provider value={registry}>
      {children}
      {/*
        `pointerEvents="box-none"` — 포털에 아무것도 없을 때 이 층이 화면 전체의
        터치를 먹으면 앱이 죽은 것처럼 보인다. 자식이 있을 때만 그 자식이 받는다.
      */}
      {entries.length > 0 && (
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
          collapsable={false}
        >
          {entries.map((e) => (
            <View
              key={e.id}
              style={StyleSheet.absoluteFill}
              pointerEvents="box-none"
            >
              {e.node}
            </View>
          ))}
        </View>
      )}
    </PortalContext.Provider>
  )
}

export function Portal({ children }: { children: ReactNode }) {
  const registry = useContext(PortalContext)
  const id = useId()

  useEffect(() => {
    if (!registry) return
    registry.mount(id, children)
    return () => registry.unmount(id)
  }, [registry, id, children])

  /*
    Provider 밖에서 쓰면 조용히 사라지는 대신 **제자리에 그린다.** 전면 막이
    안 뜨는 것보다 잘못된 위치에라도 보이는 편이 낫다(디버깅도 쉽다).
  */
  if (!registry) return <>{children}</>
  return null
}
