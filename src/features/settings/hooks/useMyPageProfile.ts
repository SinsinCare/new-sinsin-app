import { useQuery } from "@tanstack/react-query"
import { api } from "@/src/services/core/apiClient"

interface MyPageProfile {
  nickName: string
  age: number
  gender: string
}

async function fetchMyPageProfile(): Promise<MyPageProfile> {
  const { data } = await api.get("/user/profile/info")
  return data.result
}

export function useMyPageProfile() {
  return useQuery({
    queryKey: ["myPageProfile"],
    queryFn: fetchMyPageProfile,
  })
}
