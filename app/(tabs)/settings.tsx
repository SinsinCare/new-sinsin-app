import { YStack, XStack, Text, ScrollView, Separator } from 'tamagui'
import { router } from 'expo-router'
import { GlassmorphicCard, Button } from '../../src/shared/components'
import { useAuth } from '../../src/hooks'
import { useUserStore } from '../../src/stores'
import { User, Bell, Shield, Info, LogOut, ChevronRight } from '@tamagui/lucide-icons'

export default function SettingsScreen() {
  const { signOut } = useAuth()
  const { profile } = useUserStore()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" gap="$4">
        {/* 프로필 섹션 */}
        <GlassmorphicCard>
          <XStack gap="$4" alignItems="center">
            <YStack
              width={60}
              height={60}
              backgroundColor="$primary"
              borderRadius={30}
              justifyContent="center"
              alignItems="center"
            >
              <Text color="white" fontSize={24} fontWeight="700">
                {profile?.displayName?.charAt(0) || 'U'}
              </Text>
            </YStack>
            <YStack flex={1}>
              <Text fontSize={18} fontWeight="600">{profile?.displayName || '사용자'}</Text>
              <Text color="$colorSubtle">{profile?.email}</Text>
              <Text color="$colorSubtle" fontSize={12}>
                CKD {profile?.ckdStage}단계 {profile?.onDialysis && '(투석 중)'}
              </Text>
            </YStack>
          </XStack>
        </GlassmorphicCard>

        {/* 설정 메뉴 */}
        <GlassmorphicCard gap="$1" padding="$0">
          <SettingsMenuItem
            icon={<User size={20} color="$primary" />}
            label="프로필 관리"
            onPress={() => console.log('Profile')}
          />
          <Separator />
          <SettingsMenuItem
            icon={<Bell size={20} color="$primary" />}
            label="알림 설정"
            onPress={() => console.log('Notifications')}
          />
          <Separator />
          <SettingsMenuItem
            icon={<Shield size={20} color="$primary" />}
            label="개인정보 관리"
            onPress={() => console.log('Privacy')}
          />
          <Separator />
          <SettingsMenuItem
            icon={<Info size={20} color="$primary" />}
            label="앱 정보"
            onPress={() => console.log('App info')}
          />
        </GlassmorphicCard>

        {/* 로그아웃 */}
        <Button variant="danger" fullWidth onPress={handleSignOut}>
          <XStack gap="$2" alignItems="center">
            <LogOut size={20} color="white" />
            <Text color="white">로그아웃</Text>
          </XStack>
        </Button>

        {/* 버전 정보 */}
        <Text textAlign="center" color="$colorSubtle" fontSize={12}>
          신신당부 v1.0.0
        </Text>
      </YStack>
    </ScrollView>
  )
}

function SettingsMenuItem({ icon, label, onPress }: {
  icon: React.ReactNode
  label: string
  onPress: () => void
}) {
  return (
    <XStack
      padding="$4"
      alignItems="center"
      justifyContent="space-between"
      onPress={onPress}
      pressStyle={{ backgroundColor: '$backgroundHover' }}
    >
      <XStack gap="$3" alignItems="center">
        {icon}
        <Text>{label}</Text>
      </XStack>
      <ChevronRight size={20} color="$colorSubtle" />
    </XStack>
  )
}
