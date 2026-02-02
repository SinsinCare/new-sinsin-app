import { useState } from 'react'
import { YStack, XStack, Text, H2, ScrollView } from 'tamagui'
import { Link, router } from 'expo-router'
import { Button, TextField, GlassmorphicCard, ErrorMessage } from '../../src/shared/components'
import { useAuth } from '../../src/hooks'

export default function SignupScreen() {
  const { signUpWithEmail, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    try {
      setError('')
      await signUpWithEmail(email, password)
      router.replace('/(auth)/profile-setup')
    } catch (e: any) {
      setError(e.message || '회원가입에 실패했습니다.')
    }
  }

  return (
    <ScrollView flex={1} backgroundColor="$background">
      <YStack padding="$4" justifyContent="center" minHeight="100%">
        <GlassmorphicCard gap="$4">
          <YStack alignItems="center" gap="$2">
            <H2>회원가입</H2>
            <Text color="$colorSubtle">새 계정을 만들어보세요</Text>
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
            placeholder="6자 이상 입력하세요"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextField
            label="비밀번호 확인"
            placeholder="비밀번호를 다시 입력하세요"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Button fullWidth loading={isLoading} onPress={handleSignup}>
            회원가입
          </Button>

          <XStack justifyContent="center" gap="$2">
            <Text color="$colorSubtle">이미 계정이 있으신가요?</Text>
            <Link href="/(auth)/login" asChild>
              <Text color="$primary" fontWeight="600">
                로그인
              </Text>
            </Link>
          </XStack>
        </GlassmorphicCard>
      </YStack>
    </ScrollView>
  )
}
