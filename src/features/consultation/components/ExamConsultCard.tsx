import { useState } from "react"
import { LayoutAnimation, Pressable, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"
import { Text, View, XStack, YStack } from "tamagui"

import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Icon } from "@/src/shared/components/Icon"
import {
  EXAM_CARD_PREVIEW_COUNT,
  type ExamConsultCardData,
  type ExamMetricStatus,
} from "../utils/examConsultMessage"
import {
  USER_BUBBLE_BG,
  USER_BUBBLE_TEXT,
  type ChatScheme,
} from "./chatPalette"

/**
 * 잉크 면 위의 보조 톤. `FoodConsultCard` 와 **같은 값**을 쓴다 — 사용자 턴 카드가 둘인데
 * 톤이 다르면 같은 화면에서 두 개의 디자인 언어가 보인다.
 */
const CARD_TONE: Record<
  ChatScheme,
  { muted: string; soft: string; hairline: string }
> = {
  light: {
    muted: "rgba(255,255,255,0.58)",
    soft: "rgba(255,255,255,0.78)",
    hairline: "rgba(255,255,255,0.12)",
  },
  dark: {
    muted: "rgba(23,24,28,0.52)",
    soft: "rgba(23,24,28,0.72)",
    hairline: "rgba(23,24,28,0.09)",
  },
}

/**
 * 상태 점의 색.
 *
 * 사용자 턴은 잉크 면이라 앱의 시맨틱 색(연한 red/yellow weak)을 그대로 얹으면 배경에
 * 묻힌다. 그래서 면 위에서도 읽히는 진한 값을 쓴다 — 의미는 같고 대비만 올린 것이다.
 * 정상은 **점을 찍지 않는다**: 문제 없는 항목까지 색을 얻으면 카드가 색점밭이 되고,
 * 정작 눈이 가야 할 위험·주의가 묻힌다.
 */
const STATUS_DOT: Record<Exclude<ExamMetricStatus, "normal">, string> = {
  warning: "#ff6b6b",
  caution: "#ffc06e",
}

function Hairline({ color }: { color: string }) {
  return <View height={StyleSheet.hairlineWidth} backgroundColor={color} />
}

/**
 * 검진 상세에서 넘어온 "질문하기" 메시지의 사용자 턴 카드.
 *
 * 원문 프롬프트는 지표가 최대 13줄짜리 텍스트 덩어리다. 그대로 말풍선에 넣으면 사용자가
 * 자기가 무엇을 보냈는지 읽을 수 없다 — 무엇을 보냈는지 **한눈에 보이는 것**이
 * 건강 데이터를 넘길 때는 특히 중요하다.
 *
 * 기본은 4개만 보여 주고 나머지는 접는다. 지표는 이미 위험 → 주의 → 정상 순으로 정렬돼
 * 오므로, 접힌 뒤에 남는 것이 정확히 문제 수치다.
 */
export function ExamConsultCard({ data }: { data: ExamConsultCardData }) {
  const { t } = useTranslation()
  const scheme: ChatScheme = useAppColorScheme() === "dark" ? "dark" : "light"
  const [expanded, setExpanded] = useState(false)

  const ink = USER_BUBBLE_TEXT[scheme]
  const tone = CARD_TONE[scheme]

  const hidden = Math.max(0, data.metrics.length - EXAM_CARD_PREVIEW_COUNT)
  const visible = expanded
    ? data.metrics
    : data.metrics.slice(0, EXAM_CARD_PREVIEW_COUNT)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((open) => !open)
  }

  return (
    <YStack
      alignSelf="stretch"
      backgroundColor={USER_BUBBLE_BG[scheme]}
      borderRadius={20}
      paddingHorizontal={18}
      paddingVertical={16}
      gap={14}
    >
      {/* 무엇에 대한 카드인지 — 출처(건강검진)와 검진일은 한 줄로 조용히 */}
      <YStack gap={3}>
        <Text
          fontSize={12}
          lineHeight={16}
          fontWeight="600"
          letterSpacing={-0.1}
          color={tone.muted}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("consult.examCard.eyebrow")}
          {data.dateLabel ? ` · ${data.dateLabel}` : ""}
        </Text>
        {data.countsLabel && (
          <Text
            fontSize={17}
            lineHeight={24}
            fontWeight="700"
            letterSpacing={-0.34}
            color={ink}
          >
            {data.countsLabel}
          </Text>
        )}
      </YStack>

      {visible.length > 0 && (
        <>
          <Hairline color={tone.hairline} />
          <YStack gap={10}>
            {visible.map((metric, index) => (
              <XStack
                key={`${metric.label}:${index}`}
                alignItems="center"
                gap={8}
              >
                {metric.status && metric.status !== "normal" && (
                  <View
                    width={6}
                    height={6}
                    borderRadius={3}
                    backgroundColor={STATUS_DOT[metric.status]}
                  />
                )}
                <Text
                  flex={1}
                  fontSize={14}
                  lineHeight={20}
                  color={tone.soft}
                  numberOfLines={1}
                >
                  {metric.label}
                </Text>
                <XStack alignItems="baseline" gap={3}>
                  <Text
                    fontSize={15}
                    lineHeight={21}
                    fontWeight="700"
                    letterSpacing={-0.3}
                    color={ink}
                  >
                    {metric.value}
                  </Text>
                  {metric.unit !== "" && (
                    <Text fontSize={12} lineHeight={16} color={tone.muted}>
                      {metric.unit}
                    </Text>
                  )}
                </XStack>
              </XStack>
            ))}
          </YStack>
        </>
      )}

      {hidden > 0 && (
        <YStack gap={12}>
          <Hairline color={tone.hairline} />
          <Pressable
            onPress={toggle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
          >
            {({ pressed }) => (
              <XStack
                alignItems="center"
                justifyContent="space-between"
                opacity={pressed ? 0.55 : 1}
              >
                <Text
                  fontSize={13}
                  lineHeight={18}
                  color={tone.soft}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {expanded
                    ? t("consult.examCard.metricsCollapse")
                    : t("consult.examCard.metricsToggle", { count: hidden })}
                </Text>
                {/* 아이콘 세트에 chevron-up/down 이 없다. 식사 카드와 같이 하나를 돌려 쓴다. */}
                <View rotate={expanded ? "-90deg" : "90deg"} opacity={0.62}>
                  <Icon name="chevron-right" size={14} color={tone.soft} />
                </View>
              </XStack>
            )}
          </Pressable>
        </YStack>
      )}
    </YStack>
  )
}
