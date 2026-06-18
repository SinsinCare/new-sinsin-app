import { useMemo, useState } from "react"
import { Pressable } from "react-native"
import { YStack, XStack, Text, View } from "tamagui"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { tokens } from "@/src/theme/tokens"
import type { CommunityPostVote } from "../types"

interface PollCardProps {
  vote: CommunityPostVote
  isSubmitting?: boolean
  onVote: (optionIds: number[]) => void | Promise<void>
}

const COLORS = {
  light: {
    background: "#FFFFFF",
    border: tokens.color.borderLight.val,
    title: tokens.color.textLight.val,
    text: "#474758",
    muted: "#8E8E93",
    optionBg: "#FCFCFC",
    selectedBg: "#E0FFF7",
    selectedBorder: tokens.color.sub6.val,
    barFill: tokens.color.sub3.val,
    buttonBg: tokens.color.sub6.val,
    buttonDisabled: "#C7C7CC",
    buttonText: "#FFFFFF",
  },
  dark: {
    background: tokens.color.cardBgDark.val,
    border: tokens.color.borderDark.val,
    title: tokens.color.textDark.val,
    text: tokens.color.textDarkSub.val,
    muted: "#858591",
    optionBg: "#2A2A30",
    selectedBg: "#173E36",
    selectedBorder: tokens.color.sub5.val,
    barFill: "#1D9A7A",
    buttonBg: tokens.color.sub5.val,
    buttonDisabled: "#636366",
    buttonText: "#FFFFFF",
  },
} as const

function getPercent(count: number, total: number) {
  if (total <= 0) return 0
  return Math.round((count / total) * 100)
}

export function PollCard({
  vote,
  isSubmitting = false,
  onVote,
}: PollCardProps) {
  const scheme = useAppColorScheme()
  const colors = COLORS[scheme]
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const hasVoted = vote.myVote !== null
  const myVoteSet = useMemo(() => new Set(vote.myVote ?? []), [vote.myVote])

  const toggleOption = (optionId: number) => {
    if (hasVoted || isSubmitting) return
    if (!vote.allowMultiple) {
      void onVote([optionId])
      return
    }
    setSelectedIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId],
    )
  }

  const submitMultiple = () => {
    if (selectedIds.length === 0 || isSubmitting) return
    void onVote(selectedIds)
  }

  return (
    <YStack
      marginHorizontal={20}
      marginBottom={20}
      padding={16}
      gap={12}
      borderRadius={8}
      borderWidth={1}
      borderColor={colors.border}
      backgroundColor={colors.background}
    >
      <XStack justifyContent="space-between" alignItems="center" gap={12}>
        <Text
          fontSize={15}
          lineHeight={20}
          fontWeight="700"
          fontFamily="$body"
          color={colors.title}
        >
          투표
        </Text>
        <Text
          fontSize={12}
          lineHeight={16}
          fontWeight="500"
          fontFamily="$body"
          color={colors.muted}
        >
          {hasVoted
            ? `총 ${vote.totalCount}표`
            : vote.allowMultiple
              ? "복수 선택"
              : "단일 선택"}
        </Text>
      </XStack>

      <YStack gap={8}>
        {vote.options.map((option) => {
          const selected = hasVoted
            ? myVoteSet.has(option.id)
            : selectedIds.includes(option.id)
          const percent = getPercent(option.count, vote.totalCount)

          return (
            <Pressable
              key={option.id}
              onPress={() => toggleOption(option.id)}
              disabled={hasVoted || isSubmitting}
              accessibilityRole="button"
              accessibilityState={{
                selected,
                disabled: hasVoted || isSubmitting,
              }}
              style={({ pressed }) => ({
                opacity: pressed && !hasVoted ? 0.85 : 1,
              })}
            >
              <YStack
                minHeight={48}
                overflow="hidden"
                borderRadius={8}
                borderWidth={1}
                borderColor={selected ? colors.selectedBorder : colors.border}
                backgroundColor={selected ? colors.selectedBg : colors.optionBg}
              >
                {hasVoted && (
                  <View
                    position="absolute"
                    left={0}
                    top={0}
                    bottom={0}
                    width={`${percent}%`}
                    backgroundColor={colors.barFill}
                    opacity={0.35}
                  />
                )}
                <XStack
                  minHeight={48}
                  paddingHorizontal={14}
                  paddingVertical={12}
                  alignItems="center"
                  gap={10}
                >
                  {!hasVoted && (
                    <View
                      width={18}
                      height={18}
                      borderRadius={vote.allowMultiple ? 4 : 9}
                      borderWidth={2}
                      borderColor={
                        selected ? colors.selectedBorder : colors.muted
                      }
                      backgroundColor={
                        selected ? colors.selectedBorder : "transparent"
                      }
                    />
                  )}
                  <Text
                    flex={1}
                    fontSize={14}
                    lineHeight={20}
                    fontWeight={selected ? "700" : "500"}
                    fontFamily="$body"
                    color={colors.text}
                  >
                    {option.text}
                  </Text>
                  {hasVoted && (
                    <XStack minWidth={72} justifyContent="flex-end" gap={6}>
                      <Text
                        fontSize={13}
                        lineHeight={18}
                        fontWeight="700"
                        fontFamily="$body"
                        color={colors.title}
                      >
                        {percent}%
                      </Text>
                      <Text
                        fontSize={13}
                        lineHeight={18}
                        fontWeight="500"
                        fontFamily="$body"
                        color={colors.muted}
                      >
                        {option.count}
                      </Text>
                    </XStack>
                  )}
                </XStack>
              </YStack>
            </Pressable>
          )
        })}
      </YStack>

      {!hasVoted && vote.allowMultiple && (
        <Pressable
          onPress={submitMultiple}
          disabled={selectedIds.length === 0 || isSubmitting}
          accessibilityRole="button"
          style={({ pressed }) => ({
            opacity: pressed && selectedIds.length > 0 ? 0.85 : 1,
          })}
        >
          <View
            height={44}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
            backgroundColor={
              selectedIds.length > 0 && !isSubmitting
                ? colors.buttonBg
                : colors.buttonDisabled
            }
          >
            <Text
              fontSize={14}
              fontWeight="700"
              fontFamily="$body"
              color={colors.buttonText}
            >
              {isSubmitting ? "투표 중..." : "투표하기"}
            </Text>
          </View>
        </Pressable>
      )}
    </YStack>
  )
}
