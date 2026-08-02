import { useState } from "react"
import { Alert } from "react-native"
import { useAppRouter } from "@/src/shared/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { showErrorToast } from "@/src/lib/toast"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { ApiError } from "@/src/services/core/apiError"
import { api } from "@/src/services/core/apiClient"
import {
  buildPhoneProfileUpdatePayload,
  formatKoreanMobileInput,
  getOptionalPhoneNumberError,
} from "@/src/features/auth/data/phoneNumber"
import { useMyPageProfile } from "./useMyPageProfile"

type PendingAction = "save" | "delete" | null

function getPhoneUpdateError(error: unknown, fallback: string): string {
  return getErrorMessage(error, fallback)
}

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
      const message = getPhoneUpdateError(
        error,
        action === "delete" ? t("phone.deleteError") : t("phone.saveError"),
      )
      if (error instanceof ApiError && error.isNetworkError) {
        showErrorToast(message)
      } else {
        setServerError(message)
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

  const handleDelete = () => {
    if (!profile?.hasPhoneNumber || pendingAction) return
    Alert.alert(t("phone.deleteTitle"), t("phone.deleteBody"), [
      { text: t("shared.cancel"), style: "cancel" },
      {
        text: t("shared.delete"),
        style: "destructive",
        onPress: () => void updatePhoneNumber(null, "delete"),
      },
    ])
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
