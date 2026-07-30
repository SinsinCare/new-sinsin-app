/**
 * 조리 단계 타이머. 계약 §6.2 "timerSeconds 가 있으면 타이머 버튼(실제로 동작)".
 *
 * 왜 남은 초를 세지 않고 **끝나는 시각**을 들고 있는가:
 *   `setInterval` 로 1씩 빼면 앱이 백그라운드로 갔다 오거나 프레임이 밀릴 때마다
 *   실제 시간보다 느려진다. 조리 타이머가 느려지면 사용자는 태운 뒤에야 안다.
 *   그래서 `endAt`(epoch ms)만 상태로 두고 화면은 `Date.now()` 와의 차이를 그린다.
 *   0.5초마다 그리는 것은 초 표기가 한 박자 늦게 바뀌는 것을 막기 위한 것이다.
 *
 * 알림(스케줄된 푸시)은 붙이지 않았다 — 화면을 벗어난 뒤의 알림은 권한·정책이 걸린 별개의
 * 결정이고, 이 화면의 약속("버튼을 누르면 실제로 줄어든다")은 이것으로 지켜진다.
 */
import { useEffect, useState } from "react"
import { Pressable } from "react-native"
import * as Haptics from "expo-haptics"
import { Text, XStack } from "tamagui"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { formatDuration } from "./recipeDetailModel"

export interface StepTimerButtonProps {
  seconds: number
}

export function StepTimerButton({ seconds }: StepTimerButtonProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const [endAt, setEndAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(seconds)

  // 단계가 바뀌면(다른 레시피·다른 시간) 처음 상태로 돌린다.
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
          // 진동이 없는 기기에서도 타이머 자체는 끝난다.
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

  return (
    <XStack alignItems="center" gap={8} alignSelf="flex-start">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <XStack
          alignItems="center"
          gap={6}
          height={LAYOUT.chip.height}
          paddingHorizontal={12}
          borderRadius={LAYOUT.chip.radius}
          borderWidth={1}
          borderColor={running ? surface.brand : surface.border}
          backgroundColor={running ? surface.surfaceBrand : surface.card}
        >
          <Ionicons
            name={running ? "pause" : done ? "refresh" : "timer-outline"}
            size={14}
            color={running ? surface.brand : surface.textMuted}
          />
          <Text
            {...TYPE.caption}
            fontFamily="$body"
            fontWeight="600"
            color={running ? surface.brand : surface.textStrong}
          >
            {label}
          </Text>
        </XStack>
      </Pressable>

      {/* 멈춘 상태에서 되돌릴 길을 항상 남긴다(§6.4 되돌리기). */}
      {!running && remaining !== seconds && !done && (
        <Pressable
          onPress={() => setRemaining(seconds)}
          accessibilityRole="button"
          accessibilityLabel={t("detail.steps.timerReset")}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
            {t("detail.steps.timerReset")}
          </Text>
        </Pressable>
      )}
    </XStack>
  )
}
