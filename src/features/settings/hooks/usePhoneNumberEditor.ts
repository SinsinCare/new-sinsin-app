import { useState } from "react"
import { Alert } from "react-native"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"

import { showErrorToast } from "@/src/lib/toast"
import { ApiError } from "@/src/services/core/apiError"
import { api } from "@/src/services/core/apiClient"
import {
  buildPhoneProfileUpdatePayload,
  formatKoreanMobileInput,
  getOptionalPhoneNumberError,
} from "@/src/features/auth/data/phoneNumber"
import { useMyPageProfile } from "./useMyPageProfile"

type PendingAction = "save" | "delete" | null

function getPhoneUpdateError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return error.message
    return error.message || "전화번호를 저장하지 못했습니다."
  }
  return "전화번호를 저장하지 못했습니다. 다시 시도해주세요."
}

export function usePhoneNumberEditor() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: profile } = useMyPageProfile()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const validationError = getOptionalPhoneNumberError(phoneNumber)
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
      const message = getPhoneUpdateError(error)
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
    Alert.alert(
      "전화번호를 삭제할까요?",
      "삭제하면 개인 연락과 동의한 마케팅 안내에 더 이상 활용되지 않습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => void updatePhoneNumber(null, "delete"),
        },
      ],
    )
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
    handleBack: () => router.back(),
  }
}
