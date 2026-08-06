// 명령형 다이얼로그 — `Alert.alert` 자리를 그대로 물려받는다.
//
// V2Modal 은 선언형(`visible` 상태 필요)이라 훅·서비스 모듈에서는 못 쓴다.
// 앱의 알림 절반은 useFoodAnalysis, imagePickerService, openAppSettings 처럼
// 컴포넌트가 아닌 곳에서 뜬다 — 그쪽 호출부를 전부 상태로 바꾸는 대신
// 여기서 명령형 껍데기를 씌우고 V2DialogHost 가 실제로 그린다.
//
// **호스트가 스택인 이유.** iOS 의 RN Modal 은 자기가 속한 뷰트리의
// UIViewController 에서 present 한다(RCTModalHostViewComponentView.mm
// `presentViewController:` → `[self reactViewController]`). 루트에만 호스트를
// 두면, 이미 화면 모달이 떠 있는 상태에서 부르는 순간 루트 VC 는 "이미
// present 중"이라 조용히 실패한다 — 네이티브 Alert 은 별도 UIWindow 라
// 지금까지 이 문제가 없었을 뿐이다. 그래서 모달 안에서도 <V2DialogHost/> 를
// 하나 더 얹을 수 있게 하고, 호출은 **마지막에 등록된 호스트**로 간다.

import { Alert } from "react-native"

export type DialogButtonLayout = "horizontal" | "vertical"

export type ConfirmOptions = {
  title: string
  description?: string
  /** 주 액션 라벨 (기본 "확인") */
  confirmLabel?: string
  /** 보조 액션 라벨 (기본 "취소") */
  cancelLabel?: string
  /** 되돌릴 수 없는 액션 — 주 버튼을 Danger/Fill 로 */
  destructive?: boolean
  /** 라벨이 길어 가로 분할이 좁으면 "vertical" */
  buttonLayout?: DialogButtonLayout
}

export type AlertOptions = {
  title: string
  description?: string
  confirmLabel?: string
}

export type ActionSheetAction = {
  label: string
  /** 되돌릴 수 없는 항목 — 라벨을 Danger 색으로 */
  destructive?: boolean
}

export type ActionSheetOptions = {
  title?: string
  description?: string
  actions: ActionSheetAction[]
  /** 취소 라벨 (기본 "취소") */
  cancelLabel?: string
}

/**
 * 호스트가 실제로 받는 요청.
 * confirm/alert 는 버튼 2개 이하 → 다이얼로그,
 * sheet 는 3개 이상 선택지 → 하단 시트로 그린다.
 */
export type DialogRequest = ConfirmOptions & {
  kind: "confirm" | "alert" | "sheet"
  actions?: ActionSheetAction[]
}

/**
 * 응답 — 다이얼로그는 눌렀는지 여부, 시트는 고른 항목의 인덱스.
 * 취소/딤 탭은 둘 다 null.
 */
export type DialogResult = number | null

export type DialogHandler = (request: DialogRequest) => Promise<DialogResult>

/** 마지막이 최상단. 모달 안 호스트가 떠 있으면 그쪽이 이긴다 */
const hosts: DialogHandler[] = []

export function registerDialogHost(handler: DialogHandler): () => void {
  hosts.push(handler)
  return () => {
    const index = hosts.lastIndexOf(handler)
    if (index >= 0) hosts.splice(index, 1)
  }
}

function activeHost(): DialogHandler | undefined {
  return hosts[hosts.length - 1]
}

/**
 * 선택형 다이얼로그. 주 액션을 누르면 true.
 *
 * ```ts
 * if (await showConfirm({ title: "삭제할까요?", destructive: true })) remove()
 * ```
 */
export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return dispatch({ ...options, kind: "confirm" }).then((r) => r === 0)
}

/**
 * 확인만 받는 다이얼로그 — 사용자가 인지해야 진행되는 경우에만 쓴다.
 * 단순 실패/성공 통보는 토스트(`showErrorToast`)로 보낼 것.
 */
export function showAlert(options: AlertOptions): Promise<void> {
  return dispatch({ ...options, kind: "alert" }).then(() => undefined)
}

/**
 * 선택지가 셋 이상이면 다이얼로그가 아니라 하단 시트다 —
 * 버튼 두 개를 넘기는 순간 가로 분할은 읽히지 않는다.
 * 고른 항목의 인덱스를 주고, 취소하면 null.
 *
 * ```ts
 * const picked = await showActionSheet({
 *   title: "사진 바꾸기",
 *   actions: [{ label: "사진 찍기" }, { label: "앨범에서 고르기" }],
 * })
 * ```
 */
export function showActionSheet(
  options: ActionSheetOptions,
): Promise<DialogResult> {
  const { actions, cancelLabel, ...rest } = options

  /*
    선택지가 **하나**면 시트가 아니다 — 제목 아래 항목 한 줄과 취소만 있는
    시트는 미완성처럼 읽힌다(QA 2026-08-06). 이 파일의 규칙("셋 이상=시트,
    둘 이하=다이얼로그")대로 확인 다이얼로그로 강등한다. 반환 계약은 같다:
    항목을 골랐으면 그 인덱스(=0), 취소면 null.
  */
  if (actions.length === 1) {
    return dispatch({
      ...rest,
      title: rest.title ?? "",
      confirmLabel: actions[0].label,
      destructive: actions[0].destructive,
      cancelLabel,
      kind: "confirm",
    }).then((r) => (r === 0 ? 0 : null))
  }

  return dispatch({
    ...rest,
    title: rest.title ?? "",
    cancelLabel,
    actions,
    kind: "sheet",
  })
}

function dispatch(request: DialogRequest): Promise<DialogResult> {
  const host = activeHost()
  return host ? host(request) : nativeFallback(request)
}

/**
 * 호스트가 아직 안 붙었을 때(마운트 이전, 테스트 환경)의 안전망.
 * 조용히 사라지는 것보다 OS 알림이라도 뜨는 편이 낫다.
 */
function nativeFallback(request: DialogRequest): Promise<DialogResult> {
  return new Promise((resolve) => {
    const cancelButton = {
      text: request.cancelLabel ?? "취소",
      style: "cancel" as const,
      onPress: () => resolve(null),
    }
    const buttons =
      request.kind === "sheet"
        ? [
            ...(request.actions ?? []).map((action, index) => ({
              text: action.label,
              style: action.destructive ? ("destructive" as const) : undefined,
              onPress: () => resolve(index),
            })),
            cancelButton,
          ]
        : [
            {
              text: request.confirmLabel ?? "확인",
              style: request.destructive ? ("destructive" as const) : undefined,
              onPress: () => resolve(0),
            },
          ]
    Alert.alert(
      request.title,
      request.description,
      request.kind === "confirm" ? [cancelButton, ...buttons] : buttons,
      { onDismiss: () => resolve(null) },
    )
  })
}
