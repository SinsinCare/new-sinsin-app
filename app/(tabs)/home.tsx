import { YStack, XStack, Text, H1, H3, ScrollView } from 'tamagui'
import { GlassmorphicCard } from '../../src/shared/components'
import { useUserStore } from '../../src/stores'
import { Activity, Droplets, Moon, TrendingUp } from '@tamagui/lucide-icons'

export default function HomeScreen() {
  const { profile } = useUserStore()

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$4">
        {/* 인사말 */}
        <YStack gap="$2">
          <H1>안녕하세요, {profile?.displayName || '사용자'}님</H1>
          <Text color="$colorSubtle">오늘의 건강 상태를 확인해보세요</Text>
        </YStack>

        {/* 건강 요약 카드 */}
        <GlassmorphicCard variant="elevated">
          <H3 marginBottom="$3">오늘의 건강</H3>
          <XStack flexWrap="wrap" gap="$3">
            <HealthMetricCard
              icon={<Activity color="$primary" size={24} />}
              label="걸음 수"
              value="0"
              unit="걸음"
            />
            <HealthMetricCard
              icon={<Droplets color="$primary" size={24} />}
              label="수분 섭취"
              value="0"
              unit="ml"
            />
            <HealthMetricCard
              icon={<Moon color="$primary" size={24} />}
              label="수면"
              value="0"
              unit="시간"
            />
            <HealthMetricCard
              icon={<TrendingUp color="$success" size={24} />}
              label="eGFR"
              value={profile?.ckdStage ? `${profile.ckdStage}단계` : '-'}
              unit=""
            />
          </XStack>
        </GlassmorphicCard>

        {/* 영양 섭취 요약 */}
        <GlassmorphicCard>
          <H3 marginBottom="$3">오늘의 영양 섭취</H3>
          <YStack gap="$2">
            <NutrientBar label="나트륨" current={0} max={2000} unit="mg" color="$warning" />
            <NutrientBar label="칼륨" current={0} max={2000} unit="mg" color="$success" />
            <NutrientBar label="인" current={0} max={1000} unit="mg" color="$primary" />
          </YStack>
        </GlassmorphicCard>

        {/* 빠른 액션 */}
        <GlassmorphicCard>
          <H3 marginBottom="$3">빠른 액션</H3>
          <XStack gap="$3" flexWrap="wrap">
            <QuickActionButton label="음식 기록" icon="🍽️" />
            <QuickActionButton label="AI 상담" icon="💬" />
            <QuickActionButton label="레시피" icon="📖" />
            <QuickActionButton label="식당 찾기" icon="🗺️" />
          </XStack>
        </GlassmorphicCard>
      </YStack>
    </ScrollView>
  )
}

// 하위 컴포넌트들
function HealthMetricCard({ icon, label, value, unit }: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
}) {
  return (
    <YStack
      flex={1}
      minWidth={140}
      backgroundColor="$backgroundHover"
      borderRadius="$3"
      padding="$3"
      gap="$2"
    >
      {icon}
      <Text fontSize={12} color="$colorSubtle">{label}</Text>
      <XStack alignItems="baseline" gap="$1">
        <Text fontSize={24} fontWeight="700">{value}</Text>
        <Text fontSize={12} color="$colorSubtle">{unit}</Text>
      </XStack>
    </YStack>
  )
}

function NutrientBar({ label, current, max, unit, color }: {
  label: string
  current: number
  max: number
  unit: string
  color: string
}) {
  const percentage = Math.min((current / max) * 100, 100)

  return (
    <YStack gap="$1">
      <XStack justifyContent="space-between">
        <Text fontSize={14}>{label}</Text>
        <Text fontSize={14} color="$colorSubtle">
          {current} / {max} {unit}
        </Text>
      </XStack>
      <YStack backgroundColor="$backgroundPress" borderRadius="$2" height={8}>
        <YStack
          backgroundColor={color}
          borderRadius="$2"
          height={8}
          width={`${percentage}%`}
        />
      </YStack>
    </YStack>
  )
}

function QuickActionButton({ label, icon }: { label: string; icon: string }) {
  return (
    <YStack
      flex={1}
      minWidth={70}
      alignItems="center"
      backgroundColor="$backgroundHover"
      borderRadius="$3"
      padding="$3"
      gap="$2"
      pressStyle={{ opacity: 0.7 }}
    >
      <Text fontSize={28}>{icon}</Text>
      <Text fontSize={12}>{label}</Text>
    </YStack>
  )
}
