import { Text, YStack } from "tamagui"
import { useState, useEffect, useRef } from "react"
import { BloodPressureRecord } from "./BloodPressureRecord"
import { BloodGlucoseRecord } from "./BloodGlucoseRecord"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { useBloodMetricsRecord } from "../../hooks/useBloodMetricsRecord"
import { toDateStr } from "../../utils/dateUtils"
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

  // Blood pressure
  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")

  // Blood glucose
  const [timing, setTiming] = useState<GlucoseTiming>("FASTING")
  const [glucoseByTiming, setGlucoseByTiming] = useState<
    Partial<Record<GlucoseTiming, { value: string; elapsed: GlucoseElapsed }>>
  >({})
  const currentGlucoseRecord = glucoseByTiming[timing]
  const glucose = currentGlucoseRecord?.value ?? ""
  const elapsed = currentGlucoseRecord?.elapsed ?? "2H"

  useEffect(() => {
    const isNewDate = hydratedDateRef.current !== selectedDateStr
    const pressure = dateAnalysis?.bloodPressure
    setSystolic(pressure ? String(pressure.systolic) : "")
    setDiastolic(pressure ? String(pressure.diastolic) : "")
    setHeartRate(pressure?.heartRate != null ? String(pressure.heartRate) : "")

    const nextGlucose = Object.fromEntries(
      (dateAnalysis?.bloodGlucose ?? []).map((record) => [
        record.timing,
        {
          value: String(record.value),
          elapsed: record.elapsed ?? "2H",
        },
      ]),
    ) as Partial<
      Record<GlucoseTiming, { value: string; elapsed: GlucoseElapsed }>
    >
    setGlucoseByTiming(nextGlucose)
    if (isNewDate) {
      setTiming(
        (["FASTING", "BEFORE_MEAL", "AFTER_MEAL"] as GlucoseTiming[]).find(
          (option) => nextGlucose[option]?.value,
        ) ?? "FASTING",
      )
    }
    hydratedDateRef.current = selectedDateStr
  }, [dateAnalysis, selectedDateStr])

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
    setGlucoseByTiming((prev) => ({
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
    setGlucoseByTiming((prev) => ({
      ...prev,
      [timing]: {
        value: glucose,
        elapsed: nextElapsed,
      },
    }))
    handleGlucoseSave(timing, nextElapsed)
  }

  const handleGlucoseSave = (
    targetTiming: GlucoseTiming = timing,
    targetElapsed: GlucoseElapsed = elapsed,
  ) => {
    const targetRecord = glucoseByTiming[targetTiming]
    const glucoseValue = parseVital(targetRecord?.value ?? "")
    if (glucoseValue === null) return

    updateBloodGlucose({
      value: Math.trunc(glucoseValue),
      timing: targetTiming,
      elapsed: targetTiming === "AFTER_MEAL" ? targetElapsed : null,
      date: selectedDateStr,
    })
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
