import { useState } from 'react'
import { YStack, XStack, Text, H2, H3, ScrollView, Image } from 'tamagui'
import * as ImagePicker from 'expo-image-picker'
import { Button, GlassmorphicCard, LoadingScreen, ErrorMessage } from '../../src/shared/components'
import { aiService } from '../../src/services'
import { useAuthStore } from '../../src/stores'
import { Camera, Image as ImageLucide } from '@tamagui/lucide-icons'
import type { FoodAnalysisResponse } from '../../src/types'

export default function FoodScreen() {
  const { user } = useAuthStore()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResponse | null>(null)
  const [error, setError] = useState('')

  const pickImage = async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permissionResult.granted) {
      setError('권한이 필요합니다.')
      return
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setImageUri(asset.uri)
      setAnalysisResult(null)

      if (asset.base64) {
        await analyzeImage(asset.base64)
      }
    }
  }

  const analyzeImage = async (base64: string) => {
    if (!user) return

    setIsAnalyzing(true)
    setError('')

    try {
      const result = await aiService.analyzeFoodImage({
        imageBase64: base64,
        userId: user.uid,
      })
      setAnalysisResult(result)
    } catch (e: any) {
      setError(e.message || '분석에 실패했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$4">
        <YStack gap="$2">
          <H2>음식 인식</H2>
          <Text color="$colorSubtle">사진을 찍거나 선택하면 영양 정보를 분석합니다</Text>
        </YStack>

        {/* 이미지 선택 영역 */}
        <GlassmorphicCard alignItems="center" gap="$4">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              width="100%"
              height={250}
              borderRadius="$3"
              resizeMode="cover"
            />
          ) : (
            <YStack
              width="100%"
              height={250}
              backgroundColor="$backgroundPress"
              borderRadius="$3"
              justifyContent="center"
              alignItems="center"
            >
              <ImageLucide size={48} color="$colorSubtle" />
              <Text color="$colorSubtle" marginTop="$2">사진을 선택해주세요</Text>
            </YStack>
          )}

          <XStack gap="$3" width="100%">
            <Button flex={1} variant="primary" onPress={() => pickImage(true)}>
              <XStack gap="$2" alignItems="center">
                <Camera size={20} color="white" />
                <Text color="white">촬영</Text>
              </XStack>
            </Button>
            <Button flex={1} variant="outline" onPress={() => pickImage(false)}>
              <XStack gap="$2" alignItems="center">
                <ImageLucide size={20} color="$primary" />
                <Text color="$primary">갤러리</Text>
              </XStack>
            </Button>
          </XStack>
        </GlassmorphicCard>

        {/* 로딩 상태 */}
        {isAnalyzing && (
          <GlassmorphicCard>
            <LoadingScreen message="음식을 분석하고 있습니다..." />
          </GlassmorphicCard>
        )}

        {/* 에러 */}
        {error && <ErrorMessage message={error} onRetry={() => setError('')} />}

        {/* 분석 결과 */}
        {analysisResult && (
          <GlassmorphicCard gap="$4">
            <H3>분석 결과</H3>

            {/* 인식된 음식 목록 */}
            <YStack gap="$2">
              {analysisResult.foods.map((food, index) => (
                <XStack
                  key={index}
                  justifyContent="space-between"
                  padding="$2"
                  backgroundColor="$backgroundHover"
                  borderRadius="$2"
                >
                  <Text fontWeight="600">{food.name}</Text>
                  <Text color="$colorSubtle">{food.portion}</Text>
                </XStack>
              ))}
            </YStack>

            {/* 총 영양 정보 */}
            <YStack gap="$2">
              <Text fontWeight="600">총 영양 정보</Text>
              <NutritionRow label="칼로리" value={analysisResult.totalNutrition.calories} unit="kcal" />
              <NutritionRow label="단백질" value={analysisResult.totalNutrition.protein} unit="g" />
              <NutritionRow label="나트륨" value={analysisResult.totalNutrition.sodium} unit="mg" warn={analysisResult.totalNutrition.sodium > 600} />
              <NutritionRow label="칼륨" value={analysisResult.totalNutrition.potassium} unit="mg" warn={analysisResult.totalNutrition.potassium > 600} />
              <NutritionRow label="인" value={analysisResult.totalNutrition.phosphorus} unit="mg" warn={analysisResult.totalNutrition.phosphorus > 300} />
            </YStack>

            {/* 신장 평가 */}
            <YStack gap="$2">
              <XStack alignItems="center" gap="$2">
                <Text fontWeight="600">신장 건강 평가:</Text>
                <SafetyBadge safety={analysisResult.kidneyAssessment.overallSafety} />
              </XStack>

              {analysisResult.kidneyAssessment.warnings.length > 0 && (
                <YStack gap="$1">
                  {analysisResult.kidneyAssessment.warnings.map((warning, i) => (
                    <Text key={i} color="$warning" fontSize={14}>⚠️ {warning}</Text>
                  ))}
                </YStack>
              )}

              {analysisResult.kidneyAssessment.recommendations.length > 0 && (
                <YStack gap="$1">
                  {analysisResult.kidneyAssessment.recommendations.map((rec, i) => (
                    <Text key={i} color="$success" fontSize={14}>💡 {rec}</Text>
                  ))}
                </YStack>
              )}
            </YStack>

            <Button fullWidth onPress={() => console.log('Save food record')}>
              식단에 추가하기
            </Button>
          </GlassmorphicCard>
        )}
      </YStack>
    </ScrollView>
  )
}

function NutritionRow({ label, value, unit, warn = false }: {
  label: string
  value: number
  unit: string
  warn?: boolean
}) {
  return (
    <XStack justifyContent="space-between">
      <Text>{label}</Text>
      <Text color={warn ? '$warning' : '$color'} fontWeight={warn ? '600' : '400'}>
        {value.toFixed(1)} {unit}
      </Text>
    </XStack>
  )
}

function SafetyBadge({ safety }: { safety: 'safe' | 'caution' | 'warning' }) {
  const config = {
    safe: { label: '안전', color: '$success' },
    caution: { label: '주의', color: '$warning' },
    warning: { label: '경고', color: '$danger' },
  }

  return (
    <Text
      backgroundColor={config[safety].color}
      color="white"
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$2"
      fontSize={12}
      fontWeight="600"
    >
      {config[safety].label}
    </Text>
  )
}
