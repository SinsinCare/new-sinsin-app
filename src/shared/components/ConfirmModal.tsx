import { V2Modal } from "@/src/design-system-v2"
import { useTranslation } from "react-i18next"

/**
 * 확인 다이얼로그 — 이제 V2Modal 한 겹 껍데기다.
 *
 * 예전엔 흰 배경(#FFFFFF)과 글자색을 직접 박아 놓은 자체 구현이라, iOS 알럿을
 * 흉내 내면서도 다크모드에서 홀로 하얗게 떴다. 앱 안에 확인창이 네 종류
 * (이것 · ConfirmExitModal · V2Modal · OS Alert) 돌아다니던 시절의 유물이다.
 *
 * props 는 그대로 두어 기존 호출부를 건드리지 않는다. **새 코드는 이것 대신
 * `showConfirm`(src/lib/dialog.ts)을 쓸 것** — 상태 두 줄이 필요 없다.
 */
interface ConfirmModalProps {
  visible: boolean
  title: string
  description?: string
  cancelText?: string
  confirmText?: string
  /** 되돌릴 수 없는 액션 — 주 버튼을 Danger/Fill 로 */
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmModal({
  visible,
  title,
  description,
  cancelText,
  confirmText,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const { t } = useTranslation()

  return (
    <V2Modal
      visible={visible}
      title={title}
      description={description}
      destructive={destructive}
      primaryLabel={confirmText ?? t("action.confirm")}
      onPrimary={() => void onConfirm()}
      secondaryLabel={cancelText ?? t("action.cancel")}
      onSecondary={onCancel}
      onRequestClose={onCancel}
    />
  )
}
