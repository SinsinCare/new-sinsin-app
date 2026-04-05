import {
  Modal,
  ScrollView,
  Image,
  useColorScheme,
  Alert,
  ActionSheetIOS,
  Platform,
} from "react-native"
import { useState, useRef, useCallback } from "react"
import { router } from "expo-router"
import { YStack, XStack, Text, View } from "tamagui"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import ViewShot, { captureRef } from "react-native-view-shot"
import * as Sharing from "expo-sharing"
import Share, { Social } from "react-native-share"
import { tokens } from "@/src/theme/tokens"
import type {
  FoodAnalysisUpdateRequest,
  FoodAnalysisUpdateResult,
  FoodCameraAnalyzeResult,
} from "@/src/types"
import type { MealType } from "../types"
import { getRestrictionStyle } from "../utils/getRestrictionStyle"
import { MacroBar } from "./record/MacroBar"
import { Icon } from "@/src/shared/components/Icon"
import { FoodResultEdit } from "./FoodResultEdit"
import { FoodNutrientDonuts } from "./FoodNutrientDonuts"
import { ShareCard } from "./ShareCard"

interface FoodAnalysisResultProps {
  result: FoodCameraAnalyzeResult | null
  open: boolean
  onClose: () => void
  imageUri?: string
  mealType?: MealType
  onAddToRecord?: () => Promise<void> | void
  showAddButton?: boolean
  isUpdating?: boolean
  updateFoodAnalysis: (
    foodAnalysisResultId: number,
    body: FoodAnalysisUpdateRequest,
  ) => Promise<FoodAnalysisUpdateResult | undefined>
}

const MEAL_TYPE_ICON: Record<MealType, string> = {
  BREAKFAST: "sunny-outline",
  LUNCH: "partly-sunny-outline",
  DINNER: "moon-outline",
  SNACKS: "cafe-outline",
}

const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "아침",
  LUNCH: "점심",
  DINNER: "저녁",
  SNACKS: "간식",
}

export function FoodAnalysisResult({
  result,
  open,
  onClose,
  imageUri,
  mealType,
  onAddToRecord,
  showAddButton = true,
  isUpdating = false,
  updateFoodAnalysis,
}: FoodAnalysisResultProps) {
  const insets = useSafeAreaInsets()
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const isDarkMode = useColorScheme() === "dark"
  const shareCardRef = useRef<ViewShot>(null)
  const FACEBOOK_APP_ID = "1306082818293951"

  const handleShare = useCallback(async () => {
    if (!shareCardRef.current) return

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["인스타그램 스토리에 공유", "다른 앱으로 공유", "취소"],
          cancelButtonIndex: 2,
        },
        async (buttonIndex) => {
          try {
            if (buttonIndex === 0) {
              // base64로 캡처하여 Instagram Stories에 직접 공유
              const base64 = await captureRef(shareCardRef, {
                format: "png",
                quality: 1,
                result: "base64",
              })
              await Share.shareSingle({
                social: Social.InstagramStories,
                appId: FACEBOOK_APP_ID,
                stickerImage: `data:image/png;base64,${base64}`,
                backgroundBottomColor: "#FFFFFF",
                backgroundTopColor: "#FFFFFF",
              })
            } else if (buttonIndex === 1) {
              // 파일로 캡처하여 시스템 공유 시트
              const uri = await captureRef(shareCardRef, {
                format: "png",
                quality: 1,
                result: "tmpfile",
              })
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                  mimeType: "image/png",
                  UTI: "public.png",
                })
              }
            }
          } catch {
            Alert.alert(
              "공유 실패",
              "인스타그램이 설치되어 있는지 확인해주세요.",
            )
          }
        },
      )
    } else {
      // Android: Instagram Stories 시도 후 실패 시 일반 공유
      try {
        const base64 = await captureRef(shareCardRef, {
          format: "png",
          quality: 1,
          result: "base64",
        })
        await Share.shareSingle({
          social: Social.InstagramStories,
          appId: FACEBOOK_APP_ID,
          stickerImage: `data:image/png;base64,${base64}`,
          backgroundBottomColor: "#FFFFFF",
          backgroundTopColor: "#FFFFFF",
        })
      } catch {
        const uri = await captureRef(shareCardRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        })
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            UTI: "public.png",
          })
        }
      }
    }
  }, [])

  if (!result) return null

  const handleEditPress = () => {
    setIsEdit(true)
  }

  const handleClosePress = () => {
    if (showAddButton) {
      setShowExitConfirm(true)
    } else {
      onClose()
    }
  }

  const servingsLabel = `${result.servings}인분`

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClosePress}
    >
      <YStack flex={1} backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}>
        {/* Header */}
        <XStack
          alignItems="center"
          paddingHorizontal={12}
          paddingTop={30}
          paddingBottom={10}
          backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}
        >
          <XStack
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            onPress={handleShare}
            pressStyle={{ opacity: 0.7 }}
          >
            <Ionicons
              name="share-outline"
              size={22}
              color={
                isDarkMode ? tokens.color.textDark.val : tokens.color.grey3.val
              }
            />
          </XStack>
          <Text
            fontSize="$5"
            fontWeight="600"
            color={isDarkMode ? "$textDark" : "$color"}
            textAlign="center"
            flex={1}
          >
            식단 분석
          </Text>
          <XStack
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            onPress={handleClosePress}
            pressStyle={{ opacity: 0.7 }}
          >
            <Ionicons
              name="close"
              size={22}
              color={
                isDarkMode ? tokens.color.textDark.val : tokens.color.grey3.val
              }
            />
          </XStack>
        </XStack>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 4,
            paddingBottom: insets.bottom + 100,
          }}
        >
          {/* 음식 제목 + 식사 타입 */}
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$3"
            alignItems="flex-start"
            gap="$2"
          >
            <Text
              fontSize={22}
              fontWeight="700"
              color={isDarkMode ? "$textDark" : "$color"}
              flexShrink={1}
              flex={1}
            >
              {result.title}{" "}
              <Text fontSize="$4" color="$colorSubtle" fontWeight="700">
                {servingsLabel}
              </Text>
            </Text>
            {mealType && (
              <XStack
                alignItems="center"
                gap="$1"
                backgroundColor={
                  isDarkMode ? "$cardBgDark" : "$backgroundFocus"
                }
                paddingHorizontal="$3"
                paddingVertical={6}
                borderRadius="$8"
                flexShrink={0}
              >
                <Ionicons
                  name={
                    MEAL_TYPE_ICON[mealType] as keyof typeof Ionicons.glyphMap
                  }
                  size={15}
                  color={
                    isDarkMode
                      ? tokens.color.textDark.val
                      : tokens.color.black.val
                  }
                />
                <Text
                  fontSize={14}
                  color={isDarkMode ? "$textDark" : "$color"}
                  fontWeight="500"
                >
                  {MEAL_LABEL[mealType]}
                </Text>
              </XStack>
            )}
          </XStack>

          {/* 음식 이미지 */}
          {imageUri && (
            <View marginHorizontal="$4" borderRadius={16} overflow="hidden">
              <Image
                source={{ uri: imageUri }}
                style={{ width: "100%", height: 220, resizeMode: "cover" }}
              />
              <XStack
                position="absolute"
                bottom={10}
                right={10}
                alignItems="center"
                backgroundColor="$offWhite"
                borderRadius={8}
                paddingHorizontal={9}
                paddingVertical={7}
                gap={3}
                opacity={0.9}
                pressStyle={{ opacity: 0.5 }}
                onPress={handleEditPress}
              >
                <Icon name="edit" size={18} />
                <Text fontSize={12} fontWeight="600" color="$color.grey4">
                  식단 수정
                </Text>
              </XStack>
            </View>
          )}

          {/* 한줄평 */}
          <YStack
            marginHorizontal="$4"
            marginTop="$4"
            backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
            borderRadius="$4"
            padding="$4"
            gap="$2"
          >
            <Text fontSize="$3" color="$colorSubtle" fontWeight="600">
              한줄평
            </Text>
            <Text
              fontSize="$4"
              color={isDarkMode ? "$textDark" : "$color"}
              lineHeight={22}
              fontWeight="600"
            >
              {result.evaluation.comment}
            </Text>
          </YStack>

          {/* 총 열량 */}
          <YStack
            marginHorizontal="$4"
            marginTop="$3"
            backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
            borderRadius="$4"
            padding="$4"
          >
            <Text
              fontSize="$4"
              fontWeight="600"
              color={isDarkMode ? "$textDark" : "$color"}
            >
              총 열량
            </Text>
            <XStack alignItems="baseline" gap="$1">
              <Text
                fontSize={30}
                fontWeight="600"
                color={isDarkMode ? "$textDark" : "$color"}
              >
                {Math.round(result.total.calories)}
              </Text>
              <Text fontSize="$5" color="$colorSubtle" fontWeight="500">
                Kcal
              </Text>
            </XStack>
            <View height="$2" />
            <MacroBar
              carbs={result.total.carbohydrates}
              protein={result.total.protein}
              fat={result.total.fat}
            />
          </YStack>

          {/* 식단 세부 분석 */}
          <YStack marginHorizontal="$4" marginTop="$5" gap="$3">
            <Text
              fontSize={22}
              fontWeight="700"
              color={isDarkMode ? "$textDark" : "$color"}
            >
              식단 세부 분석
            </Text>
            <XStack
              alignItems="flex-start"
              gap="$2"
              paddingHorizontal={2}
              marginTop={-4}
            >
              <Icon name="info" size={16} color={tokens.color.grey6.val} />
              <Text fontSize="$3" color="$colorSubtle" flex={1} lineHeight={20}>
                원 그래프의 %는 하루 권장 섭취 한도(나트륨·칼륨·인 1일 기준,
                단백질은 체중 1kg당 0.8g) 대비 이 음식의 비율이에요.
              </Text>
            </XStack>
            {result.foods.map((food, i) => {
              const restriction = getRestrictionStyle(food.restrictionLevel)
              return (
                <YStack
                  key={i}
                  backgroundColor={
                    isDarkMode ? "$cardBgDark" : "$cardBackground"
                  }
                  borderRadius="$4"
                  padding="$4"
                  paddingVertical="$5"
                  gap="$3"
                >
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    paddingBottom={8}
                    gap="$2"
                  >
                    <XStack
                      alignItems="baseline"
                      gap="$1"
                      flex={1}
                      flexShrink={1}
                    >
                      <Text
                        fontSize="$4"
                        fontWeight="600"
                        color={isDarkMode ? "$textDark" : "$color"}
                        numberOfLines={1}
                        flexShrink={1}
                      >
                        {food.name}
                      </Text>
                      <XStack paddingHorizontal={1}>
                        <Text fontSize="$3" color="$colorSubtle" flexShrink={0}>
                          {food.servingSizeValue}
                        </Text>
                        <Text fontSize="$3" color="$colorSubtle" flexShrink={0}>
                          {food.servingSizeUnit}
                        </Text>
                      </XStack>
                    </XStack>
                    <View
                      paddingHorizontal={8}
                      paddingVertical={4}
                      borderRadius={8}
                      backgroundColor={restriction.bg}
                      flexShrink={0}
                    >
                      <Text
                        fontSize="$3"
                        fontWeight="500"
                        color={restriction.color}
                      >
                        {restriction.label}
                      </Text>
                    </View>
                  </XStack>

                  <FoodNutrientDonuts food={food} />
                </YStack>
              )
            })}
          </YStack>

          {/* 더 건강하게 식사하는 법 */}
          {result.evaluation.cautionFoods.length > 0 && (
            <YStack marginHorizontal="$4" marginTop="$5" gap="$3">
              <Text
                fontSize={22}
                fontWeight="700"
                color={isDarkMode ? "$textDark" : "$color"}
              >
                더 건강하게 식사하는 법
              </Text>
              <YStack
                backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
                borderRadius="$4"
                padding="$4"
                gap="$6"
              >
                {result.evaluation.cautionFoods.map((item, i) => (
                  <YStack key={i} gap="$2">
                    <Text fontSize="$3" fontWeight="700" color="$colorSubtle">
                      주의해야 할 음식 {i + 1}: {item.food}
                    </Text>
                    <Text
                      fontSize={15}
                      fontWeight="500"
                      lineHeight={22}
                      color={isDarkMode ? "$textDark" : "$color"}
                    >
                      {item.reason}
                    </Text>
                  </YStack>
                ))}
              </YStack>
            </YStack>
          )}

          {/* 의료 정보 출처 안내 */}
          <YStack
            marginHorizontal={15}
            marginTop={16}
            paddingVertical={12}
            paddingHorizontal={16}
            backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
            borderRadius={12}
            gap={4}
          >
            <Text fontSize={12} color="$colorSubtle" lineHeight={18}>
              영양소 분석 기준: 한국영양학회 식품성분데이터베이스 · 대한신장학회
              CKD 영양 권고안 · 한국보건산업진흥원
            </Text>
            <Text
              fontSize={12}
              color={isDarkMode ? "#5BC5AB" : "#0D896A"}
              fontWeight="500"
              onPress={() => {
                onClose()
                router.push("/(settings)/medical-reference")
              }}
            >
              📚 참고 문헌 전체 보기 →
            </Text>
          </YStack>

          {/* 식사에 대해 질문하기 */}
          <XStack
            alignItems="center"
            justifyContent="center"
            gap={6}
            marginTop={12}
            paddingVertical={17}
            marginHorizontal={15}
            backgroundColor={isDarkMode ? "$cardBgDark" : "$cardBackground"}
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
            onPress={() => {
              onClose()
              router.push("/(tabs)/consult")
            }}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={
                isDarkMode ? tokens.color.appBg.val : tokens.color.grey3.val
              }
            />
            <Text
              fontSize={16}
              fontWeight="500"
              color={isDarkMode ? "$textDark" : "$color"}
            >
              식사에 대해 질문하기
            </Text>
          </XStack>
        </ScrollView>

        {/* 하단 고정 버튼 */}
        {showAddButton && (
          <YStack
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            backgroundColor={isDarkMode ? "$appBgDark" : "$appBg"}
            paddingHorizontal={16}
            paddingTop={12}
            paddingBottom={insets.bottom + 12}
          >
            <YStack
              backgroundColor={tokens.color.primary7.val}
              borderRadius={30}
              height={54}
              alignItems="center"
              justifyContent="center"
              onPress={async () => {
                await onAddToRecord?.()
                onClose()
              }}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text color="white" fontSize={16} fontWeight="700">
                기록에 추가하기
              </Text>
            </YStack>
          </YStack>
        )}
      </YStack>

      {/* 공유 카드 (offscreen) */}
      <ShareCard
        ref={shareCardRef}
        result={result}
        imageUri={imageUri}
        mealType={mealType}
      />

      {/* 나가기 확인 오버레이 */}
      {showExitConfirm && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.3)"
          justifyContent="center"
          alignItems="center"
        >
          <YStack
            backgroundColor={tokens.color.offWhite.val}
            borderRadius={15}
            overflow="hidden"
          >
            <YStack
              paddingHorizontal="$10"
              paddingTop="$8"
              paddingBottom="$6"
              gap="$2"
            >
              <Text fontSize={16} fontWeight="600" textAlign="center">
                아직 식단을 기록하지 않았어요.
              </Text>
              <Text
                fontSize={14}
                color="$colorSubtle"
                textAlign="center"
                lineHeight={22}
              >
                식단을 기록에 추가해 주세요.
              </Text>
            </YStack>

            <View height={1} backgroundColor="#E5E5E5" />

            <XStack>
              <YStack
                flex={1}
                alignItems="center"
                paddingVertical="$4"
                onPress={() => {
                  setShowExitConfirm(false)
                  onClose()
                }}
                pressStyle={{ opacity: 0.6 }}
              >
                <Text
                  color={tokens.color.primary9.val}
                  fontSize={15}
                  fontWeight="500"
                >
                  나가기
                </Text>
              </YStack>

              <View width={1} backgroundColor="#E5E5E5" />

              <YStack
                flex={1}
                alignItems="center"
                paddingVertical="$4"
                onPress={() => setShowExitConfirm(false)}
                pressStyle={{ opacity: 0.8 }}
              >
                <Text fontSize={15} fontWeight="500">
                  돌아가기
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </YStack>
      )}
      {isEdit && (
        <FoodResultEdit
          result={result}
          imageUri={imageUri}
          onClose={() => setIsEdit(false)}
          mealType={mealType ?? null}
          isUpdating={isUpdating}
          updateFoodAnalysis={updateFoodAnalysis}
        />
      )}
    </Modal>
  )
}
