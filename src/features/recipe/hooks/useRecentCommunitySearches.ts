import { useCallback, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "community-recent-searches"
const MAX_RECENT = 8

/**
 * 커뮤니티 검색의 최근 검색어. 기기에만 저장한다(서버 검색 API 없음 —
 * 피드가 전량 로드되므로 검색 자체도 클라이언트에서 거른다).
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

  const clearRecentSearches = useCallback(() => {
    persist([])
  }, [persist])

  return { recentSearches, addRecentSearch, clearRecentSearches }
}
