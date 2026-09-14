import { useQuery } from "@tanstack/react-query"

import { fetchInquiries } from "@/src/services/data/inquiryService"

/**
 * 내 1:1 문의 목록 한 벌. 작성 화면이 전송에 성공하면 이 키를 무효화해서 목록으로
 * 돌아왔을 때 방금 보낸 문의가 맨 위에 있게 한다(`InquiryScreen`).
 *
 * `staleTime` 을 짧게 두는 이유: 답변은 서버에서 달린다. 사용자가 "답이 왔나" 하고
 * 다시 들어왔을 때 5분 전 캐시를 보여 주면 답이 왔는데도 "접수됨" 으로 보인다.
 */
export const INQUIRY_LIST_QUERY_KEY = ["inquiries"] as const

export function useInquiryList() {
  return useQuery({
    queryKey: INQUIRY_LIST_QUERY_KEY,
    queryFn: fetchInquiries,
    staleTime: 30_000,
    refetchOnMount: "always",
  })
}
