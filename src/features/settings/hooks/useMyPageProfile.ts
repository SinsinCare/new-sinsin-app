import { useQuery } from "@tanstack/react-query"
import { api } from "@/src/services/core/apiClient"

export interface MyPageProfile {
  email: string
  nickName: string
  name: string
  gender?: "MALE" | "FEMALE" | "OTHER"
  birthYear: number
  birthMonth: number
  birthDay: number
  accountState: string
  profileImage?: string
  acquisitionSource?: string | null
  acquisitionSourceOther?: string | null
  requiresAdditionalInfo: boolean
  hasPhoneNumber?: boolean
  phoneNumberMasked?: string | null
}

async function fetchMyPageProfile(): Promise<MyPageProfile> {
  const { data } = await api.get("/user/profile")
  return data.result
}

export function useMyPageProfile() {
  return useQuery({
    queryKey: ["myPageProfile"],
    queryFn: fetchMyPageProfile,
  })
}
