/**
 * 리포트 상세의 "실천 약속" 체크 상태. **기기에만** 저장한다.
 *
 * 서버에는 아직 환자가 과제를 체크했다는 사실을 받는 자리가 없다(`doctor_patient_report`
 * 는 의사가 쓰는 행이고, 앱은 읽기만 한다). 그래서 상세 화면의 문구도 "이 리포트에
 * 저장돼요" 까지만 말한다 — 식이 기록에 뜬다고 적으면 거짓말이다. 서버 자리가 생기면
 * 이 파일이 그쪽으로 옮겨 가는 단일 지점이다.
 *
 * 키는 리포트 id 별이다. 과제 목록은 보낸 뒤 바뀌지 않는 스냅숏이라 **인덱스**로 저장한다.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

const KEY_PREFIX = "@sinsin/doctor-report-tasks/"

export function reportTaskChecksKey(reportId: string): string {
  return `${KEY_PREFIX}${reportId}`
}

/** 저장된 문자열 → 체크된 인덱스 집합. 깨진 값은 빈 집합으로 읽는다(화면이 죽지 않게). */
export function parseReportTaskChecks(raw: string | null): Set<number> {
  if (!raw) return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed.filter(
        (value): value is number =>
          typeof value === "number" && Number.isInteger(value) && value >= 0,
      ),
    )
  } catch {
    return new Set()
  }
}

export function serializeReportTaskChecks(checked: ReadonlySet<number>): string {
  return JSON.stringify([...checked].sort((a, b) => a - b))
}

export interface UseReportTaskChecksResult {
  checked: ReadonlySet<number>
  /** 저장소를 처음 읽는 동안 true. 이때 전부 빈 칸으로 그리면 한 프레임 뒤에 튄다. */
  isLoading: boolean
  toggle: (index: number) => void
  /** 현재 상태(또는 넘긴 상태)를 즉시 저장한다. CTA 가 부른다. 저장이 끝나면 resolve. */
  persist: (next?: ReadonlySet<number>) => Promise<void>
}

export function useReportTaskChecks(
  reportId: string,
): UseReportTaskChecksResult {
  const [checked, setChecked] = useState<ReadonlySet<number>>(() => new Set())
  const [isLoading, setLoading] = useState(true)
  const checkedRef = useRef<ReadonlySet<number>>(checked)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    AsyncStorage.getItem(reportTaskChecksKey(reportId))
      .then((raw) => {
        if (cancelled) return
        const next = parseReportTaskChecks(raw)
        checkedRef.current = next
        setChecked(next)
      })
      .catch(() => {
        // 읽기 실패는 "체크한 적 없음" 과 같게 본다.
        if (cancelled) return
        checkedRef.current = new Set()
        setChecked(new Set())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reportId])

  const persist = useCallback(
    async (next?: ReadonlySet<number>) => {
      const value = next ?? checkedRef.current
      if (next !== undefined) {
        checkedRef.current = next
        if (mounted.current) setChecked(next)
      }
      await AsyncStorage.setItem(
        reportTaskChecksKey(reportId),
        serializeReportTaskChecks(value),
      )
    },
    [reportId],
  )

  const toggle = useCallback(
    (index: number) => {
      const next = new Set(checkedRef.current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      checkedRef.current = next
      setChecked(next)
      // 체크 하나하나도 바로 남긴다 — 뒤로 나가도 다시 열면 그대로다.
      void AsyncStorage.setItem(
        reportTaskChecksKey(reportId),
        serializeReportTaskChecks(next),
      ).catch(() => {})
    },
    [reportId],
  )

  return { checked, isLoading, toggle, persist }
}
