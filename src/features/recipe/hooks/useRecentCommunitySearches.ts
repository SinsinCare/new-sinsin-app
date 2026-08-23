import { useCallback, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "community-recent-searches"
const MAX_RECENT = 8

/**
 * 커뮤니티 검색의 최근 검색어. 기기에만 저장한다 — 검색어는 개인 건강 문맥을
 * 드러낼 수 있어(식당 검색과 같은 이유) 이 목록을 서버로 보내지 않는다.
 * (검색 실행 자체는 서버 API 를 탄다. 서버는 검색 로그를 따로 집계한다.)
 */
export function useRecentCommunitySearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((v) => typeof v === "string"))
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const persist = useCallback((next: string[]) => {
    setRecentSearches(next)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
  }, [])

  const addRecentSearch = useCallback((keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((v) => v !== trimmed)].slice(
        0,
        MAX_RECENT,
      )
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  /** 한 개만 지운다 — 목록에 남기고 싶지 않은 검색어가 실제로 지워져야 한다. */
  const removeRecentSearch = useCallback((keyword: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((v) => v !== keyword)
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    persist([])
  }, [persist])

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  }
}
