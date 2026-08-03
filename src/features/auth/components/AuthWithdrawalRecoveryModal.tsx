import { V2Modal } from "@/src/design-system-v2"

interface AuthWithdrawalRecoveryModalProps {
  visible: boolean
  isCancelling: boolean
  onDismiss: () => void
  onConfirm: () => void
}

/** Auth-owned recovery confirmation shared by email and social login. */
export function AuthWithdrawalRecoveryModal({
  visible,
  isCancelling,
  onDismiss,
  onConfirm,
}: AuthWithdrawalRecoveryModalProps) {
  const handleDismiss = () => {
    if (!isCancelling) onDismiss()
  }

  return (
    <V2Modal
      visible={visible}
      title="회원탈퇴 처리중입니다."
      description="회원 탈퇴를 취소하고 다시 로그인하겠습니까?"
      primaryLabel={isCancelling ? "처리 중..." : "탈퇴 취소 후 로그인"}
      secondaryLabel="아니오"
      onPrimary={onConfirm}
      onSecondary={handleDismiss}
      onRequestClose={handleDismiss}
    />
  )
}
