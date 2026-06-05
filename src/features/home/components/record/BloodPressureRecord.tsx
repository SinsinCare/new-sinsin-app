import { TextInput, StyleSheet, Image, View } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Text, XStack, YStack } from "tamagui"
import { RecordCard } from "./RecordCard"
import { tokens } from "@/src/theme/tokens"
import { BP_PLACEHOLDER } from "../../data/bloodMetricsConstants"

interface BloodPressureRecordProps {
  systolic: string
  diastolic: string
  heartRate: string
  hasPrevious?: boolean
  onChangeSystolic: (value: string) => void
  onChangeDiastolic: (value: string) => void
  onChangeHeartRate: (value: string) => void
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
  onSave,
}: BloodPressureRecordProps) {
  const isDarkMode = useAppColorScheme() === "dark"
  const numberColor = isDarkMode ? tokens.color.textDark.val : "#1a1a1a"
  const placeholderColor = tokens.color.grey6.val
  const labelColor = isDarkMode ? "$textDarkSub" : "$grey5"
  const dividerColor = isDarkMode
    ? tokens.color.borderDark.val
    : tokens.color.borderLight.val

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
            backgroundColor={isDarkMode ? "$appBgDark" : "$backgroundFocus"}
            paddingVertical="$1.5"
            paddingHorizontal="$3"
            borderRadius="$4"
          >
            <Text fontSize="$4" fontWeight="600" color={labelColor}>
              ----
            </Text>
          </XStack>

          <XStack flex={1} alignItems="center" justifyContent="center" gap="$2">
            <TextInput
              style={[styles.bpInput, { color: numberColor }]}
              placeholder={BP_PLACEHOLDER.systolic}
              placeholderTextColor={placeholderColor}
              value={systolic}
              onChangeText={onChangeSystolic}
              onEndEditing={onSave}
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
              onEndEditing={onSave}
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
            onEndEditing={onSave}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text fontSize="$5" fontWeight="500" color={labelColor}>
            bpm
          </Text>
        </XStack>
      </YStack>
    </RecordCard>
  )
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
})
