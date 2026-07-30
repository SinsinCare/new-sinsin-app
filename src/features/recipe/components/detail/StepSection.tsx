/**
 * 조리 순서 — NYT Cooking 의 "한 단계씩 몰입" 을 가져온다(계약 §6.2).
 * 그래서 단계 본문은 이 화면에서 가장 큰 글씨다(17/26). 재료가 밀도라면 순서는 몰입이다.
 *
 * 번호는 원(circle)에 넣지 않고 큰 회색 숫자로 둔다 — 원을 브랜드색으로 채우면 단계마다
 * 강조가 하나씩 생겨 화면 전체가 주황으로 얼룩진다(§6.4 "한 화면에 강조는 하나").
 */
import { Image } from "expo-image"
import { Text, View, XStack, YStack } from "tamagui"
import { useTranslation } from "react-i18next"
import { useSurface } from "@/src/hooks/useSurface"
import { TYPE } from "@/src/theme/surface"
import type { RecipeStep } from "../../types/recipeV2"
import { StepTimerButton } from "./StepTimerButton"

export interface StepSectionProps {
  steps: RecipeStep[]
}

export function StepSection({ steps }: StepSectionProps) {
  const { t } = useTranslation("recipe")
  const surface = useSurface()

  return (
    <YStack gap={14}>
      <Text
        {...TYPE.sectionTitle}
        fontFamily="$body"
        fontWeight="700"
        color={surface.textStrong}
      >
        {t("detail.steps.title")}
      </Text>

      {steps.length === 0 ? (
        <Text {...TYPE.caption} fontFamily="$body" color={surface.textMuted}>
          {t("detail.steps.empty")}
        </Text>
      ) : (
        <YStack gap={24}>
          {steps.map((step) => (
            <XStack key={step.ordinal} gap={14} alignItems="flex-start">
              <Text
                fontSize={17}
                lineHeight={26}
                fontFamily="$body"
                fontWeight="700"
                color={surface.textWeak}
                minWidth={20}
              >
                {step.ordinal}
              </Text>
              <YStack flex={1} gap={12}>
                <Text
                  fontSize={17}
                  lineHeight={26}
                  letterSpacing={-0.34}
                  fontFamily="$body"
                  color={surface.text}
                >
                  {step.text}
                </Text>
                {step.imageUrl && (
                  <View
                    borderRadius={12}
                    overflow="hidden"
                    backgroundColor={surface.surface}
                    style={{ width: "100%", aspectRatio: 4 / 3 }}
                  >
                    <Image
                      source={{ uri: step.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </View>
                )}
                {step.timerSeconds != null && step.timerSeconds > 0 && (
                  <StepTimerButton seconds={step.timerSeconds} />
                )}
              </YStack>
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  )
}
