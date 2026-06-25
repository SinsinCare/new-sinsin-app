import { Text, YStack } from "tamagui"
import { EdemaRecord } from "./EdemaRecord"
import { WeightRecord } from "./WeightRecord"
import { EdemaLevel } from "../../data/EdemaConstants"
import { useState, useEffect, useRef } from "react"
import { decreaseWeight, increaseWeight } from "../../utils/adjustWeight"
import type { DateAnalysisBodyRecord } from "@/src/types"
import { useWeightEdemaRecord } from "../../hooks/useWeightEdemaRecord"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

interface WeightEdemaTrackerProps {
  bodyRecords?: {
    today: DateAnalysisBodyRecord | null
    previous: DateAnalysisBodyRecord | null
  }
  selectedDate: Date
}

const WEIGHT_SAVE_DEBOUNCE_MS = 500

export function WeightEdemaTracker({
  bodyRecords,
  selectedDate,
}: WeightEdemaTrackerProps) {
  const [weight, setWeight] = useState<string>("")
  const [edemaLevel, setEdemaLevel] = useState<EdemaLevel | null>(null)
  const { updateWeight, updateEdema } = useWeightEdemaRecord()
  const isDarkMode = useAppColorScheme() === "dark"

  const selectDate = selectedDate.toISOString().split("T")[0]

  // 연타 시 stale state read를 피하려고 최신 값을 ref로 들고 체이닝.
  const weightRef = useRef<string>("")
  const weightSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  // 디바운스 대기 중인 저장 인자(탭 시점의 값·날짜를 고정 → 이후 hydrate/날짜이동에
  // 영향받지 않고 정확히 저장).
  const pendingSaveRef = useRef<{ value: string; date: string } | null>(null)

  const yesterdayWeight = bodyRecords?.previous?.weightKg ?? null
  const yesterdayEdema = bodyRecords?.previous?.edemaLevel ?? null

  // 서버값으로 hydrate. 단 +/- 저장이 대기 중(연타 진행)일 때만 건너뜀 →
  // 입력 중 클로버만 막고, 초기 로드·저장 후엔 항상 서버 상태를 반영.
  useEffect(() => {
    if (weightSaveTimeoutRef.current) return
    const today = bodyRecords?.today ?? null
    const nextWeight = today?.weightKg != null ? String(today.weightKg) : ""
    setWeight(nextWeight)
    weightRef.current = nextWeight
    setEdemaLevel(today?.edemaLevel ?? null)
  }, [bodyRecords, selectDate])

  const commitWeight = (value: string, date: string) => {
    const val = parseFloat(value)
    if (!isNaN(val) && val > 0) updateWeight(val, date)
  }

  // 대기 중 저장을 언마운트 시 flush — 디바운스로 인한 유실 방지.
  const flushRef = useRef<() => void>(() => {})
  flushRef.current = () => {
    if (!weightSaveTimeoutRef.current) return
    clearTimeout(weightSaveTimeoutRef.current)
    weightSaveTimeoutRef.current = null
    const pending = pendingSaveRef.current
    pendingSaveRef.current = null
    if (pending) commitWeight(pending.value, pending.date)
  }
  useEffect(() => {
    return () => flushRef.current()
  }, [])

  // ponytail: +/- 연타는 디바운스로 한 번만 서버에 쏨(왕복·리셋 싸움 제거)
  const scheduleWeightSave = (value: string, date: string) => {
    pendingSaveRef.current = { value, date }
    if (weightSaveTimeoutRef.current) clearTimeout(weightSaveTimeoutRef.current)
    weightSaveTimeoutRef.current = setTimeout(() => {
      weightSaveTimeoutRef.current = null
      const pending = pendingSaveRef.current
      pendingSaveRef.current = null
      if (pending) commitWeight(pending.value, pending.date)
    }, WEIGHT_SAVE_DEBOUNCE_MS)
  }

  const handleChangeWeight = (value: string) => {
    weightRef.current = value
    setWeight(value)
  }

  // 직접 입력은 blur(onEndEditing)에 즉시 저장 — 이미 자연 디바운스.
  const handleSave = (weightStr: string) => {
    weightRef.current = weightStr
    if (weightSaveTimeoutRef.current) {
      clearTimeout(weightSaveTimeoutRef.current)
      weightSaveTimeoutRef.current = null
      pendingSaveRef.current = null
    }
    commitWeight(weightStr, selectDate)
  }

  const handleEdemaSave = (level: EdemaLevel) => {
    setEdemaLevel(level)
    updateEdema(level, selectDate)
  }

  const adjust = (fn: (current: number) => number) => {
    const current = parseFloat(weightRef.current) || yesterdayWeight || 0
    const newVal = fn(current).toFixed(1)
    weightRef.current = newVal
    setWeight(newVal)
    scheduleWeightSave(newVal, selectDate)
  }
  const handleDecrease = () => adjust(decreaseWeight)
  const handleIncrease = () => adjust(increaseWeight)

  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text
        fontSize={20}
        fontWeight="600"
        color={isDarkMode ? "$textDark" : "$black"}
      >
        체중·부종 기록
      </Text>

      <WeightRecord
        weight={weight}
        yesterdayWeight={yesterdayWeight}
        onChangeWeight={handleChangeWeight}
        onDecrease={handleDecrease}
        onIncrease={handleIncrease}
        onSave={handleSave}
      />

      <EdemaRecord
        selected={edemaLevel}
        yesterdayEdema={yesterdayEdema}
        onSave={handleEdemaSave}
      />
    </YStack>
  )
}
