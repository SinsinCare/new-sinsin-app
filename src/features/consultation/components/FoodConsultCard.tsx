import { useState } from "react"
import { LayoutAnimation, Pressable } from "react-native"
import { useTranslation } from "react-i18next"
import { V2Box, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"

import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import { Icon } from "@/src/shared/components/Icon"
import {
  resolveNutrientLabel,
  type FoodConsultCardData,
  type FoodConsultTranslate,
} from "../utils/foodConsultMessage"
import {
  Hairline,
  USER_BUBBLE_BG,
  USER_BUBBLE_TEXT,
  USER_CARD_TONE,
  type ChatScheme,
} from "./chatPalette"

/**
 * 식이리포트에서 넘어온 "물어보기" 메시지의 사용자 턴 카드.
 * 원문 프롬프트 텍스트 덩어리 대신 식사 이름·영양 수치를 구조로 보여준다.
 * 음식별 상세는 접어 두고 필요할 때만 펼친다 — 기본 밀도를 낮게 유지.
 */
export function FoodConsultCard({ data }: { data: FoodConsultCardData }) {
  const { t } = useTranslation()
  // 라벨 복원에 넘길 얇은 어댑터 — i18next TFunction 의 키 타입 제약을 푼다.
  const translate: FoodConsultTranslate = (key, options) =>
    String(t(key as never, options as never))
  const scheme: ChatScheme = useAppColorScheme() === "dark" ? "dark" : "light"
  const [foodsOpen, setFoodsOpen] = useState(false)

  const ink = USER_BUBBLE_TEXT[scheme]
  const tone = USER_CARD_TONE[scheme]

  const metaLine = [data.mealLabel, data.servingsLabel]
    .filter(Boolean)
    .join(" · ")

  const toggleFoods = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setFoodsOpen((open) => !open)
  }

  return (
    <V2VStack
      paddingHorizontal={18}
      paddingVertical={16}
      gap={14}
      style={{
        alignSelf: "stretch",
        backgroundColor: USER_BUBBLE_BG[scheme],
        borderRadius: 20,
      }}
    >
      {/* 무엇에 대한 카드인지 — 출처(식사 기록)와 끼니·양은 한 줄로 조용히 */}
      <V2VStack gap={3}>
        <V2Text
          color={tone.muted}
          lineBreakStrategyIOS="hangul-word"
          style={{
            fontSize: 12,
            lineHeight: 16,
            fontWeight: "600",
            letterSpacing: -0.1,
          }}
        >
          {t("consult.foodCard.eyebrow")}
          {metaLine ? ` · ${metaLine}` : ""}
        </V2Text>
        <V2Text
          color={ink}
          lineBreakStrategyIOS="hangul-word"
          textBreakStrategy="balanced"
          style={{
            fontSize: 17,
            lineHeight: 24,
            fontWeight: "700",
            letterSpacing: -0.34,
          }}
        >
          {data.title}
        </V2Text>
      </V2VStack>

      {data.totals.length > 0 && (
        <>
          <Hairline color={tone.hairline} />
          <V2HStack wrap="wrap" style={{ rowGap: 12 }}>
            {data.totals.map((nutrient, index) => (
              <V2VStack
                key={`${nutrient.label}:${index}`}
                gap={2}
                style={{ width: "50%", paddingRight: index % 2 === 0 ? 10 : 0 }}
              >
                <V2Text
                  color={tone.muted}
                  style={{ fontSize: 12, lineHeight: 16 }}
                >
                  {resolveNutrientLabel(nutrient.label, translate)}
                </V2Text>
                <V2HStack align="baseline" gap={3}>
                  <V2Text
                    color={ink}
                    style={{
                      fontSize: 16,
                      lineHeight: 22,
                      fontWeight: "700",
                      letterSpacing: -0.32,
                    }}
                  >
                    {nutrient.amount}
                  </V2Text>
                  <V2Text
                    color={tone.muted}
                    style={{ fontSize: 12, lineHeight: 16 }}
                  >
                    {nutrient.unit}
                  </V2Text>
                </V2HStack>
              </V2VStack>
            ))}
          </V2HStack>
        </>
      )}

      {data.foods.length > 0 && (
        <V2VStack gap={12}>
          <Hairline color={tone.hairline} />
          <Pressable
            onPress={toggleFoods}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ expanded: foodsOpen }}
            accessibilityLabel={t("consult.foodCard.foodsToggle")}
          >
            {({ pressed }) => (
              <V2HStack
                align="center"
                justify="space-between"
                style={{ opacity: pressed ? 0.55 : 1 }}
              >
                <V2Text
                  color={tone.soft}
                  lineBreakStrategyIOS="hangul-word"
                  style={{ fontSize: 13, lineHeight: 18, fontWeight: "600" }}
                >
                  {t("consult.foodCard.foodsToggle")}
                </V2Text>
                {/* tamagui 는 `rotate` 를 직접 받지만 RN 은 `transform` 배열이어야 한다. */}
                <V2Box
                  style={{
                    transform: [{ rotate: foodsOpen ? "-90deg" : "90deg" }],
                    opacity: 0.62,
                  }}
                >
                  <Icon name="chevron-right" size={14} color={tone.soft} />
                </V2Box>
              </V2HStack>
            )}
          </Pressable>
          {foodsOpen &&
            data.foods.map((food, index) => (
              <V2VStack key={`${food.name}:${index}`} gap={3}>
                <V2Text
                  color={ink}
                  style={{ fontSize: 13, lineHeight: 18, fontWeight: "600" }}
                >
                  {food.name}
                </V2Text>
                {food.nutrients.length > 0 && (
                  <V2Text
                    color={tone.muted}
                    style={{ fontSize: 12, lineHeight: 17 }}
                  >
                    {food.nutrients
                      .map(
                        (nutrient) =>
                          `${resolveNutrientLabel(nutrient.label, translate)} ${nutrient.amount}${nutrient.unit}`,
                      )
                      .join(" · ")}
                  </V2Text>
                )}
              </V2VStack>
            ))}
        </V2VStack>
      )}

      {data.prompt.length > 0 && (
        <V2VStack gap={12}>
          <Hairline color={tone.hairline} />
          <V2Text
            color={tone.soft}
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={{ fontSize: 13, lineHeight: 19, letterSpacing: -0.13 }}
          >
            {data.prompt}
          </V2Text>
        </V2VStack>
      )}
    </V2VStack>
  )
}
