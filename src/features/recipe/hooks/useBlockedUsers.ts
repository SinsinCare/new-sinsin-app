import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BlockedUser, blockService } from "@/src/services/blockService"

const BLOCKED_KEY = ["blocked-users"] as const

export function useBlockedUsers() {
  const queryClient = useQueryClient()

  const { data: blockedUsers = [] } = useQuery({
    queryKey: BLOCKED_KEY,
    queryFn: () => blockService.getBlockedUsers(),
  })

  const blockedNickNames = blockedUsers.map((u) => u.blockedNickName)

  const blockMutation = useMutation({
    mutationFn: (nickName: string) => blockService.blockUser(nickName),
    onMutate: async (nickName) => {
      await queryClient.cancelQueries({ queryKey: BLOCKED_KEY })
      const prev = queryClient.getQueryData<BlockedUser[]>(BLOCKED_KEY)
      queryClient.setQueryData<BlockedUser[]>(BLOCKED_KEY, (old) => [
        ...(old ?? []),
        {
          id: Date.now(),
          blockedNickName: nickName,
          createdAt: new Date().toISOString(),
        },
      ])
      return { prev }
    },
    onError: (_err, _nickName, context) => {
      if (context?.prev) {
        queryClient.setQueryData(BLOCKED_KEY, context.prev)
      }
    },
  })

  return {
    blockedNickNames,
    blockUser: blockMutation.mutate,
    isBlocking: blockMutation.isPending,
  }
}
