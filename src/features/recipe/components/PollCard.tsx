import { useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useSurface } from "@/src/hooks/useSurface"
import { hapticSelection } from "@/src/lib/haptics"
import { SurfacePressable } from "@/src/shared/components/SurfacePressable"
import type { CommunityPostVote } from "../types"
import { useTranslation } from "react-i18next"

const BAR_EASE = Easing.bezier(0.22, 1, 0.36, 1)
/** 옵션 행 높이의 절반 — 행과 득표 캡슐이 같은 곡률을 공유한다. */
const OPTION_HEIGHT = 52
const OPTION_RADIUS = OPTION_HEIGHT / 2

/** 득표 캡슐 — 행 왼쪽에서 득표율만큼 차오르는 알약 면. */
function ResultFill({ percent, color }: { percent: number; color: string }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 520,
      easing: BAR_EASE,
      reduceMotion: ReduceMotion.System,
    })
  }, [progress])

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${percent * progress.value}%`,
  }))

  return (
    <Animated.View
      style={[styles.resultFill, { backgroundColor: color }, animatedStyle]}
    />
  )
}

interface PollCardProps {
  vote: CommunityPostVote
  isSubmitting?: boolean
  onVote: (optionIds: number[]) => void | Promise<void>
}

function getPercent(count: number, total: number) {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

/**
 * 투표 카드 — 선택 전에는 라디오/체크 캡슐 행, 투표 후에는 득표율만큼
 * 차오르는 캡슐 바. 내 선택만 브랜드 틴트를 받고 숫자는 % 하나만 말한다.
 */
export function PollCard({
  vote,
  isSubmitting = false,
  onVote,
}: PollCardProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const hasVoted = vote.myVote !== null
  const myVoteSet = useMemo(() => new Set(vote.myVote ?? []), [vote.myVote])

  const optionBg = surface.isDark ? "#2E2E33" : surface.card
  const fillBg = surface.isDark ? "#3A3A40" : surface.surfacePressed
  const inkBg = surface.isDark ? "#F4F4F6" : "#1D1E20"
  const inkContent = surface.isDark ? "#17181C" : "#FFFFFF"

  /**
   * 투표는 되돌릴 수 없으므로 단일 선택도 바로 제출하지 않는다 —
   * 선택(라디오)과 확정(투표하기 버튼)을 갈라 실수를 막는다.
   */
  const toggleOption = (optionId: number) => {
    if (hasVoted || isSubmitting) return
    hapticSelection()
    setSelectedIds((prev) => {
      if (vote.allowMultiple) {
        return prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      }
      return prev.includes(optionId) ? [] : [optionId]
    })
  }

  const submitVote = () => {
    if (selectedIds.length === 0 || isSubmitting) return
    hapticSelection()
    void onVote(selectedIds)
  }

  const canSubmit = selectedIds.length > 0 && !isSubmitting

  return (
    <View style={[styles.card, { backgroundColor: surface.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: surface.brand }]}>
          {t("poll.label")}
        </Text>
        <Text style={[styles.meta, { color: surface.textMuted }]}>
          {hasVoted
            ? t("poll.participants", { count: vote.totalCount })
            : vote.allowMultiple
              ? t("poll.multipleHint")
              : t("poll.singleHint")}
        </Text>
      </View>

      {/* 질문(선택) — 글 제목과 별개로 투표가 스스로 묻는다. */}
      {vote.title && (
        <Text
          style={[styles.question, { color: surface.textStrong }]}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
        >
          {vote.title}
        </Text>
      )}

      <View style={styles.options}>
        {vote.options.map((option) => {
          const selected = hasVoted
            ? myVoteSet.has(option.id)
            : selectedIds.includes(option.id)
          const percent = getPercent(option.count, vote.totalCount)

          return (
            <SurfacePressable
              key={option.id}
              onPress={() => toggleOption(option.id)}
              disabled={hasVoted || isSubmitting}
              haptic={false}
              accessibilityState={{
                selected,
                disabled: hasVoted || isSubmitting,
              }}
              baseColor={
                selected && !hasVoted ? surface.surfaceBrand : optionBg
              }
              style={styles.option}
            >
              {hasVoted && percent > 0 && (
                <ResultFill
                  percent={percent}
                  color={selected ? surface.surfaceBrand : fillBg}
                />
              )}
              <View style={styles.optionInner}>
                {!hasVoted && (
                  <View
                    style={[
                      styles.selector,
                      {
                        borderRadius: vote.allowMultiple ? 5 : 9,
                        borderColor: selected
                          ? surface.brand
                          : surface.textWeak,
                        backgroundColor: selected
                          ? surface.brand
                          : "transparent",
                      },
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                )}
                {hasVoted && selected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={surface.brand}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selected ? surface.brand : surface.textStrong,
                      fontWeight: selected ? "700" : "500",
                      fontFamily: selected
                        ? "Pretendard-Bold"
                        : "Pretendard-Medium",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {option.text}
                </Text>
                {hasVoted && (
                  <Text
                    style={[
                      styles.percent,
                      {
                        color: selected ? surface.brand : surface.textStrong,
                      },
                    ]}
                  >
                    {percent}%
                  </Text>
                )}
              </View>
            </SurfacePressable>
          )
        })}
      </View>

      {!hasVoted && (
        <SurfacePressable
          onPress={submitVote}
          disabled={!canSubmit}
          haptic={false}
          baseColor={canSubmit ? inkBg : surface.ctaOffBg}
          pressedColor={
            canSubmit
              ? surface.isDark
                ? "#DADAE0"
                : "#34363A"
              : surface.ctaOffBg
          }
          pressScale={0.97}
          style={styles.submitButton}
        >
          <Text
            style={[
              styles.submitLabel,
              { color: canSubmit ? inkContent : surface.ctaOffText },
            ]}
          >
            {isSubmitting
              ? t("poll.submitting")
              : canSubmit
                ? t("poll.submit")
                : t("poll.selectFirst")}
          </Text>
        </SurfacePressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.25,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    fontWeight: "500",
    fontFamily: "Pretendard-Medium",
  },
  question: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.34,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
    marginTop: -4,
  },
  options: {
    gap: 8,
  },
  option: {
    height: OPTION_HEIGHT,
    borderRadius: OPTION_RADIUS,
    overflow: "hidden",
  },
  resultFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    minWidth: OPTION_HEIGHT,
    borderRadius: OPTION_RADIUS,
  },
  optionInner: {
    height: OPTION_HEIGHT,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selector: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
  },
  percent: {
    fontSize: 14.5,
    lineHeight: 20,
    letterSpacing: -0.29,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
  submitButton: {
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.3,
    fontWeight: "700",
    fontFamily: "Pretendard-Bold",
  },
})
