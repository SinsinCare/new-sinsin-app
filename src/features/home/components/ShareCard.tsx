import { forwardRef } from "react"
import { Image, StyleSheet } from "react-native"
import ViewShot from "react-native-view-shot"
import { View, Text, XStack, YStack } from "tamagui"
import { tokens } from "@/src/theme/tokens"
import type { FoodCameraAnalyzeResult } from "@/src/types"
import type { MealType } from "../types"

const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACKS: "간식",
}

interface ShareCardProps {
  result: FoodCameraAnalyzeResult
  imageUri?: string
  mealType?: MealType
}

export const ShareCard = forwardRef<ViewShot, ShareCardProps>(
  function ShareCard({ result, imageUri, mealType }, ref) {
    const { total, foods } = result

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
        <View style={styles.card}>
          {/* 상단 앱 브랜딩 */}
          <XStack alignItems="center" gap={8} paddingBottom={12}>
            <Image
              source={require("@/assets/icon.png")}
              style={styles.appIcon}
            />
            <Text style={styles.appName}>신신당부</Text>
          </XStack>

          {/* 음식 이미지 */}
          {imageUri && (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: imageUri }}
                style={styles.foodImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* 음식 제목 + 식사 타입 */}
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingTop={14}
            paddingBottom={4}
          >
            <Text style={styles.title} numberOfLines={1}>
              {result.title}
            </Text>
            {mealType && (
              <View style={styles.mealBadge}>
                <Text style={styles.mealBadgeText}>
                  {MEAL_LABEL[mealType]}
                </Text>
              </View>
            )}
          </XStack>

          {/* 총 칼로리 */}
          <XStack alignItems="baseline" gap={4} paddingBottom={10}>
            <Text style={styles.calorieValue}>
              {Math.round(result.total.calories)}
            </Text>
            <Text style={styles.calorieUnit}>Kcal</Text>
          </XStack>

          {/* 탄단지 바 */}
          <XStack gap={10} paddingBottom={8}>
            {[
              {
                label: "탄수화물",
                value: `${Math.round(total.carbohydrates * 10) / 10}g`,
                color: tokens.color.sub9.val,
              },
              {
                label: "단백질",
                value: `${Math.round(total.protein * 10) / 10}g`,
                color: tokens.color.sub6.val,
              },
              {
                label: "지방",
                value: `${Math.round(total.fat * 10) / 10}g`,
                color: tokens.color.sub4.val,
              },
            ].map(({ label, value, color }) => (
              <XStack key={label} alignItems="center" gap={4}>
                <View
                  style={[styles.macroDot, { backgroundColor: color }]}
                />
                <Text style={styles.macroText}>
                  {label} {value}
                </Text>
              </XStack>
            ))}
          </XStack>
          <XStack height={22} borderRadius={4} overflow="hidden">
            <View
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
                <Text style={styles.barLabel}>{carbPct}%</Text>
              )}
            </View>
            <View
              style={[
                styles.barSegment,
                { flex: proteinPct, backgroundColor: tokens.color.sub6.val },
              ]}
            >
              {proteinPct >= 8 && (
                <Text style={styles.barLabel}>{proteinPct}%</Text>
              )}
            </View>
            <View
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
                <Text style={styles.barLabel}>{fatPct}%</Text>
              )}
            </View>
          </XStack>

          {/* 신장 관련 영양소 */}
          <XStack
            justifyContent="space-between"
            paddingTop={14}
            paddingBottom={6}
          >
            {[
              { label: "나트륨", value: `${Math.round(total.sodium)}mg` },
              { label: "칼륨", value: `${Math.round(total.potassium)}mg` },
              { label: "인", value: `${Math.round(total.phosphorus)}mg` },
              {
                label: "단백질",
                value: `${Math.round(total.protein * 10) / 10}g`,
              },
            ].map(({ label, value }) => (
              <YStack key={label} alignItems="center" gap={2}>
                <Text style={styles.nutrientLabel}>{label}</Text>
                <Text style={styles.nutrientValue}>{value}</Text>
              </YStack>
            ))}
          </XStack>

          {/* 한줄평 */}
          {result.evaluation.comment && (
            <View style={styles.commentBox}>
              <Text style={styles.commentText} numberOfLines={2}>
                {result.evaluation.comment}
              </Text>
            </View>
          )}

          {/* 하단 브랜딩 */}
          <XStack
            alignItems="center"
            justifyContent="center"
            paddingTop={14}
            gap={6}
          >
            <Image
              source={require("@/assets/icon.png")}
              style={styles.footerIcon}
            />
            <Text style={styles.footerText}>신신당부 — 신장 건강 관리</Text>
          </XStack>
        </View>
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
    backgroundColor: "#FFFFFF",
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
    color: "#1A1A1A",
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
    color: "#1A1A1A",
    flexShrink: 1,
  },
  mealBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  calorieValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  calorieUnit: {
    fontSize: 16,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  barSegment: {
    alignItems: "center",
    justifyContent: "center",
  },
  barLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  nutrientLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  nutrientValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  commentBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  commentText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
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
    color: "#9CA3AF",
  },
})
