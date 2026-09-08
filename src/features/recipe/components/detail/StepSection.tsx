import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 조리 순서 — NYT Cooking 의 "한 단계씩 몰입" 을 가져온다(계약 §6.2).
 * 그래서 단계 본문은 이 화면에서 가장 큰 글씨다(`body.mediumWeak` 17/26).
 * 재료가 밀도라면 순서는 몰입이다.
 *
 * 번호는 **회색 면**의 원에 넣는다. 원 자체는 위치를 잡아 주는 표시일 뿐이고, 색은
 * 끝까지 회색이다 — 브랜드색으로 채우면 단계마다 강조가 하나씩 생겨 화면 전체가
 * 주황으로 얼룩진다(계약 §6.4 "한 화면에 강조는 하나").
 */
import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"
import {
  CARD_RADIUS,
  SECTION_TITLE_GAP,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"
import type { RecipeStep } from "../../types/recipeV2"
import { StepTimerButton } from "./StepTimerButton"

export interface StepSectionProps {
  steps: RecipeStep[]
}

export function StepSection({ steps }: StepSectionProps) {
  const { t } = useTranslation("recipe")
  const { colors } = useV2Theme()

  return (
    <View style={styles.root}>
      <Text
        style={[styles.sectionTitle, { color: colors.label.normal }]}
        lineBreakStrategyIOS="hangul-word"
      >
        {t("detail.steps.title")}
      </Text>

      {steps.length === 0 ? (
        <Text
          style={[styles.empty, { color: colors.label.alternative }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("detail.steps.empty")}
        </Text>
      ) : (
        <View style={styles.list}>
          {steps.map((step) => (
            <View key={step.ordinal} style={styles.step}>
              <View
                style={[styles.badge, { backgroundColor: colors.fill.normal }]}
              >
                <Text
                  style={[styles.badgeText, { color: colors.label.neutral }]}
                >
                  {step.ordinal}
                </Text>
              </View>
              <View style={styles.stepBody}>
                <Text
                  style={[styles.text, { color: colors.label.normal }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {step.text}
                </Text>
                {step.imageUrl != null && step.imageUrl.length > 0 && (
                  <View
                    style={[
                      styles.photo,
                      { backgroundColor: colors.fill.normal },
                    ]}
                  >
                    <Image
                      source={remoteImageSource(step.imageUrl)}
                      style={styles.photoImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </View>
                )}
                {step.timerSeconds != null && step.timerSeconds > 0 && (
                  <StepTimerButton seconds={step.timerSeconds} />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing[20], gap: SECTION_TITLE_GAP },
  sectionTitle: { ...typography.title.xSmall },
  empty: { ...typography.subtext.large },
  list: { gap: spacing[24] },
  step: { flexDirection: "row", gap: spacing[12], alignItems: "flex-start" },
  badge: {
    width: 26,
    height: 26,
    marginTop: spacing[2],
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { ...typography.label.xSmall },
  stepBody: { flex: 1, gap: spacing[12] },
  text: { ...typography.subtext.large, lineHeight: 22 },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
  },
  photoImage: { width: "100%", height: "100%" },
})
