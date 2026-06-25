import { Text, YStack } from "tamagui"
import { useState, useEffect, useRef } from "react"
import { BloodPressureRecord } from "./BloodPressureRecord"
import { BloodGlucoseRecord } from "./BloodGlucoseRecord"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useBloodMetricsRecord } from "../../hooks/useBloodMetricsRecord"
import { toDateStr } from "../../utils/dateUtils"
import {
  getInitialGlucoseTiming,
  mergeBloodGlucoseDraftFromAnalysis,
  type BloodGlucoseDraft,
} from "../../utils/bloodGlucoseDraft"
import { parseVital } from "../../utils/vitalsJudgment"
import type {
  GlucoseTiming,
  GlucoseElapsed,
} from "../../data/bloodMetricsConstants"
import type { DateAnalysisResult } from "@/src/types"

interface BloodMetricsTrackerProps {
  selectedDate: Date
  dateAnalysis?: DateAnalysisResult
}

export function BloodMetricsTracker({
  selectedDate,
  dateAnalysis,
}: BloodMetricsTrackerProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const { updateBloodPressure, updateBloodGlucose } = useBloodMetricsRecord()
  const selectedDateStr = toDateStr(selectedDate)
  const hydratedDateRef = useRef<string | null>(null)
  const glucoseDraftRef = useRef<BloodGlucoseDraft>({})
  const glucoseSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  // Blood pressure
  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")

  // Blood glucose
  const [timing, setTiming] = useState<GlucoseTiming>("FASTING")
  const [glucoseByTiming, setGlucoseByTiming] = useState<BloodGlucoseDraft>({})
  const currentGlucoseRecord = glucoseByTiming[timing]
  const glucose = currentGlucoseRecord?.value ?? ""
  const elapsed = currentGlucoseRecord?.elapsed ?? "2H"

  useEffect(() => {
    return () => {
      if (glucoseSaveTimeoutRef.current) {
        clearTimeout(glucoseSaveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const isNewDate = hydratedDateRef.current !== selectedDateStr
    if (isNewDate && glucoseSaveTimeoutRef.current) {
      clearTimeout(glucoseSaveTimeoutRef.current)
      glucoseSaveTimeoutRef.current = null
    }

    // 혈압 필드도 혈당과 동일하게: 같은 날짜 refetch(자체 저장 invalidate)엔
    // 입력 중인 값을 덮지 않고, 날짜가 바뀔 때만 서버값으로 hydrate.
    if (isNewDate) {
      const pressure = dateAnalysis?.bloodPressure
      setSystolic(pressure ? String(pressure.systolic) : "")
      setDiastolic(pressure ? String(pressure.diastolic) : "")
      setHeartRate(
        pressure?.heartRate != null ? String(pressure.heartRate) : "",
      )
    }

    const nextGlucose = mergeBloodGlucoseDraftFromAnalysis(
      dateAnalysis?.bloodGlucose ?? [],
      glucoseDraftRef.current,
      { isNewDate },
    )
    glucoseDraftRef.current = nextGlucose
    setGlucoseByTiming(nextGlucose)
    if (isNewDate) {
      setTiming(getInitialGlucoseTiming(nextGlucose))
    }
    hydratedDateRef.current = selectedDateStr
  }, [dateAnalysis, selectedDateStr])

  const setGlucoseDraft = (
    updater: (prev: BloodGlucoseDraft) => BloodGlucoseDraft,
  ) => {
    setGlucoseByTiming((prev) => {
      const next = updater(prev)
      glucoseDraftRef.current = next
      return next
    })
  }

  const handleBloodPressureSave = () => {
    const systolicValue = parseVital(systolic)
    const diastolicValue = parseVital(diastolic)
    const heartRateValue = parseVital(heartRate)
    if (systolicValue === null || diastolicValue === null) return

    updateBloodPressure({
      systolic: Math.trunc(systolicValue),
      diastolic: Math.trunc(diastolicValue),
      heartRate: heartRateValue === null ? null : Math.trunc(heartRateValue),
      date: selectedDateStr,
    })
  }

  const handleChangeGlucose = (value: string) => {
    setGlucoseDraft((prev) => ({
      ...prev,
      [timing]: {
        value,
        elapsed,
      },
    }))
  }

  const handleChangeTiming = (nextTiming: GlucoseTiming) => {
    setTiming(nextTiming)
  }

  const handleChangeElapsed = (nextElapsed: GlucoseElapsed) => {
    setGlucoseDraft((prev) => ({
      ...prev,
      [timing]: {
        value: glucose,
        elapsed: nextElapsed,
      },
    }))
    scheduleGlucoseSave(timing, nextElapsed)
  }

  const saveGlucoseRecord = (
    targetTiming: GlucoseTiming = timing,
    targetElapsed: GlucoseElapsed = elapsed,
    targetDate: string = selectedDateStr,
  ) => {
    const targetRecord = glucoseDraftRef.current[targetTiming]
    const glucoseValue = parseVital(targetRecord?.value ?? "")
    if (glucoseValue === null) return

    updateBloodGlucose({
      value: Math.trunc(glucoseValue),
      timing: targetTiming,
      elapsed: targetTiming === "AFTER_MEAL" ? targetElapsed : null,
      date: targetDate,
    })
  }

  const scheduleGlucoseSave = (
    targetTiming: GlucoseTiming,
    targetElapsed: GlucoseElapsed,
  ) => {
    if (glucoseSaveTimeoutRef.current) {
      clearTimeout(glucoseSaveTimeoutRef.current)
    }
    glucoseSaveTimeoutRef.current = setTimeout(() => {
      glucoseSaveTimeoutRef.current = null
      saveGlucoseRecord(targetTiming, targetElapsed, selectedDateStr)
    }, 250)
  }

  const handleGlucoseSave = () => {
    saveGlucoseRecord()
  }

  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text
        fontSize={20}
        fontWeight="600"
        color={isDarkMode ? "$textDark" : "$black"}
      >
        혈압·혈당 기록
      </Text>

      <BloodPressureRecord
        systolic={systolic}
        diastolic={diastolic}
        heartRate={heartRate}
        onChangeSystolic={setSystolic}
        onChangeDiastolic={setDiastolic}
        onChangeHeartRate={setHeartRate}
        onSave={handleBloodPressureSave}
      />

      <BloodGlucoseRecord
        glucose={glucose}
        timing={timing}
        elapsed={elapsed}
        onChangeGlucose={handleChangeGlucose}
        onChangeTiming={handleChangeTiming}
        onChangeElapsed={handleChangeElapsed}
        onSave={handleGlucoseSave}
      />
    </YStack>
  )
}
