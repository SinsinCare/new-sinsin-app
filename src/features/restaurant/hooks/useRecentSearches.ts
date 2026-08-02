/**
 * 식당 검색의 최근 검색어. 기기에만 저장한다(서버 이력 API 가 없고, 검색어는
 * 개인 건강 문맥을 드러낼 수 있어 굳이 서버로 보내지 않는다).
 *
 * 커뮤니티의 `useRecentCommunitySearches` 와 같은 모양이지만 **저장 키를 공유하지 않는다** —
 * 커뮤니티에서 검색한 `단백질` 이 식당 검색 이력에 뜨면 사용자는 왜 그게 있는지 모른다.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "restaurant-recent-searches"

/** 목업의 최근 검색어 영역이 스크롤 없이 보여 줄 수 있는 최대치. */
const MAX_RECENT = 10

export interface UseRecentSearchesResult {
  recentSearches: string[]
  /** 저장소를 처음 읽는 동안 `true`. 이때 빈 목록을 "이력 없음" 으로 그리면 깜빡인다. */
  isLoading: boolean
  add: (keyword: string) => void
  /** 목업의 항목별 ✕. */
  remove: (keyword: string) => void
  /** 목업의 `전체 삭제`. */
  clear: () => void
}

export function useRecentSearches(): UseRecentSearchesResult {
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isLoading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted.current) return
        if (raw) {
          const parsed: unknown = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            setRecentSearches(
              parsed.filter((v): v is string => typeof v === "string"),
            )
          }
        }
        setLoading(false)
      })
      .catch(() => {
        // 저장소 읽기 실패는 사용자에게 알릴 일이 아니다. 이력이 없는 것과 같게 다룬다.
        if (mounted.current) setLoading(false)
      })
    return () => {
      mounted.current = false
    }
  }, [])

  /** 쓰기 실패를 삼킨다 — 검색은 성공했는데 "이력 저장 실패" 를 띄우면 방해만 된다. */
  const persist = useCallback((next: string[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
  }, [])

  const add = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim()
      if (!trimmed) return
      setRecentSearches((prev) => {
        // 같은 검색어를 다시 하면 맨 위로 올린다(중복을 쌓지 않는다).
        const next = [trimmed, ...prev.filter((v) => v !== trimmed)].slice(
          0,
          MAX_RECENT,
        )
        persist(next)
        return next
      })
    },
    [persist],
  )

  const remove = useCallback(
    (keyword: string) => {
      setRecentSearches((prev) => {
        const next = prev.filter((v) => v !== keyword)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const clear = useCallback(() => {
    setRecentSearches([])
    persist([])
  }, [persist])

  return { recentSearches, isLoading, add, remove, clear }
}
