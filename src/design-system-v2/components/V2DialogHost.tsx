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
import { Pressable, StyleSheet, Text, View } from "react-native"
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
  request: DialogRequest
  resolve: (result: DialogResult) => void
}

export function V2DialogHost() {
  const { t } = useTranslation()
  const { colors } = useV2Theme()
  const [queue, setQueue] = useState<QueueItem[]>([])

  // 큐를 렌더 없이 읽기 위한 거울 — 언마운트 정리에서 쓴다
  const queueRef = useRef<QueueItem[]>([])
  queueRef.current = queue

  useEffect(() => {
    const unregister = registerDialogHost(
      (request) =>
        new Promise<DialogResult>((resolve) => {
          setQueue((prev) => [...prev, { request, resolve }])
        }),
    )
    return () => {
      unregister()
      // 화면이 사라지면 대기 중이던 약속은 "취소"로 닫는다.
      // 안 그러면 await 한 호출부가 영영 안 깨어난다.
      queueRef.current.forEach((item) => item.resolve(null))
    }
  }, [])

  // 머리 하나를 답과 함께 보낸다. 뒤가 남아 있으면 표면은 닫지 않고
  // 내용만 갈아끼운다 — dismiss/present 를 왕복하면 iOS 가 뒤엣것을 흘린다.
  const settle = useCallback((result: DialogResult) => {
    setQueue((prev) => {
      const [head, ...rest] = prev
      head?.resolve(result)
      return rest
    })
  }, [])

  const current = queue[0]?.request
  const isSheet = current?.kind === "sheet"

  return (
    <>
      <V2Modal
        visible={current != null && !isSheet}
        title={current?.title ?? ""}
        description={current?.description}
        destructive={current?.destructive}
        buttonLayout={current?.buttonLayout}
        primaryLabel={current?.confirmLabel ?? t("action.confirm")}
        onPrimary={() => settle(0)}
        // alert 은 버튼 하나 — secondaryLabel 을 안 주면 V2Modal 이 Alert 로 그린다
        secondaryLabel={
          current?.kind === "confirm"
            ? (current.cancelLabel ?? t("action.cancel"))
            : undefined
        }
        onSecondary={() => settle(null)}
        onRequestClose={() => settle(null)}
      />

      <V2BottomSheet
        visible={isSheet}
        onClose={() => settle(null)}
        title={current?.title || undefined}
        subTitle={current?.description}
        secondaryLabel={current?.cancelLabel ?? t("action.cancel")}
        onSecondary={() => settle(null)}
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
              onPress={() => settle(index)}
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
