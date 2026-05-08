import { Text, XStack, YStack } from "tamagui"
import { DietaryGuideContainer } from "./DietaryGuideContainer"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"

interface DietaryGuideProps {
  dietaryGuide?: string
  cautionFoods?: string[]
}

export function DietaryGuide({
  dietaryGuide,
  cautionFoods,
}: DietaryGuideProps) {
  const isDarkMode = useAppColorScheme() === "dark"

  return (
    <YStack paddingVertical="$3" gap="$3">
      <Text
        fontSize={20}
        fontWeight="600"
        color={isDarkMode ? "$textDark" : "$black"}
      >
        식이 가이드
      </Text>

      <DietaryGuideContainer title="한줄평">
        <Text
          fontSize={14}
          color={isDarkMode ? "$textDark" : "$black"}
          lineHeight={18}
        >
          {dietaryGuide ?? "오늘의 식이 분석 데이터가 없어요."}
        </Text>
      </DietaryGuideContainer>

      {cautionFoods && cautionFoods.length > 0 && (
        <>
          <Text
            fontSize={15}
            fontWeight="500"
            color="$colorSubtle"
            paddingTop="$3"
          >
            주의할 음식
          </Text>
          <DietaryGuideContainer title="주의 식품">
            <XStack flexWrap="wrap" gap="$2">
              {cautionFoods.map((food) => (
                <Text
                  key={food}
                  fontSize={13}
                  fontWeight="600"
                  backgroundColor="$primary2"
                  color="$primary"
                  paddingHorizontal="$2"
                  paddingVertical="$1.5"
                  borderRadius="$4"
                >
                  {food}
                </Text>
              ))}
            </XStack>
          </DietaryGuideContainer>
        </>
      )}
    </YStack>
  )
}
