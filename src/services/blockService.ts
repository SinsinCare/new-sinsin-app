import { api } from "./core/apiClient"

export interface BlockedUser {
  id: number
  blockedNickName: string
  /**
   * 차단한 **사람의 id**. 서버가 차단 시점에 닉네임을 풀어 저장한다(서버 alembic 088).
   *
   * 이것이 신원 축이다 — 상대가 개명해도, 비어 버린 그 닉네임을 제3자가 가져가도
   * 가리키는 사람이 바뀌지 않는다. 닉네임 축은 두 방향으로 무너진다(차단 회피 ·
   * 제3자가 차단을 물려받음).
   *
   * `null` 은 서버가 그 닉네임을 어떤 사용자로도 **풀지 못한** 행이다(구서버가 쓴 행,
   * 없는 닉네임 차단, 088 백필 미해결). 서버는 그런 행을 여전히 이름으로 거르므로
   * 앱도 **그때만** 이름으로 비교한다 — 안 그러면 088 이전에 가려지던 글이 사용자
   * 모르게 다시 보인다. 판정은 `useBlockedUsers` 의 `isAuthorBlocked` 한 곳이다.
   *
   * 필드 자체가 없는 응답(이 필드를 내보내기 전 서버)은 `undefined` 다. 그것도
   * "못 풀었다" 와 같은 뜻이라 판정은 `== null` 로 한다 — 이 앱이 서버보다 먼저
   * 나가는 배포 순서에서 실제로 오는 모양이다.
   */
  blockedUserId?: number | null
  createdAt: string
}

export const blockService = {
  async blockUser(blockedNickName: string): Promise<BlockedUser> {
    const res = await api.post("/user/block", { blockedNickName })
    return res.data.result ?? res.data.data
  },

  /**
   * 차단 목록. **실패를 삼키지 않는다.**
   *
   * 예전에는 `catch { return [] }` 였다. 그러면 차단 필터가 **열린 채로 고장난다** —
   * 500 한 번에 차단한 사람의 글이 피드에 다시 뜨는데, 훅은 `isError` 를 가진 적이
   * 없어 재시도도 안 돌고, 당김 새로고침의 `throwOnError` 토스트도 (`BLOCKED_KEY` 가
   * `COMMUNITY_FEED_REFRESH` 에 있는데도) 영영 안 뜬다. 차단은 안전 장치라
   * "모른다" 를 "차단한 사람이 없다" 로 바꿔 말하면 안 된다.
   *
   * 던지면 화면들이 이미 아는 방식(`isError` → 오류 상태·재시도)으로 그린다.
   * 목록을 못 받은 동안 필터는 **아무도 접지 않는다**(`useBlockedUsers` 머리말) —
   * 모르는 것을 숨기는 쪽보다 보이는 쪽이 되돌리기 쉽다.
   */
  async getBlockedUsers(): Promise<BlockedUser[]> {
    const res = await api.get("/user/block")
    return res.data.result ?? res.data.data ?? []
  },

  /**
   * 차단 해제. POST 의 거울(바디에 닉네임) — 서버 계약(P0 §5)상 이미 해제된
   * 닉네임을 다시 보내도 200(멱등)이라, 재시도가 실패로 보이지 않는다.
   */
  async unblockUser(blockedNickName: string): Promise<void> {
    await api.delete("/user/block", { data: { blockedNickName } })
  },
}
