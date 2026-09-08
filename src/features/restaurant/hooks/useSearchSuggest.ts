/**
 * 검색 자동완성. 디바운스 250ms + in-flight 취소.
 *
 * ## 왜 디바운스를 훅 안에 두나
 *
 * 화면에서 `useState` + `setTimeout` 으로 하면 화면마다 값이 달라지고(200ms/300ms/즉시),
 * 어떤 화면은 취소를 빼먹는다. 한 자 입력마다 요청이 나가면 `강남역` 세 글자에 요청 3개가
 * 뜨고, 마지막이 아닌 응답이 늦게 도착해 목록이 과거로 돌아간다. 여기서 한 번만 정한다.
 *
 * 250ms 는 한글 입력의 조합 단위와 맞는다 — 자모 단위로는 검색해도 결과가 없고,
 * 음절이 완성되는 리듬이 대략 그 정도다.
 */

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"
import { restaurantService } from "@/src/services/data/restaurantService"

import type { SearchSuggestionDto } from "../types"
import { restaurantKeys } from "./restaurantQueryKeys"

export const SUGGEST_DEBOUNCE_MS = 250

/** 한 글자로는 묻지 않는다 — `ㄱ` 이나 `국` 은 결과가 너무 많아 도움이 안 된다. */
const MIN_QUERY_LENGTH = 2

export interface UseSearchSuggestResult {
  suggestions: SearchSuggestionDto[]
  /** 디바운스 대기 중이거나 요청 중. 스피너 하나로 묶어 쓴다. */
  isLoading: boolean
  isError: boolean
  error: unknown
}

export function useSearchSuggest(draft: string): UseSearchSuggestResult {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)
  const trimmed = draft.trim()
  const [debounced, setDebounced] = useState("")

  useEffect(() => {
    // 지웠으면 기다리지 않고 즉시 비운다 — 지운 뒤에도 이전 제안이 250ms 남아 있으면
    // 사용자는 자기 입력이 씹혔다고 느낀다.
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setDebounced("")
      return
    }
    const timer = setTimeout(() => setDebounced(trimmed), SUGGEST_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [trimmed])

  const query = useQuery({
    queryKey: restaurantKeys.suggest(language, debounced),
    enabled: debounced.length >= MIN_QUERY_LENGTH,
    // 같은 글자를 다시 치는 일이 흔하다(지웠다 되돌림). 30초는 그 왕복을 덮는다.
    staleTime: 30 * 1000,
    queryFn: ({ signal }) =>
      restaurantService.fetchSuggestions(debounced, signal),
  })

  const canSuggest = trimmed.length >= MIN_QUERY_LENGTH
  const matchesInput = canSuggest && trimmed === debounced
  const isWaitingForDebounce = canSuggest && !matchesInput

  return {
    // Previous-query data can remain during debounce or finish after the user
    // has typed something else. It must never become a selectable destination.
    suggestions: matchesInput ? (query.data?.suggestions ?? []) : [],
    isLoading: isWaitingForDebounce || (matchesInput && query.isFetching),
    isError: matchesInput && query.isError,
    error: matchesInput ? query.error : null,
  }
}
