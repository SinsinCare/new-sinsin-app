import { queryOptions } from "@tanstack/react-query"
import type { Chat } from "@/src/types/chat"
import { chatApiService } from "@/src/services"

export function chatListQuery(isEnabled: boolean) {
  return queryOptions<{ conversations: Chat[]; totalCount: number }, Error>({
    queryKey: ["chats"],
    queryFn: () => chatApiService.getChats(),
    enabled: isEnabled,
  })
}
