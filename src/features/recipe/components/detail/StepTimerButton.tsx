/**
 * 조리 단계의 타이머 칩. 누르면 세고, 다 세면 햅틱 한 번. 색은 v2 `useV2Theme()` 만 —
 * 진행 중은 브랜드(색 예산의 유일한 강조), 나머지는 그레이스케일.
 */

import { useEffect, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import * as Haptics from "expo-haptics"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import {
  V2Text,
  radius,
  spacing,
  touchTarget,
  useV2Theme,
} from "@/src/design-system-v2"
import { formatDuration } from "./recipeDetailModel"

export interface StepTimerButtonProps {
  seconds: number
}

export function StepTimerButton({ seconds }: StepTimerButtonProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()
  const [endAt, setEndAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setEndAt(null)
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (endAt == null) return
    const tick = () => {
      const left = Math.max(0, Math.round((endAt - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        setEndAt(null)
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {
          // 햅틱이 없는 기기 — 타이머 완료는 화면 문구가 이미 말한다.
        })
      }
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [endAt])

  const running = endAt != null
  const done = !running && remaining === 0
  const label = done
    ? t("detail.steps.timerDone")
    : running
      ? formatDuration(remaining)
      : remaining === seconds
        ? t("detail.steps.timerStart", { duration: formatDuration(seconds) })
        : t("detail.steps.timerResume")
  const actionLabel = done
    ? t("detail.steps.timerReset")
    : running
      ? t("detail.steps.timerPause")
      : label

  const onPress = () => {
    if (done) {
      setRemaining(seconds)
      return
    }
    if (running) {
      setEndAt(null)
      return
    }
    setEndAt(Date.now() + remaining * 1000)
  }

  const ink = running ? colors.primary.primary : colors.label.neutral
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: running
              ? colors.primary.primaryWeak
              : colors.fill.control,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons
          name={running ? "pause" : done ? "refresh" : "timer-outline"}
          size={14}
          color={ink}
        />
        <V2Text token="label.xSmall" color={ink}>
          {label}
        </V2Text>
      </Pressable>
      {/* 멈춘 채 남은 시간이 있으면 처음으로 되돌리는 길을 따로 둔다. */}
      {!running && remaining !== seconds && !done && (
        <Pressable
          onPress={() => setRemaining(seconds)}
          accessibilityRole="button"
          accessibilityLabel={t("detail.steps.timerReset")}
          hitSlop={spacing[8]}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <V2Text
            token="subtext.medium"
            color={colors.label.alternative}
            lineBreakStrategyIOS="hangul-word"
          >
            {t("detail.steps.timerReset")}
          </V2Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[6],
    height: touchTarget.min - spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: radius.md,
  },
})
