import { useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { AppBottomSheet } from "@/src/shared/components/AppBottomSheet"
import { hapticStepAdvance } from "@/src/lib/haptics"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { parseVital } from "../../../utils/vitalsJudgment"
import type { DateAnalysisBloodPressureRecord } from "@/src/types"
import { useTranslation } from "react-i18next"

interface BloodPressureSheetProps {
  visible: boolean
  onClose: () => void
  record: DateAnalysisBloodPressureRecord | null
  /** 지난번(어제) 기록. 가정혈압의 앵커 — 있으면 판정 줄에 함께 보여준다. */
  previousRecord: DateAnalysisBloodPressureRecord | null
  isSaving: boolean
  onSubmit: (body: {
    systolic: number
    diastolic: number
    heartRate: number | null
  }) => void
}

/**
 * 혈압 기록 시트.
 *
 * 수축·이완 두 필드 카드(라벨은 카드 안, 값은 수치 위계) 나란히,
 * 심박수는 한 줄 카드로 낮춰 잡는다. 임상 승인 전인 로컬 경계값으로
 * 정상·위험을 판정하지 않고, 지난 기록만 비교 대상으로 보여 준다.
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
  const diastolicRef = useRef<TextInput>(null)
  const heartRateRef = useRef<TextInput>(null)

  useEffect(() => {
    if (!visible) return
    setSystolic(record ? String(record.systolic) : "")
    setDiastolic(record ? String(record.diastolic) : "")
    setHeartRate(record?.heartRate != null ? String(record.heartRate) : "")
  }, [record, visible])

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

  return (
    <AppBottomSheet visible={visible} onClose={onClose} snapPoints={[80]}>
      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={[styles.title, { color: surface.textStrong }]}>
              {t("home.sheet.bloodPressure.title")}
            </Text>
            <Text style={[styles.subtitle, { color: surface.textMuted }]}>
              {t("home.sheet.bloodPressure.subtitle")}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("action.close")}
            onPress={onClose}
            hitSlop={10}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: pressed
                      ? surface.surfacePressed
                      : surface.surface,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={surface.textWeak} />
              </View>
            )}
          </Pressable>
        </View>

        {/* 수축·이완 필드 카드 — 라벨은 카드 안, 값은 수치 위계. */}
        <View style={styles.fieldRow}>
          <View
            style={[styles.fieldCard, { backgroundColor: surface.surface }]}
          >
            <Text style={[styles.fieldLabel, { color: surface.textMuted }]}>
              {t("home.sheet.bloodPressure.systolic")}
            </Text>
            <View style={styles.fieldValueRow}>
              <TextInput
                autoFocus={!record}
                value={systolic}
                onChangeText={(text) => {
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
          </View>

          <View
            style={[styles.fieldCard, { backgroundColor: surface.surface }]}
          >
            <Text style={[styles.fieldLabel, { color: surface.textMuted }]}>
              {t("home.sheet.bloodPressure.diastolic")}
            </Text>
            <View style={styles.fieldValueRow}>
              <TextInput
                ref={diastolicRef}
                value={diastolic}
                onChangeText={(text) => {
                  setDiastolic(text)
                  if (text.length >= 2 && parseVital(text) !== null) {
                    // 두 자리에서 멈추는 값이 대부분이라 강제 이동은 하지 않는다.
                  }
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
          </View>
        </View>

        {/* 심박수는 곁가지 — 한 줄 카드로 낮춘다. */}
        <Pressable onPress={() => heartRateRef.current?.focus()}>
          <View
            style={[styles.pulseCard, { backgroundColor: surface.surface }]}
          >
            <Text style={[styles.pulseLabel, { color: surface.textStrong }]}>
              {t("home.sheet.bloodPressure.heartRate")}
            </Text>
            <TextInput
              ref={heartRateRef}
              value={heartRate}
              onChangeText={setHeartRate}
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

        {/* 임상 경계 대신 사용자가 직접 기록한 이전 값만 비교한다. */}
        <View style={styles.judgeRow}>
          <Text style={[styles.judgeLabel, { color: surface.textMuted }]}>
            {t("home.sheet.previousReading")}
          </Text>
          {previousRecord ? (
            <Text style={[styles.judgePrev, { color: surface.textMuted }]}>
              {previousRecord.systolic}/{previousRecord.diastolic}
            </Text>
          ) : (
            <Text style={[styles.judgeEmpty, { color: surface.placeholder }]}>
              {t("home.sheet.bloodPressure.noPrevious")}
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit || isSaving }}
          onPress={() => {
            if (!canSubmit || isSaving) return
            hapticStepAdvance()
            onSubmit({
              systolic: Math.trunc(systolicValue!),
              diastolic: Math.trunc(diastolicValue!),
              heartRate:
                heartRateValue === null ? null : Math.trunc(heartRateValue),
            })
          }}
          disabled={!canSubmit || isSaving}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.cta,
                {
                  backgroundColor:
                    canSubmit && !isSaving ? surface.brand : surface.ctaOffBg,
                  opacity: pressed && canSubmit ? 0.92 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.ctaLabel,
                  {
                    color:
                      canSubmit && !isSaving
                        ? surface.onBrand
                        : surface.ctaOffText,
                  },
                ]}
              >
                {canSubmit
                  ? t("home.sheet.recordValue", {
                      value: `${Math.trunc(systolicValue!)}/${Math.trunc(diastolicValue!)}`,
                    })
                  : t("home.sheet.bloodPressure.enterBoth")}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </AppBottomSheet>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: LAYOUT.screenX,
    paddingTop: 4,
    gap: 14,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headText: { flex: 1, gap: 3 },
  title: { ...TYPE.sheetTitle, fontWeight: "700" },
  subtitle: TYPE.cardSub,
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  fieldValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  fieldInput: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    padding: 0,
    minWidth: 58,
  },
  fieldUnit: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  pulseCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  pulseLabel: {
    ...TYPE.cardTitle,
    fontWeight: "700",
    flex: 1,
  },
  pulseInput: {
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.55,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    minWidth: 56,
    padding: 0,
  },
  pulseUnit: { fontSize: 13.5, lineHeight: 19, fontWeight: "500" },
  judgeRow: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  judgeLabel: { fontSize: 13.5, lineHeight: 19, fontWeight: "500" },
  judgeEmpty: TYPE.caption,
  judgePrev: { fontSize: 13.5, lineHeight: 19 },
  rangeNote: { ...TYPE.cardSub, marginTop: -6 },
  cta: {
    height: LAYOUT.cta.height,
    borderRadius: LAYOUT.cta.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { fontSize: 17, lineHeight: 24, fontWeight: "700" },
})
