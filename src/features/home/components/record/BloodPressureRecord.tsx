import {
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  View,
} from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack } from "tamagui"
import { RecordCard } from "./RecordCard"
import { tokens } from "@/src/theme/tokens"
import {
  BP_PLACEHOLDER,
  VITAL_STATUS_LABEL,
} from "../../data/bloodMetricsConstants"
import {
  hasStartedBloodPressureInput,
  judgeBloodPressure,
  parseVital,
  type VitalStatus,
} from "../../utils/vitalsJudgment"

interface BloodPressureRecordProps {
  systolic: string
  diastolic: string
  heartRate: string
  hasPrevious?: boolean
  onChangeSystolic: (value: string) => void
  onChangeDiastolic: (value: string) => void
  onChangeHeartRate: (value: string) => void
  canSave: boolean
  isSaving?: boolean
  onSave: () => void
}

export function BloodPressureRecord({
  systolic,
  diastolic,
  heartRate,
  hasPrevious = false,
  onChangeSystolic,
  onChangeDiastolic,
  onChangeHeartRate,
  canSave,
  isSaving = false,
  onSave,
}: BloodPressureRecordProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const numberColor = isDarkMode ? tokens.color.textDark.val : "#1a1a1a"
  const placeholderColor = tokens.color.grey6.val
  const labelColor = isDarkMode ? "$textDarkSub" : "$grey5"
  const dividerColor = isDarkMode
    ? tokens.color.borderDark.val
    : tokens.color.borderLight.val
  const systolicValue = parseVital(systolic)
  const diastolicValue = parseVital(diastolic)
  const hasStartedInput = hasStartedBloodPressureInput(
    systolic,
    diastolic,
    heartRate,
  )
  const status = judgeBloodPressure(systolicValue, diastolicValue)
  const statusStyle = getStatusStyle(status, isDarkMode)

  return (
    <RecordCard
      type="weight"
      title="오늘의 혈압을 기록해 주세요."
      subtitle={hasPrevious ? undefined : "이전 기록이 없어요"}
      icon={
        <Image
          source={require("@/assets/images/bp-icon.png")}
          style={styles.icon}
        />
      }
    >
      <YStack paddingTop="$4" gap="$3">
        {/* Blood pressure value row */}
        <XStack alignItems="center" gap="$3">
          <XStack
            backgroundColor={statusStyle.backgroundColor}
            paddingVertical="$1.5"
            paddingHorizontal="$3"
            borderRadius="$4"
          >
            <Text fontSize="$4" fontWeight="600" color={statusStyle.textColor}>
              {VITAL_STATUS_LABEL[status]}
            </Text>
          </XStack>

          <XStack flex={1} alignItems="center" justifyContent="center" gap="$2">
            <TextInput
              style={[styles.bpInput, { color: numberColor }]}
              placeholder={BP_PLACEHOLDER.systolic}
              placeholderTextColor={placeholderColor}
              value={systolic}
              onChangeText={onChangeSystolic}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text fontSize={28} fontWeight="600" color={numberColor}>
              -
            </Text>
            <TextInput
              style={[styles.bpInput, { color: numberColor }]}
              placeholder={BP_PLACEHOLDER.diastolic}
              placeholderTextColor={placeholderColor}
              value={diastolic}
              onChangeText={onChangeDiastolic}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text fontSize="$5" fontWeight="500" color={labelColor}>
              mmHg
            </Text>
          </XStack>
        </XStack>

        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* Heart rate row */}
        <XStack alignItems="center" justifyContent="center" gap="$3">
          <Text fontSize="$4" fontWeight="500" color={labelColor}>
            심박수
          </Text>
          <View style={[styles.vDivider, { backgroundColor: dividerColor }]} />
          <TextInput
            style={[styles.hrInput, { color: numberColor }]}
            placeholder={BP_PLACEHOLDER.heartRate}
            placeholderTextColor={placeholderColor}
            value={heartRate}
            onChangeText={onChangeHeartRate}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text fontSize="$5" fontWeight="500" color={labelColor}>
            bpm
          </Text>
        </XStack>

        {hasStartedInput && (
          <YStack alignItems="center" gap="$2">
            {!canSave && (
              <Text fontSize="$3" color={labelColor} textAlign="center">
                수축기·이완기·맥박을 모두 입력한 뒤 저장할 수 있어요.
              </Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="혈압 저장"
              accessibilityState={{ disabled: !canSave || isSaving }}
              disabled={!canSave || isSaving}
              onPress={onSave}
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    canSave && !isSaving
                      ? tokens.color.sub6.val
                      : tokens.color.grey7.val,
                },
              ]}
            >
              <Text color="$pureWhite" fontSize="$4" fontWeight="600">
                {isSaving ? "저장 중…" : "혈압 저장"}
              </Text>
            </TouchableOpacity>
          </YStack>
        )}
      </YStack>
    </RecordCard>
  )
}

function getStatusStyle(status: VitalStatus, isDarkMode: boolean) {
  if (status === "normal") {
    return {
      backgroundColor: isDarkMode
        ? tokens.color.waterPercentBgDark.val
        : tokens.color.waterPercentBg.val,
      textColor: isDarkMode
        ? tokens.color.textDark.val
        : tokens.color.waterFillBottom.val,
      indicatorColor: tokens.color.waterFillBottom.val,
      trackColor: isDarkMode
        ? tokens.color.borderDark.val
        : tokens.color.waterPercentBg.val,
    }
  }
  if (status === "caution") {
    return {
      backgroundColor: isDarkMode
        ? tokens.color.primary7.val
        : tokens.color.primary1.val,
      textColor: isDarkMode
        ? tokens.color.pureWhite.val
        : tokens.color.primary8.val,
      indicatorColor: tokens.color.primary8.val,
      trackColor: isDarkMode
        ? tokens.color.borderDark.val
        : tokens.color.primary2.val,
    }
  }
  return {
    backgroundColor: isDarkMode
      ? tokens.color.appBgDark.val
      : tokens.color.grey8.val,
    textColor: isDarkMode
      ? tokens.color.textDarkSub.val
      : tokens.color.grey5.val,
    indicatorColor: tokens.color.grey6.val,
    trackColor: isDarkMode
      ? tokens.color.borderDark.val
      : tokens.color.grey8.val,
  }
}

const styles = StyleSheet.create({
  icon: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  bpInput: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 56,
  },
  hrInput: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 44,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  vDivider: {
    width: 1,
    height: 20,
  },
  saveButton: {
    minWidth: 112,
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
})
