import { queryOptions } from "@tanstack/react-query"
import { chatApiService } from "@/src/services"
import type { Chat } from "@/src/types/chat"

export const chatHistoryQuery = (isEnabled: boolean, language: "ko" | "en") =>
  queryOptions<{ conversations: Chat[]; totalCount: number }, Error>({
    queryKey: ["chat", "history", language],
    queryFn: () => chatApiService.getChats(),
    enabled: isEnabled,
    staleTime: 0,
    gcTime: 0,
  })
