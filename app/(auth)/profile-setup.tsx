import { useState } from 'react'
import { YStack, XStack, Text, H2, ScrollView, RadioGroup, Label } from 'tamagui'
import { router } from 'expo-router'
import { Button, TextField, GlassmorphicCard, ErrorMessage } from '../../src/shared/components'
import { useAuth } from '../../src/hooks'
import { useUserStore } from '../../src/stores'
import { firestoreService } from '../../src/services/firestoreService'
import type { UserProfile } from '../../src/types'

export default function ProfileSetupScreen() {
  const { user } = useAuth()
  const { setProfile } = useUserStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [ckdStage, setCkdStage] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [onDialysis, setOnDialysis] = useState(false)

  const handleSaveProfile = async () => {
    if (!user) return

    if (!displayName || !birthDate || !height || !weight) {
      setError('모든 필수 정보를 입력해주세요.')
      return
    }

    setIsLoading(true)
    try {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName,
        birthDate,
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        ckdStage,
        onDialysis,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await firestoreService.setUserProfile(profile)
      setProfile(profile)
      router.replace('/(tabs)/home')
    } catch (e: any) {
      setError(e.message || '프로필 저장에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$4">
        <GlassmorphicCard gap="$4">
          <YStack alignItems="center" gap="$2">
            <H2>프로필 설정</H2>
            <Text color="$colorSubtle">건강 관리를 위한 정보를 입력해주세요</Text>
          </YStack>

          {error && <ErrorMessage message={error} />}

          <TextField
            label="이름"
            placeholder="홍길동"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <TextField
            label="생년월일"
            placeholder="1990-01-01"
            value={birthDate}
            onChangeText={setBirthDate}
          />

          <YStack gap="$2">
            <Label>성별</Label>
            <RadioGroup value={gender} onValueChange={(v) => setGender(v as 'male' | 'female')}>
              <XStack gap="$4">
                <XStack alignItems="center" gap="$2">
                  <RadioGroup.Item value="male" id="male">
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <Label htmlFor="male">남성</Label>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <RadioGroup.Item value="female" id="female">
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <Label htmlFor="female">여성</Label>
                </XStack>
              </XStack>
            </RadioGroup>
          </YStack>

          <XStack gap="$4">
            <YStack flex={1}>
              <TextField
                label="키 (cm)"
                placeholder="170"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </YStack>
            <YStack flex={1}>
              <TextField
                label="체중 (kg)"
                placeholder="70"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            </YStack>
          </XStack>

          <YStack gap="$2">
            <Label>만성신장병 단계</Label>
            <RadioGroup
              value={String(ckdStage)}
              onValueChange={(v) => setCkdStage(Number(v) as 1 | 2 | 3 | 4 | 5)}
            >
              <XStack flexWrap="wrap" gap="$3">
                {[1, 2, 3, 4, 5].map((stage) => (
                  <XStack key={stage} alignItems="center" gap="$2">
                    <RadioGroup.Item value={String(stage)} id={`stage-${stage}`}>
                      <RadioGroup.Indicator />
                    </RadioGroup.Item>
                    <Label htmlFor={`stage-${stage}`}>{stage}단계</Label>
                  </XStack>
                ))}
              </XStack>
            </RadioGroup>
          </YStack>

          <Button fullWidth loading={isLoading} onPress={handleSaveProfile}>
            저장하고 시작하기
          </Button>
        </GlassmorphicCard>
      </YStack>
    </ScrollView>
  )
}
