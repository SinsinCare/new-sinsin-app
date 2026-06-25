import { TextInput, StyleSheet, Image, TouchableOpacity } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack } from "tamagui"
import { RecordCard } from "./RecordCard"
import { tokens } from "@/src/theme/tokens"
import {
  GLUCOSE_TIMING_OPTIONS,
  GLUCOSE_TIMING_LABEL,
  GLUCOSE_ELAPSED_OPTIONS,
  GLUCOSE_ELAPSED_LABEL,
  GLUCOSE_PLACEHOLDER,
  VITAL_RANGE,
  VITAL_STATUS_LABEL,
  type GlucoseTiming,
  type GlucoseElapsed,
} from "../../data/bloodMetricsConstants"
import { VitalRangeIndicator } from "./VitalRangeIndicator"
import {
  judgeGlucose,
  parseVital,
  type VitalStatus,
} from "../../utils/vitalsJudgment"

interface BloodGlucoseRecordProps {
  glucose: string
  timing: GlucoseTiming
  elapsed: GlucoseElapsed
  hasPrevious?: boolean
  onChangeGlucose: (value: string) => void
  onChangeTiming: (timing: GlucoseTiming) => void
  onChangeElapsed: (elapsed: GlucoseElapsed) => void
  onSave: () => void
}

export function BloodGlucoseRecord({
  glucose,
  timing,
  elapsed,
  hasPrevious = false,
  onChangeGlucose,
  onChangeTiming,
  onChangeElapsed,
  onSave,
}: BloodGlucoseRecordProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const numberColor = isDarkMode ? tokens.color.textDark.val : "#1a1a1a"
  const placeholderColor = tokens.color.grey6.val
  const labelColor = isDarkMode ? "$textDarkSub" : "$grey5"
  const activeColor = isDarkMode ? "$textDark" : "$black"

  const showElapsed = timing === "AFTER_MEAL"
  const glucoseValue = parseVital(glucose)
  const status = judgeGlucose(glucoseValue, timing)
  const statusStyle = getStatusStyle(status, isDarkMode)

  return (
    <RecordCard
      type="weight"
      title="오늘의 혈당을 기록해 주세요."
      subtitle={hasPrevious ? undefined : "이전 기록이 없어요"}
      icon={
        <Image
          source={require("@/assets/images/glucose-icon.png")}
          style={styles.icon}
        />
      }
    >
      <YStack paddingTop="$4" gap="$4">
        <XStack alignItems="center" gap="$2">
          {/* Timing selector */}
          <YStack gap="$1.5" minWidth={72}>
            {GLUCOSE_TIMING_OPTIONS.map((option) => {
              const isSelected = timing === option
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => onChangeTiming(option)}
                >
                  <Text
                    fontSize="$5"
                    fontWeight={isSelected ? "700" : "500"}
                    color={isSelected ? activeColor : labelColor}
                  >
                    {GLUCOSE_TIMING_LABEL[option]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </YStack>

          {/* Glucose value */}
          <XStack
            flex={1}
            alignItems="baseline"
            justifyContent="center"
            gap="$2"
          >
            <TextInput
              style={[styles.glucoseInput, { color: numberColor }]}
              placeholder={GLUCOSE_PLACEHOLDER}
              placeholderTextColor={placeholderColor}
              value={glucose}
              onChangeText={onChangeGlucose}
              onEndEditing={onSave}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text fontSize="$5" fontWeight="500" color={labelColor}>
              mg/dL
            </Text>
          </XStack>

          {/* Status chip */}
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
        </XStack>

        <VitalRangeIndicator
          status={status}
          value={glucoseValue}
          min={VITAL_RANGE.glucose.min}
          max={VITAL_RANGE.glucose.max}
          defaultValue={VITAL_RANGE.glucose.defaultValue}
          color={statusStyle.indicatorColor}
          trackColor={statusStyle.trackColor}
        />

        {showElapsed && (
          <XStack
            backgroundColor={isDarkMode ? "$appBgDark" : "$backgroundFocus"}
            borderRadius="$5"
            padding="$1"
          >
            {GLUCOSE_ELAPSED_OPTIONS.map((option) => {
              const isSelected = elapsed === option
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.segment}
                  onPress={() => onChangeElapsed(option)}
                >
                  <XStack
                    flex={1}
                    justifyContent="center"
                    alignItems="center"
                    paddingVertical="$2.5"
                    borderRadius="$4"
                    backgroundColor={
                      isSelected
                        ? isDarkMode
                          ? "$cardBgDark"
                          : "$pureWhite"
                        : "transparent"
                    }
                    borderWidth={isSelected ? 1 : 0}
                    borderColor={isDarkMode ? "$borderDark" : "$borderLight"}
                  >
                    <Text
                      fontSize="$4"
                      fontWeight={isSelected ? "700" : "500"}
                      color={isSelected ? activeColor : labelColor}
                    >
                      {GLUCOSE_ELAPSED_LABEL[option]}
                    </Text>
                  </XStack>
                </TouchableOpacity>
              )
            })}
          </XStack>
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
  glucoseInput: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 70,
  },
  segment: {
    flex: 1,
  },
})
