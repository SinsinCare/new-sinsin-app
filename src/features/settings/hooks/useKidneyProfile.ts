import { useQuery } from "@tanstack/react-query"
import { kidneyProfileService } from "@/src/services/data/kidneyProfileService"

export function useKidneyProfile() {
  return useQuery({
    queryKey: ["kidneyProfile"],
    queryFn: () => kidneyProfileService.getKidneyProfile(),
  })
}
