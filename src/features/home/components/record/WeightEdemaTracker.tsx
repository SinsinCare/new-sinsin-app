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
  // 현재 hydrate된 날짜. 자체 저장 → invalidate → 같은 날짜 refetch가
  // 입력 중인 값을 덮지 않도록 가드(혈당과 동일 패턴).
  const hydratedDateRef = useRef<string | null>(null)
  const weightSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const yesterdayWeight = bodyRecords?.previous?.weightKg ?? null
  const yesterdayEdema = bodyRecords?.previous?.edemaLevel ?? null

  useEffect(() => {
    const isNewDate = hydratedDateRef.current !== selectDate
    if (isNewDate && weightSaveTimeoutRef.current) {
      clearTimeout(weightSaveTimeoutRef.current)
      weightSaveTimeoutRef.current = null
    }
    // 같은 날짜 refetch면 로컬 유지(리셋 안 함). 날짜가 바뀔 때만 서버값으로.
    if (!isNewDate) return
    const today = bodyRecords?.today ?? null
    const nextWeight = today?.weightKg != null ? String(today.weightKg) : ""
    setWeight(nextWeight)
    weightRef.current = nextWeight
    setEdemaLevel(today?.edemaLevel ?? null)
    hydratedDateRef.current = selectDate
  }, [bodyRecords, selectDate])

  useEffect(() => {
    return () => {
      if (weightSaveTimeoutRef.current) {
        clearTimeout(weightSaveTimeoutRef.current)
      }
    }
  }, [])

  // ponytail: +/- 연타는 디바운스로 한 번만 서버에 쏨(서버 왕복·리셋 싸움 제거)
  const scheduleWeightSave = () => {
    if (weightSaveTimeoutRef.current) clearTimeout(weightSaveTimeoutRef.current)
    weightSaveTimeoutRef.current = setTimeout(() => {
      weightSaveTimeoutRef.current = null
      const val = parseFloat(weightRef.current)
      if (!isNaN(val) && val > 0) updateWeight(val, selectDate)
    }, WEIGHT_SAVE_DEBOUNCE_MS)
  }

  const handleChangeWeight = (value: string) => {
    weightRef.current = value
    setWeight(value)
  }

  // 직접 입력은 blur(onEndEditing)에 저장 — 이미 자연 디바운스.
  const handleSave = (weightStr: string) => {
    weightRef.current = weightStr
    if (weightSaveTimeoutRef.current) {
      clearTimeout(weightSaveTimeoutRef.current)
      weightSaveTimeoutRef.current = null
    }
    const val = parseFloat(weightStr)
    if (!isNaN(val) && val > 0) updateWeight(val, selectDate)
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
    scheduleWeightSave()
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
