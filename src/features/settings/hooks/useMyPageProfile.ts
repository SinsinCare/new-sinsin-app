import { useQuery } from "@tanstack/react-query"
import { api } from "@/src/services/core/apiClient"

export interface MyPageProfile {
  email: string
  nickName: string
  name: string
  birthYear: number
  birthMonth: number
  birthDay: number
  accountState: string
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
