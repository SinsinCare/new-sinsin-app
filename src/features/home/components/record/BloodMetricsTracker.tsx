import { Text, YStack } from "tamagui"
import { useState, useEffect } from "react"
import { BloodPressureRecord } from "./BloodPressureRecord"
import { BloodGlucoseRecord } from "./BloodGlucoseRecord"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import type {
  GlucoseTiming,
  GlucoseElapsed,
} from "../../data/bloodMetricsConstants"

interface BloodMetricsTrackerProps {
  selectedDate: Date
}

export function BloodMetricsTracker({
  selectedDate,
}: BloodMetricsTrackerProps) {
  const isDarkMode = useAppColorScheme() === "dark"

  // Blood pressure
  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")

  // Blood glucose
  const [glucose, setGlucose] = useState("")
  const [timing, setTiming] = useState<GlucoseTiming>("FASTING")
  const [elapsed, setElapsed] = useState<GlucoseElapsed>("2H")

  // Reset inputs when the selected date changes.
  // TODO: hydrate from / persist to backend once body-records supports
  // blood pressure and glucose fields.
  useEffect(() => {
    setSystolic("")
    setDiastolic("")
    setHeartRate("")
    setGlucose("")
    setTiming("FASTING")
    setElapsed("2H")
  }, [selectedDate])

  const handleBloodPressureSave = () => {
    // Persisted locally for now; wire to backend when supported.
  }

  const handleGlucoseSave = () => {
    // Persisted locally for now; wire to backend when supported.
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
        onChangeGlucose={setGlucose}
        onChangeTiming={setTiming}
        onChangeElapsed={setElapsed}
        onSave={handleGlucoseSave}
      />
    </YStack>
  )
}
