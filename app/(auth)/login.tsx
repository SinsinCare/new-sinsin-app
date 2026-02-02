import { useState } from 'react'
import { YStack, XStack, Text, H2 } from 'tamagui'
import { Link, router } from 'expo-router'
import { Button, TextField, GlassmorphicCard, ErrorMessage } from '../../src/shared/components'
import { useAuth } from '../../src/hooks'

export default function LoginScreen() {
  const { signInWithEmail, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    try {
      setError('')
      await signInWithEmail(email, password)
      router.replace('/(tabs)/home')
    } catch (e: any) {
      setError(e.message || '로그인에 실패했습니다.')
    }
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding="$4" justifyContent="center">
      <GlassmorphicCard gap="$4">
        <YStack alignItems="center" gap="$2">
          <H2>신신당부</H2>
          <Text color="$colorSubtle">만성신장병 환자를 위한 건강관리</Text>
        </YStack>

        {error && <ErrorMessage message={error} />}

        <TextField
          label="이메일"
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextField
          label="비밀번호"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button fullWidth loading={isLoading} onPress={handleLogin}>
          로그인
        </Button>

        <XStack justifyContent="center" gap="$2">
          <Text color="$colorSubtle">계정이 없으신가요?</Text>
          <Link href="/(auth)/signup" asChild>
            <Text color="$primary" fontWeight="600">
              회원가입
            </Text>
          </Link>
        </XStack>
      </GlassmorphicCard>
    </YStack>
  )
}
