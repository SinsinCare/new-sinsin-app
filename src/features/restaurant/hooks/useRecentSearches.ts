/**
 * 식당 검색의 최근 검색어. 기기에만 저장한다(서버 이력 API 가 없고, 검색어는
 * 개인 건강 문맥을 드러낼 수 있어 굳이 서버로 보내지 않는다).
 *
 * 커뮤니티의 `useRecentCommunitySearches` 와 같은 모양이지만 **저장 키를 공유하지 않는다** —
 * 커뮤니티에서 검색한 `단백질` 이 식당 검색 이력에 뜨면 사용자는 왜 그게 있는지 모른다.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  parseRestaurantRecent,
  prependRestaurantRecent,
  restaurantRecentKey,
  serializeRestaurantRecent,
  type RestaurantRecentSearch,
} from "../utils/restaurantSearchRecent"

const STORAGE_KEY = "restaurant-recent-searches"

export interface UseRecentSearchesResult {
  recentSearches: RestaurantRecentSearch[]
  /** 저장소를 처음 읽는 동안 `true`. 이때 빈 목록을 "이력 없음" 으로 그리면 깜빡인다. */
  isLoading: boolean
  add: (entry: RestaurantRecentSearch) => void
  /** 목업의 항목별 ✕. */
  remove: (entry: RestaurantRecentSearch) => void
  /** 목업의 `전체 삭제`. */
  clear: () => void
}

export function useRecentSearches(): UseRecentSearchesResult {
  const [recentSearches, setRecentSearches] = useState<
    RestaurantRecentSearch[]
  >([])
  const [isLoading, setLoading] = useState(true)
  const mounted = useRef(true)
  const entriesRef = useRef<RestaurantRecentSearch[]>([])
  const hydrated = useRef(false)
  const loadGeneration = useRef(0)
  const pendingEdits = useRef<
    ((entries: RestaurantRecentSearch[]) => RestaurantRecentSearch[])[]
  >([])
  const writes = useRef(Promise.resolve())

  const persist = useCallback((entries: RestaurantRecentSearch[]) => {
    // Serialize writes so a slow earlier write cannot restore a removed entry.
    writes.current = writes.current
      .then(() =>
        AsyncStorage.setItem(STORAGE_KEY, serializeRestaurantRecent(entries)),
      )
      .catch(() => {})
  }, [])

  useEffect(() => {
    mounted.current = true
    const generation = ++loadGeneration.current
    AsyncStorage.getItem(STORAGE_KEY)
      .catch(() => null)
      .then((raw) => {
        if (generation !== loadGeneration.current) return
        const edits = pendingEdits.current
        const next = edits.reduce(
          (entries, edit) => edit(entries),
          parseRestaurantRecent(raw),
        )
        pendingEdits.current = []
        hydrated.current = true
        entriesRef.current = next
        // A selection may navigate away before storage finishes loading. Still
        // persist that intent, merged with older entries, after unmount.
        if (edits.length > 0) persist(next)
        if (mounted.current) {
          setRecentSearches(next)
          setLoading(false)
        }
      })
    return () => {
      mounted.current = false
    }
  }, [persist])

  const edit = useCallback(
    (
      update: (entries: RestaurantRecentSearch[]) => RestaurantRecentSearch[],
    ) => {
      const next = update(entriesRef.current)
      entriesRef.current = next
      if (mounted.current) setRecentSearches(next)
      if (hydrated.current) persist(next)
      else pendingEdits.current.push(update)
    },
    [persist],
  )

  const add = useCallback(
    (entry: RestaurantRecentSearch) => {
      if (!entry.label.trim()) return
      edit((entries) => prependRestaurantRecent(entries, entry))
    },
    [edit],
  )

  const remove = useCallback(
    (entry: RestaurantRecentSearch) => {
      const key = restaurantRecentKey(entry)
      edit((entries) =>
        entries.filter((value) => restaurantRecentKey(value) !== key),
      )
    },
    [edit],
  )

  const clear = useCallback(() => {
    edit(() => [])
  }, [edit])

  return { recentSearches, isLoading, add, remove, clear }
}
