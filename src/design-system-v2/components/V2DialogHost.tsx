import { Text } from "@/src/design-system-v2/primitives/NativeText"
// Design System v2 — 명령형 다이얼로그 호스트
//
// `showConfirm` / `showAlert` / `showActionSheet`(src/lib/dialog.ts) 의 그림 담당.
// 앱 루트에 하나 두면 화면 어디서든 부를 수 있다.
//
// 선택지 개수가 표면을 정한다 — 둘 이하면 V2Modal, 셋 이상이면 V2BottomSheet.
// 버튼 세 개를 가로로 분할한 다이얼로그는 라벨이 먼저 죽는다.
//
// **RN Modal 안에서 부를 땐 그 안에도 하나 더 얹어야 한다.** iOS 는 모달을
// 자기 뷰트리의 UIViewController 에서 present 하는데(RCTModalHostViewComponentView.mm
// `presentViewController:` → `[self reactViewController]`, topmost 탐색 없음),
// 이미 화면 모달이 떠 있으면 루트 VC 는 present 를 거부한다 — 다이얼로그가
// 조용히 안 뜬다. 네이티브 Alert 은 별도 UIWindow 라 이 문제가 없었을 뿐이다.
// 호스트는 스택이라 안쪽에 하나 더 마운트하면 그쪽이 요청을 가져간다:
//
// ```tsx
// <Modal visible={open}>
//   <MediaPickerBody />
//   <V2DialogHost />   {/* 이 모달 안에서 뜨는 확인창 담당 */}
// </Modal>
// ```

import { useCallback, useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  registerDialogHost,
  type DialogRequest,
  type DialogResult,
} from "@/src/lib/dialog"
// 배럴(../components) 대신 직접 경로 import — 순환참조 방지
import { V2Modal } from "./V2Modal"
import { V2BottomSheet } from "./V2BottomSheet"
import { useV2Theme } from "../hooks/useV2Theme"
import { spacing, typography } from "../tokens"

type QueueItem = {
  id: number
  request: DialogRequest
  resolve: (result: DialogResult) => void
}

export function V2DialogHost() {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const nextIdRef = useRef(1)

  // 큐를 렌더 없이 읽기 위한 거울 — 언마운트 정리에서 쓴다
  const queueRef = useRef<QueueItem[]>([])
  queueRef.current = queue

  useEffect(() => {
    const unregister = registerDialogHost(
      (request) =>
        new Promise<DialogResult>((resolve) => {
          const item = { id: nextIdRef.current++, request, resolve }
          const next = [...queueRef.current, item]
          // 등록은 React 배치보다 먼저 연속해서 들어올 수 있다. ref를 먼저 갱신해야
          // 같은 틱의 두 번째 요청이 첫 번째 요청을 덮어쓰지 않는다.
          queueRef.current = next
          setQueue(next)
        }),
    )
    return () => {
      unregister()
      // 화면이 사라지면 대기 중이던 약속은 "취소"로 닫는다.
      // 안 그러면 await 한 호출부가 영영 안 깨어난다.
      queueRef.current.forEach((item) => item.resolve(null))
    }
  }, [])

  // 렌더된 머리 **그 요청만** 답과 함께 보낸다. 버튼을 빠르게 두 번 눌러 같은
  // 콜백이 두 번 와도 뒤의 요청까지 꺼내면 안 된다. setState updater 안에서 Promise를
  // resolve 하면 Strict Mode 재실행 때 부수효과가 반복되므로 ref를 권위 상태로 쓴다.
  const settle = useCallback((id: number | undefined, result: DialogResult) => {
    if (id == null) return
    const [head, ...rest] = queueRef.current
    if (head?.id !== id) return
    queueRef.current = rest
    head.resolve(result)
    setQueue(rest)
  }, [])

  const currentItem = queue[0]
  // visible=false 이후에도 네이티브 dismiss가 끝날 때까지 내용은 그려진다.
  // 빈 제목·기본 확인 버튼으로 교체하면 닫히는 중 빈 팝업이 한 번 더 보인다.
  const lastItemRef = useRef<QueueItem | undefined>(undefined)
  if (currentItem) lastItemRef.current = currentItem
  const current = (currentItem ?? lastItemRef.current)?.request
  const isSheet = current?.kind === "sheet"

  return (
    <>
      <V2Modal
        visible={currentItem != null && !isSheet}
        title={current?.title ?? ""}
        description={current?.description}
        destructive={current?.destructive}
        buttonLayout={current?.buttonLayout}
        primaryLabel={current?.confirmLabel ?? t("action.confirm")}
        onPrimary={() => settle(currentItem?.id, 0)}
        // alert 은 버튼 하나 — secondaryLabel 을 안 주면 V2Modal 이 Alert 로 그린다
        secondaryLabel={
          current?.kind === "confirm"
            ? (current.cancelLabel ?? t("action.cancel"))
            : undefined
        }
        onSecondary={() => settle(currentItem?.id, null)}
        onRequestClose={() => settle(currentItem?.id, null)}
      />

      <V2BottomSheet
        surface="dialog_action_sheet"
        visible={currentItem != null && isSheet}
        onClose={() => settle(currentItem?.id, null)}
        title={current?.title || undefined}
        subTitle={current?.description}
        secondaryLabel={current?.cancelLabel ?? t("action.cancel")}
        onSecondary={() => settle(currentItem?.id, null)}
      >
        {/* 맨 텍스트 줄은 "누를 수 있다"가 안 읽혀 시트가 미완처럼 보였다
            (QA 2026-08-06). 앱의 다른 시트 옵션과 같은 문법 — 면 있는 카드
            행으로 그린다. 항목이 하나뿐인 경우는 애초에 여기로 오지 않는다
            (dialog.ts 가 확인 다이얼로그로 강등). */}
        <View style={styles.actions}>
          {current?.actions?.map((action, index) => (
            <Pressable
              key={`${action.label}-${index}`}
              accessibilityRole="button"
              onPress={() => settle(currentItem?.id, index)}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: pressed
                    ? colors.fill.normal
                    : colors.fill.alternative,
                },
              ]}
            >
              <Text
                style={[
                  typography.title.xSmall,
                  {
                    color: action.destructive
                      ? colors.status.negative
                      : colors.label.normal,
                  },
                ]}
                lineBreakStrategyIOS="hangul-word"
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </V2BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  /* V2 시트의 내부 거터는 24 다(헤더·푸터·닫기 버튼 전부). 여기만 20 을 쓰면
     제목과 행의 왼쪽 라인이 어긋난다 — 실제로 어긋났었다(QA 2026-08-06). */
  actions: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[24],
    gap: spacing[8],
  },
  action: {
    minHeight: 56,
    paddingHorizontal: spacing[20],
    borderRadius: 14,
    justifyContent: "center",
  },
})
