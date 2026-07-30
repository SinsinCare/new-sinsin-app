/**
 * 레시피 검색 상태. **시안의 가장 큰 결함을 고치는 지점이다** —
 * `Typing.png` 와 `Typed.png` 가 완전히 동일했다. "밥" 을 입력해도 아래는 그대로
 * "오늘의 아침 추천메뉴" 였고, 검색이 아무것도 하지 않았다.
 *
 * v2 의 상태는 두 개로 나뉜다.
 *   draft     — 지금 입력창에 있는 글자. 400ms 뒤 **자동완성**만 부른다(§3.5 디바운스 규칙).
 *   committed — 확정된 검색어. 이것만 **목록**을 바꾼다.
 *
 * 왜 나누는가: 한 글자마다 목록을 다시 받으면 (a) 요청이 쏟아지고 (b) 사용자가 다 치기
 * 전에 결과가 몇 번씩 바뀌어 "무엇을 누르면 무엇이 나오는지" 예측할 수 없다. 자동완성은
 * 값싸고 되돌릴 수 있는 제안이고, 목록 갱신은 확정 행위다.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { normalizeLanguage } from "@/src/i18n"

import { shouldShowSuggestions } from "../components/list/recipeListPresentation"
import { recipeListV2Service } from "../services/recipeListV2Service"
import type { RecipeSuggestion } from "../types/recipeListV2"

/** 계약 §3.5 가 작성 화면에 정한 값과 같은 400ms 를 쓴다 — 앱 안에서 디바운스가 두 종류면 안 된다. */
export const RECIPE_SUGGEST_DEBOUNCE_MS = 400

export function useRecipeSearch() {
  const { i18n } = useTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)

  const [draft, setDraft] = useState("")
  const [committedQuery, setCommittedQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [debouncedDraft, setDebouncedDraft] = useState("")

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedDraft(draft.trim()),
      RECIPE_SUGGEST_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [draft])

  const showSuggestions = shouldShowSuggestions({
    isFocused,
    draft,
    committedQuery,
  })

  /** 디바운스가 아직 안 끝났다 = 화면의 제안이 지금 글자와 다르다. */
  const isDebouncing = draft.trim() !== debouncedDraft

  const suggestEnabled =
    showSuggestions && debouncedDraft.length > 0 && !isDebouncing

  const suggestQuery = useQuery({
    queryKey: ["recipe-suggest", language, debouncedDraft],
    queryFn: () => recipeListV2Service.getSuggestions(debouncedDraft),
    enabled: suggestEnabled,
    // 같은 글자를 지웠다 다시 쳐도 그 사이 결과는 그대로 쓴다.
    staleTime: 60_000,
  })

  const suggestions = useMemo<RecipeSuggestion[]>(
    () => (suggestEnabled ? (suggestQuery.data ?? []) : []),
    [suggestEnabled, suggestQuery.data],
  )

  const commit = useCallback(
    (text?: string) => {
      const next = (text ?? draft).trim()
      setDraft(next)
      setDebouncedDraft(next)
      setCommittedQuery(next)
      setIsFocused(false)
    },
    [draft],
  )

  const clear = useCallback(() => {
    setDraft("")
    setDebouncedDraft("")
    setCommittedQuery("")
  }, [])

  return {
    draft,
    setDraft,
    committedQuery,
    /** 검색 결과를 보고 있는가(= 결과 수를 보여줄 상태인가). */
    isSearching: committedQuery.trim().length > 0,
    isFocused,
    focus: useCallback(() => setIsFocused(true), []),
    blur: useCallback(() => setIsFocused(false), []),
    showSuggestions,
    suggestions,
    /** 제안을 기다리는 중(디바운스 대기 + 요청 중을 하나로 본다). */
    isSuggesting: showSuggestions && (isDebouncing || suggestQuery.isFetching),
    commit,
    clear,
  }
}
