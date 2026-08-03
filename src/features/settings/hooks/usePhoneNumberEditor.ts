import { useState } from "react"

import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { getErrorMessage } from "@/src/lib/errorUtils"
import { presentError, resolveError } from "@/src/lib/errorMessage"
import { api } from "@/src/services/core/apiClient"
import {
  buildPhoneProfileUpdatePayload,
  formatKoreanMobileInput,
  getOptionalPhoneNumberError,
} from "@/src/features/auth/data/phoneNumber"
import { useMyPageProfile } from "./useMyPageProfile"

import { showConfirm } from "@/src/lib/dialog"
type PendingAction = "save" | "delete" | null

export function usePhoneNumberEditor() {
  const router = useAppRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const { t } = useTranslation("settings")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const validationError = getOptionalPhoneNumberError(phoneNumber)
    ? t("phone.validation")
    : null
  const canSave = phoneNumber.length > 0 && !validationError && !pendingAction

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(formatKoreanMobileInput(value))
    if (serverError) setServerError(null)
  }

  const updatePhoneNumber = async (
    nextPhoneNumber: string | null,
    action: Exclude<PendingAction, null>,
  ) => {
    if (pendingAction) return
    setPendingAction(action)
    setServerError(null)
    try {
      await api.patch(
        "/user/profile/phone",
        buildPhoneProfileUpdatePayload(nextPhoneNumber),
      )
      await queryClient.invalidateQueries({ queryKey: ["myPageProfile"] })
      router.back()
    } catch (error) {
      // 입력칸 아래 빨간 줄에는 버튼을 달 자리가 없다. 버튼 하나로 끝나는 실패
      // (오프라인 → 다시 시도, 세션 만료 → 로그인)는 토스트로 보내고, 번호 자체를
      // 고쳐야 하는 실패만 필드에 남긴다. 예전에는 `전화번호를 저장하지 못했어요.
      // 잠시 후 다시 시도해 주세요.` 가 그 둘을 한 문장으로 덮었다.
      if (resolveError(error).action) {
        presentError(error, {
          scope: `phone-${action}`,
          retry: () => void updatePhoneNumber(nextPhoneNumber, action),
        })
      } else {
        setServerError(getErrorMessage(error))
      }
    } finally {
      setPendingAction(null)
    }
  }

  const handleSave = () => {
    if (!canSave) return
    const { phoneNumber: normalizedPhoneNumber } =
      buildPhoneProfileUpdatePayload(phoneNumber)
    void updatePhoneNumber(normalizedPhoneNumber, "save")
  }

  const handleDelete = async () => {
    if (!profile?.hasPhoneNumber || pendingAction) return
    const confirmed = await showConfirm({
      title: t("phone.deleteTitle"),
      description: t("phone.deleteBody"),
      confirmLabel: t("shared.delete"),
      cancelLabel: t("shared.cancel"),
      destructive: true,
    })
    if (confirmed) await updatePhoneNumber(null, "delete")
  }

  return {
    profile,
    phoneNumber,
    phoneNumberError: serverError ?? validationError,
    canSave,
    isSaving: pendingAction === "save",
    isDeleting: pendingAction === "delete",
    handlePhoneNumberChange,
    handleSave,
    handleDelete,
  }
}
