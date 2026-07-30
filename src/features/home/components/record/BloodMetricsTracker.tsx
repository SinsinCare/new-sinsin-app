import { Text, YStack } from "tamagui"
import { useCallback, useState, useEffect, useRef } from "react"
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

interface BloodPressureDraft {
  systolic: string
  diastolic: string
  heartRate: string
}

export function BloodMetricsTracker({
  selectedDate,
  dateAnalysis,
}: BloodMetricsTrackerProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const { updateBloodPressure, updateBloodGlucose } = useBloodMetricsRecord()
  const selectedDateStr = toDateStr(selectedDate)
  const hydratedDateRef = useRef<string | null>(null)
  const bloodPressureDraftRef = useRef<BloodPressureDraft>({
    systolic: "",
    diastolic: "",
    heartRate: "",
  })
  const bloodPressureDirtyRef = useRef(false)
  const bloodPressureSavingRef = useRef(false)
  const glucoseDraftRef = useRef<BloodGlucoseDraft>({})
  const glucoseSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const scheduledGlucoseSaveRef = useRef<{
    timing: GlucoseTiming
    elapsed: GlucoseElapsed
    date: string
  } | null>(null)

  // Blood pressure
  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const [isBloodPressureSaving, setIsBloodPressureSaving] = useState(false)

  // Blood glucose
  const [timing, setTiming] = useState<GlucoseTiming>("FASTING")
  const [glucoseByTiming, setGlucoseByTiming] = useState<BloodGlucoseDraft>({})
  const currentGlucoseRecord = glucoseByTiming[timing]
  const glucose = currentGlucoseRecord?.value ?? ""
  const elapsed = currentGlucoseRecord?.elapsed ?? "2H"

  const saveBloodPressureDraft = useCallback(
    async (targetDate: string, draft: BloodPressureDraft): Promise<boolean> => {
      const systolicValue = parseVital(draft.systolic)
      const diastolicValue = parseVital(draft.diastolic)
      const heartRateValue = parseVital(draft.heartRate)
      if (
        systolicValue === null ||
        diastolicValue === null ||
        heartRateValue === null ||
        bloodPressureSavingRef.current
      ) {
        return false
      }

      bloodPressureSavingRef.current = true
      setIsBloodPressureSaving(true)
      try {
        const saved = await updateBloodPressure({
          systolic: Math.trunc(systolicValue),
          diastolic: Math.trunc(diastolicValue),
          heartRate: Math.trunc(heartRateValue),
          isComplete: true,
          date: targetDate,
        })
        if (saved) bloodPressureDirtyRef.current = false
        return saved
      } finally {
        bloodPressureSavingRef.current = false
        setIsBloodPressureSaving(false)
      }
    },
    [updateBloodPressure],
  )

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
    void saveBloodPressureDraft(selectedDateStr, bloodPressureDraftRef.current)
  }

  const handleChangeSystolic = (value: string) => {
    bloodPressureDirtyRef.current = true
    bloodPressureDraftRef.current = {
      ...bloodPressureDraftRef.current,
      systolic: value,
    }
    setSystolic(value)
  }

  const handleChangeDiastolic = (value: string) => {
    bloodPressureDirtyRef.current = true
    bloodPressureDraftRef.current = {
      ...bloodPressureDraftRef.current,
      diastolic: value,
    }
    setDiastolic(value)
  }

  const handleChangeHeartRate = (value: string) => {
    bloodPressureDirtyRef.current = true
    bloodPressureDraftRef.current = {
      ...bloodPressureDraftRef.current,
      heartRate: value,
    }
    setHeartRate(value)
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

  const saveGlucoseRecord = useCallback(
    (
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
    },
    [elapsed, selectedDateStr, timing, updateBloodGlucose],
  )

  const clearScheduledGlucoseSave = useCallback(() => {
    if (glucoseSaveTimeoutRef.current) {
      clearTimeout(glucoseSaveTimeoutRef.current)
      glucoseSaveTimeoutRef.current = null
    }
  }, [])

  const flushScheduledGlucoseSave = useCallback(() => {
    const scheduled = scheduledGlucoseSaveRef.current
    if (!scheduled) return

    clearScheduledGlucoseSave()
    scheduledGlucoseSaveRef.current = null
    saveGlucoseRecord(scheduled.timing, scheduled.elapsed, scheduled.date)
  }, [clearScheduledGlucoseSave, saveGlucoseRecord])
  const flushScheduledGlucoseSaveRef = useRef(flushScheduledGlucoseSave)
  flushScheduledGlucoseSaveRef.current = flushScheduledGlucoseSave

  const scheduleGlucoseSave = useCallback(
    (targetTiming: GlucoseTiming, targetElapsed: GlucoseElapsed) => {
      clearScheduledGlucoseSave()
      scheduledGlucoseSaveRef.current = {
        timing: targetTiming,
        elapsed: targetElapsed,
        date: selectedDateStr,
      }
      glucoseSaveTimeoutRef.current = setTimeout(() => {
        const scheduled = scheduledGlucoseSaveRef.current
        scheduledGlucoseSaveRef.current = null
        glucoseSaveTimeoutRef.current = null
        if (scheduled) {
          saveGlucoseRecord(scheduled.timing, scheduled.elapsed, scheduled.date)
        }
      }, 250)
    },
    [clearScheduledGlucoseSave, saveGlucoseRecord, selectedDateStr],
  )

  const handleGlucoseSave = () => {
    clearScheduledGlucoseSave()
    scheduledGlucoseSaveRef.current = null
    saveGlucoseRecord()
  }

  useEffect(() => {
    return () => {
      flushScheduledGlucoseSaveRef.current()
    }
  }, [])

  useEffect(() => {
    const isNewDate = hydratedDateRef.current !== selectedDateStr
    if (isNewDate) {
      flushScheduledGlucoseSaveRef.current()
    }

    const pressure = dateAnalysis?.bloodPressure
    if (isNewDate || !bloodPressureDirtyRef.current) {
      const nextBloodPressureDraft = {
        systolic: pressure ? String(pressure.systolic) : "",
        diastolic: pressure ? String(pressure.diastolic) : "",
        heartRate:
          pressure?.heartRate != null ? String(pressure.heartRate) : "",
      }
      bloodPressureDraftRef.current = nextBloodPressureDraft
      bloodPressureDirtyRef.current = false
      setSystolic(nextBloodPressureDraft.systolic)
      setDiastolic(nextBloodPressureDraft.diastolic)
      setHeartRate(nextBloodPressureDraft.heartRate)
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
        onChangeSystolic={handleChangeSystolic}
        onChangeDiastolic={handleChangeDiastolic}
        onChangeHeartRate={handleChangeHeartRate}
        canSave={
          parseVital(systolic) !== null &&
          parseVital(diastolic) !== null &&
          parseVital(heartRate) !== null
        }
        isSaving={isBloodPressureSaving}
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
