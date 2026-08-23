import { useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import {
  V2SheetTextInput,
  type V2SheetTextInputRef,
} from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import { RecordSheetShell } from "./RecordSheetShell"
import { SheetJudgmentBadge, SheetRangeBar } from "./recordSheetControls"
import {
  BLOOD_PRESSURE_DANGER,
  BLOOD_PRESSURE_RANGE,
  BLOOD_PRESSURE_TARGET,
  judgeBloodPressureValue,
  parseVital,
} from "../../../utils/vitalsJudgment"
import type { DateAnalysisBloodPressureRecord } from "@/src/types"
import { useHealthEntryInput } from "../../../hooks/useHealthEntryInput"
import { useTranslation } from "react-i18next"

interface BloodPressureSheetProps {
  visible: boolean
  onClose: () => void
  record: DateAnalysisBloodPressureRecord | null
  /** 지난번(어제) 기록. 가정혈압의 앵커 — 판정 줄의 오른쪽에 상주한다. */
  previousRecord: DateAnalysisBloodPressureRecord | null
  isSaving: boolean
  onSubmit: (body: {
    systolic: number
    diastolic: number
    heartRate: number | null
  }) => void
}

/**
 * 혈압 기록 시트 — 시트 시안(2026-08-03).
 *
 * 수축기(위)·이완기(아래)를 한 카드의 두 행으로 쌓고, 심박수는 한 줄 카드로
 * 낮춘다. 값을 넣으면 판정 배지와 목표 구간 바가 **그 자리에서** 응답한다 —
 * 입력→판정을 화면 이동 없이 닿는 게 기록의 보상이다(Nielsen #1 상태 가시성).
 * "지난번 121/80"은 앵커로 늘 같은 자리에 둔다.
 *
 * 위(수축기)를 세 자리 적으면 커서가 아래(이완기)로 알아서 넘어간다.
 */
export function BloodPressureSheet({
  visible,
  onClose,
  record,
  previousRecord,
  isSaving,
  onSubmit,
}: BloodPressureSheetProps) {
  const { t } = useTranslation("common")
  const surface = useSurface()
  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const systolicRef = useRef<V2SheetTextInputRef>(null)
  const diastolicRef = useRef<V2SheetTextInputRef>(null)
  const heartRateRef = useRef<V2SheetTextInputRef>(null)
  const markInput = useHealthEntryInput("blood_pressure", visible)
  /*
    세 칸 어디든 **첫 글자**가 이 시트의 입력 시작이다(수축기만 보면, 이미 기록이 있어
    수축기가 채워진 채 열린 사람이 이완기부터 고치는 경우가 통째로 빠진다).
    자릿수마다 오는 콜백이지만 훅이 이번 열림의 한 번만 통과시킨다.
  */
  const onVitalTyped = (next: string) => {
    if (next.length > 0) markInput("keypad")
  }

  /*
    **닫힘→열림 전이에서만** 저장값을 채운다. `record` 를 deps 에 두고 매번 채우면,
    시트가 열려 있는 동안 홈이 refetch 를 마칠 때(예: 다른 기록 저장 직후) 새 record
    객체가 내려와 **치던 값이 서버 값으로 덮인다** — 혈당 시트의 "시점을 바꾸면 입력이
    사라진다"(2026-08-04 QA)와 같은 계열이다. 열려 있는 동안의 진실은 사용자의 손이다.
  */
  const wasVisibleRef = useRef(false)
  useEffect(() => {
    const wasVisible = wasVisibleRef.current
    wasVisibleRef.current = visible
    if (!visible || wasVisible) return
    setSystolic(record ? String(record.systolic) : "")
    setDiastolic(record ? String(record.diastolic) : "")
    setHeartRate(record?.heartRate != null ? String(record.heartRate) : "")
  }, [record, visible])

  /*
    첫 칸 자동 포커스. **`autoFocus` 로 하면 안 된다.**

    이 시트는 홈이 열릴 때 `visible={false}` 인 채로 이미 마운트된다(RecordView 가
    시트를 항상 렌더한다). `autoFocus` 는 마운트 시점에 동작해서, 혈압 기록이 없는
    사용자는 홈에 들어서자마자 키패드가 올라왔다 — 시트가 닫혀도 자식을 살려 두던
    Tamagui 시절의 사고다. 지금은 닫히면 자식이 언마운트되지만, `autoFocus` 는 여전히
    쓰지 않는다: 시트가 올라오는 애니메이션을 키보드가 앞지르면 gorhom 이 열림과
    키보드 리프트를 동시에 계산하게 된다. 그래서 **열림**에 맞추고 지연을 둔다.
  */
  useEffect(() => {
    if (!visible || record) return
    const timer = setTimeout(() => systolicRef.current?.focus(), 260)
    return () => clearTimeout(timer)
  }, [visible, record])

  const systolicValue = parseVital(systolic)
  const diastolicValue = parseVital(diastolic)
  const heartRateValue = parseVital(heartRate)
  const canSubmit =
    systolicValue !== null &&
    systolicValue > 0 &&
    systolicValue <= 300 &&
    diastolicValue !== null &&
    diastolicValue > 0 &&
    diastolicValue <= 200

  const judgment = judgeBloodPressureValue(systolicValue, diastolicValue)
  const judgmentLabel = judgment
    ? judgment.tone === "danger"
      ? t("home.sheet.judgment.veryHigh")
      : judgment.direction === "high"
        ? t("home.sheet.judgment.high")
        : judgment.direction === "low"
          ? t("home.sheet.judgment.low")
          : t("home.sheet.judgment.normal")
    : null

  return (
    <RecordSheetShell
      surface="home_blood_pressure"
      visible={visible}
      onClose={onClose}
      title={t("home.sheet.bloodPressure.title")}
      subtitle={t("home.sheet.bloodPressure.subtitle")}
      ctaLabel={
        canSubmit
          ? t("home.sheet.recordValue", {
              value: `${Math.trunc(systolicValue!)}/${Math.trunc(diastolicValue!)}`,
            })
          : t("home.sheet.bloodPressure.enterBoth")
      }
      ctaDisabled={!canSubmit}
      ctaLoading={isSaving}
      onCtaPress={() => {
        if (!canSubmit) return
        onSubmit({
          systolic: Math.trunc(systolicValue!),
          diastolic: Math.trunc(diastolicValue!),
          heartRate:
            heartRateValue === null ? null : Math.trunc(heartRateValue),
        })
      }}
    >
      {/* 수축·이완 — 한 카드의 두 행. 행 어디를 눌러도 그 칸에 포커스가 간다. */}
      <View style={[styles.fieldCard, { backgroundColor: surface.surface }]}>
        <Pressable
          style={styles.fieldRow}
          onPress={() => systolicRef.current?.focus()}
        >
          <Text style={[styles.fieldLabel, { color: surface.textMuted }]}>
            {t("home.sheet.bloodPressure.systolic")}
          </Text>
          <View style={styles.fieldValueRow}>
            <V2SheetTextInput
              ref={systolicRef}
              value={systolic}
              onChangeText={(text) => {
                onVitalTyped(text)
                setSystolic(text)
                if (text.length >= 3) diastolicRef.current?.focus()
              }}
              placeholder="120"
              placeholderTextColor={surface.placeholder}
              selectionColor={surface.brand}
              keyboardType="number-pad"
              maxLength={3}
              style={[styles.fieldInput, { color: surface.textStrong }]}
            />
            <Text style={[styles.fieldUnit, { color: surface.textMuted }]}>
              mmHg
            </Text>
          </View>
        </Pressable>

        <View
          style={[styles.fieldDivider, { backgroundColor: surface.hairline }]}
        />

        <Pressable
          style={styles.fieldRow}
          onPress={() => diastolicRef.current?.focus()}
        >
          <Text style={[styles.fieldLabel, { color: surface.textMuted }]}>
            {t("home.sheet.bloodPressure.diastolic")}
          </Text>
          <View style={styles.fieldValueRow}>
            <V2SheetTextInput
              ref={diastolicRef}
              value={diastolic}
              onChangeText={(text) => {
                onVitalTyped(text)
                setDiastolic(text)
              }}
              placeholder="80"
              placeholderTextColor={surface.placeholder}
              selectionColor={surface.brand}
              keyboardType="number-pad"
              maxLength={3}
              style={[styles.fieldInput, { color: surface.textStrong }]}
            />
            <Text style={[styles.fieldUnit, { color: surface.textMuted }]}>
              mmHg
            </Text>
          </View>
        </Pressable>
      </View>

      {/*
        판정 줄 — 넣는 순간 배지가 이 자리에서 응답한다. 높이를 미리 잡아 두어
        판정이 생겨도 아래(바·CTA)가 한 픽셀도 밀리지 않는다.

        **값 바로 아래**여야 한다. 판정을 심박수 뒤로 밀면 타이핑하는 손과 그 응답이
        멀어지고(키패드가 떠 있는 동안 눈이 머무는 곳은 값 근처다), 입력에 곧바로
        응답한다는 이 시트의 전제가 무너진다. 곁가지인 심박수가 아래로 간다.
      */}
      <View style={styles.judgeBlock}>
        <View style={styles.judgeRow}>
          <View style={styles.judgeNow}>
            {judgment && judgmentLabel ? (
              <>
                <Text style={[styles.judgeLabel, { color: surface.textMuted }]}>
                  {t("home.sheet.bloodPressure.currentValue")}
                </Text>
                <SheetJudgmentBadge
                  label={judgmentLabel}
                  tone={judgment.tone}
                />
              </>
            ) : (
              <Text style={[styles.judgeLabel, { color: surface.placeholder }]}>
                {t("home.sheet.bloodPressure.judgmentPending")}
              </Text>
            )}
          </View>
          {previousRecord ? (
            <Text style={[styles.judgePrev, { color: surface.textMuted }]}>
              {t("home.sheet.previousReading")} {previousRecord.systolic}/
              {previousRecord.diastolic}
            </Text>
          ) : null}
        </View>

        <SheetRangeBar
          min={BLOOD_PRESSURE_RANGE.min}
          max={BLOOD_PRESSURE_RANGE.max}
          targetMin={BLOOD_PRESSURE_TARGET.min}
          targetMax={BLOOD_PRESSURE_TARGET.max}
          value={systolicValue}
          dangerFrom={BLOOD_PRESSURE_DANGER.systolic}
        />
      </View>

      {/* 심박수는 곁가지 — 한 줄 카드로 낮춘다. */}
      <Pressable onPress={() => heartRateRef.current?.focus()}>
        <View style={[styles.pulseCard, { backgroundColor: surface.surface }]}>
          <Text style={[styles.pulseLabel, { color: surface.textStrong }]}>
            {t("home.sheet.bloodPressure.heartRate")}
          </Text>
          <V2SheetTextInput
            ref={heartRateRef}
            value={heartRate}
            onChangeText={(text) => {
              onVitalTyped(text)
              setHeartRate(text)
            }}
            placeholder="60"
            placeholderTextColor={surface.placeholder}
            selectionColor={surface.brand}
            keyboardType="number-pad"
            maxLength={3}
            style={[styles.pulseInput, { color: surface.textStrong }]}
          />
          <Text style={[styles.pulseUnit, { color: surface.textMuted }]}>
            bpm
          </Text>
        </View>
      </Pressable>
    </RecordSheetShell>
  )
}

const styles = StyleSheet.create({
  fieldCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  fieldRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldDivider: { height: StyleSheet.hairlineWidth },
  fieldLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  fieldValueRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  fieldInput: {
    fontSize: 26,
    letterSpacing: -0.65,
    // 단일행 입력엔 lineHeight 를 주지 않는다 — iOS 가 글자를 문단 기준으로 앉혀
    // 상하 여백이 어긋난다(surface.ts `singleLineInputText` 머리말).
    includeFontPadding: false,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    minWidth: 56,
    padding: 0,
  },
  fieldUnit: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  pulseCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  pulseLabel: {
    ...TYPE.cardTitle,
    fontWeight: "700",
    flex: 1,
  },
  pulseInput: {
    fontSize: 22,
    letterSpacing: -0.5,
    // 단일행 입력엔 lineHeight 를 주지 않는다(위와 같은 이유).
    includeFontPadding: false,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    minWidth: 52,
    padding: 0,
  },
  pulseUnit: { fontSize: 13.5, lineHeight: 19, fontWeight: "500" },
  judgeBlock: { gap: 12 },
  judgeRow: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  judgeNow: { flexDirection: "row", alignItems: "center", gap: 8 },
  judgeLabel: { fontSize: 13.5, lineHeight: 19, fontWeight: "500" },
  judgePrev: { fontSize: 13.5, lineHeight: 19 },
})
