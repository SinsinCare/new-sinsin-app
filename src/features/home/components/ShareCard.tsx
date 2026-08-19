import { forwardRef } from "react"
import { Image, StyleSheet } from "react-native"
import ViewShot from "react-native-view-shot"
import { V2Box, V2HStack, V2Text, V2VStack } from "@/src/design-system-v2"
import { tokens } from "@/src/theme/tokens"
import type { FoodCameraAnalyzeResult } from "@/src/types"
import type { MealType } from "../types"
import { useTranslation } from "react-i18next"

function formatNutrientAmount(
  value: number | null,
  unit: "mg" | "g",
  unavailable: string,
): string {
  if (value == null) return unavailable
  const rounded = unit === "g" ? Math.round(value * 10) / 10 : Math.round(value)
  return `${rounded}${unit}`
}

interface ShareCardProps {
  result: FoodCameraAnalyzeResult
  imageUri?: string
  mealType?: MealType
}

export const ShareCard = forwardRef<ViewShot, ShareCardProps>(
  function ShareCard({ result, imageUri, mealType }, ref) {
    const { t } = useTranslation("common")
    const { total } = result

    const carbKcal = total.carbohydrates * 4
    const proteinKcal = total.protein * 4
    const fatKcal = total.fat * 9
    const totalKcal = carbKcal + proteinKcal + fatKcal || 1
    const carbPct = Math.round((carbKcal / totalKcal) * 100)
    const proteinPct = Math.round((proteinKcal / totalKcal) * 100)
    const fatPct = 100 - carbPct - proteinPct

    return (
      <ViewShot
        ref={ref}
        options={{ format: "png", quality: 1, result: "tmpfile" }}
        style={styles.offscreen}
      >
        <V2Box style={styles.card}>
          {/* 상단 앱 브랜딩 */}
          <V2HStack align="center" gap={8} style={{ paddingBottom: 12 }}>
            <Image
              source={require("@/assets/icon.png")}
              style={styles.appIcon}
            />
            <V2Text style={styles.appName}>{t("brand.name")}</V2Text>
          </V2HStack>

          {/* 음식 이미지 */}
          {imageUri && (
            <V2Box style={styles.imageWrapper}>
              <Image
                source={{ uri: imageUri }}
                style={styles.foodImage}
                resizeMode="cover"
              />
            </V2Box>
          )}

          {/* 음식 제목 + 식사 타입 */}
          <V2HStack
            align="center"
            justify="space-between"
            style={{ paddingTop: 14, paddingBottom: 4 }}
          >
            <V2Text numberOfLines={1} style={styles.title}>
              {result.title}
            </V2Text>
            {mealType && (
              <V2Box style={styles.mealBadge}>
                <V2Text style={styles.mealBadgeText}>
                  {t(`meal.${mealType}`)}
                </V2Text>
              </V2Box>
            )}
          </V2HStack>

          {/* 총 칼로리 */}
          <V2HStack align="baseline" gap={4} style={{ paddingBottom: 10 }}>
            <V2Text style={styles.calorieValue}>
              {Math.round(result.total.calories)}
            </V2Text>
            <V2Text style={styles.calorieUnit}>Kcal</V2Text>
          </V2HStack>

          {/* 탄단지 바 */}
          <V2HStack gap={10} style={{ paddingBottom: 8 }}>
            {[
              {
                label: t("mealReport.nutrients.carbohydrates"),
                value: `${Math.round(total.carbohydrates * 10) / 10}g`,
                color: tokens.color.sub9.val,
              },
              {
                label: t("mealReport.nutrients.protein"),
                value: `${Math.round(total.protein * 10) / 10}g`,
                color: tokens.color.sub6.val,
              },
              {
                label: t("mealReport.nutrients.fat"),
                value: `${Math.round(total.fat * 10) / 10}g`,
                color: tokens.color.sub4.val,
              },
            ].map(({ label, value, color }) => (
              <V2HStack key={label} align="center" gap={4}>
                <V2Box style={[styles.macroDot, { backgroundColor: color }]} />
                <V2Text style={styles.macroText}>
                  {label} {value}
                </V2Text>
              </V2HStack>
            ))}
          </V2HStack>
          <V2HStack style={{ height: 22, borderRadius: 4, overflow: "hidden" }}>
            <V2Box
              style={[
                styles.barSegment,
                {
                  flex: carbPct,
                  backgroundColor: tokens.color.sub9.val,
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                },
              ]}
            >
              {carbPct >= 8 && (
                <V2Text style={styles.barLabel}>{carbPct}%</V2Text>
              )}
            </V2Box>
            <V2Box
              style={[
                styles.barSegment,
                { flex: proteinPct, backgroundColor: tokens.color.sub6.val },
              ]}
            >
              {proteinPct >= 8 && (
                <V2Text style={styles.barLabel}>{proteinPct}%</V2Text>
              )}
            </V2Box>
            <V2Box
              style={[
                styles.barSegment,
                {
                  flex: fatPct,
                  backgroundColor: tokens.color.sub4.val,
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                },
              ]}
            >
              {fatPct >= 8 && (
                <V2Text style={styles.barLabel}>{fatPct}%</V2Text>
              )}
            </V2Box>
          </V2HStack>

          {/* 신장 관련 영양소 */}
          <V2HStack
            justify="space-between"
            style={{ paddingTop: 14, paddingBottom: 6 }}
          >
            {[
              {
                label: t("mealReport.nutrients.sodium"),
                value: formatNutrientAmount(
                  total.sodium,
                  "mg",
                  t("foodResult.unavailable"),
                ),
              },
              {
                label: t("mealReport.nutrients.potassium"),
                value: formatNutrientAmount(
                  total.potassium,
                  "mg",
                  t("foodResult.unavailable"),
                ),
              },
              {
                label: t("mealReport.nutrients.phosphorus"),
                value: formatNutrientAmount(
                  total.phosphorus,
                  "mg",
                  t("foodResult.unavailable"),
                ),
              },
              {
                label: t("mealReport.nutrients.protein"),
                value: `${Math.round(total.protein * 10) / 10}g`,
              },
            ].map(({ label, value }) => (
              <V2VStack key={label} align="center" gap={2}>
                <V2Text style={styles.nutrientLabel}>{label}</V2Text>
                <V2Text style={styles.nutrientValue}>{value}</V2Text>
              </V2VStack>
            ))}
          </V2HStack>

          {/* 하단 브랜딩 */}
          <V2HStack
            align="center"
            justify="center"
            gap={6}
            style={{ paddingTop: 14 }}
          >
            <Image
              source={require("@/assets/icon.png")}
              style={styles.footerIcon}
            />
            <V2Text style={styles.footerText}>{t("brand.tagline")}</V2Text>
          </V2HStack>
        </V2Box>
      </ViewShot>
    )
  },
)

const styles = StyleSheet.create({
  offscreen: {
    position: "absolute",
    left: -9999,
    top: -9999,
  },
  card: {
    width: 380,
    backgroundColor: tokens.color.pureWhite.val,
    borderRadius: 20,
    padding: 22,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: tokens.color.grey1.val,
  },
  imageWrapper: {
    borderRadius: 14,
    overflow: "hidden",
  },
  foodImage: {
    width: "100%",
    height: 200,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.color.grey1.val,
    flexShrink: 1,
  },
  mealBadge: {
    backgroundColor: tokens.color.grey8.val,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.color.grey4.val,
  },
  calorieValue: {
    fontSize: 28,
    fontWeight: "700",
    color: tokens.color.grey1.val,
  },
  calorieUnit: {
    fontSize: 16,
    fontWeight: "500",
    color: tokens.color.grey6.val,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    fontSize: 12,
    fontWeight: "500",
    color: tokens.color.grey5.val,
  },
  barSegment: {
    alignItems: "center",
    justifyContent: "center",
  },
  barLabel: {
    color: tokens.color.pureWhite.val,
    fontSize: 10,
    fontWeight: "700",
  },
  nutrientLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: tokens.color.grey6.val,
  },
  nutrientValue: {
    fontSize: 15,
    fontWeight: "700",
    color: tokens.color.grey1.val,
  },
  commentBox: {
    backgroundColor: tokens.color.appBg.val,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  commentText: {
    fontSize: 13,
    fontWeight: "500",
    color: tokens.color.grey3.val,
    lineHeight: 20,
  },
  footerIcon: {
    width: 18,
    height: 18,
    borderRadius: 5,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
    color: tokens.color.grey6.val,
  },
})
