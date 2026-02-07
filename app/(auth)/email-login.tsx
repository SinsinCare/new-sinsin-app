import { useState, useRef } from 'react'
import { Pressable, TextInput } from 'react-native'
import { YStack, XStack, Text, Input, Separator } from 'tamagui'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/hooks'
import { ErrorMessage } from '../../src/shared/components'

export default function EmailLoginScreen() {
  const { signInWithEmail, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const insets = useSafeAreaInsets()
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)

  const isFormValid = email.length > 0 && password.length > 0

  const handleLogin = async () => {
    if (!isFormValid) return

    try {
      setError('')
      await signInWithEmail(email, password)
      router.replace('/(tabs)/home')
    } catch (e: any) {
      setError(e.message || '로그인에 실패했습니다.')
    }
  }

  return (
    <YStack flex={1} backgroundColor="white" paddingTop={insets.top}>
      {/* Top Navigation */}
      <YStack height={56} justifyContent="center">
        <Pressable
          onPress={() => router.back()}
          style={{ position: 'absolute', left: 9, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color="#17191C" />
        </Pressable>
      </YStack>

      {/* Content */}
      <YStack paddingHorizontal={20} gap={54}>
        {/* Title + Fields */}
        <YStack gap={48}>
          {/* Title */}
          <Text
            fontSize={22}
            fontWeight="600"
            color="#17191C"
            letterSpacing={-0.44}
            lineHeight={26.4}
          >
            이메일로 로그인하기
          </Text>

          {/* Input Fields */}
          <YStack gap={36}>
            {error && <ErrorMessage message={error} />}

            {/* 아이디 */}
            <YStack>
              <Text
                fontSize={13}
                fontWeight="500"
                color={emailFocused ? '#5464F2' : '#17191C'}
                letterSpacing={-0.3}
                lineHeight={18.2}
                paddingBottom={10}
              >
                아이디
              </Text>
              <XStack
                backgroundColor="white"
                borderWidth={1}
                borderColor={emailFocused ? '#5464F2' : 'rgba(218,223,230,0.6)'}
                borderRadius={8}
                height={52}
                alignItems="center"
                paddingLeft={16}
                paddingRight={email.length > 0 && emailFocused ? 8 : 16}
              >
                <Input
                  ref={emailRef as any}
                  flex={1}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="이메일 주소를 입력해주세요"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  backgroundColor="transparent"
                  borderWidth={0}
                  height={50}
                  paddingHorizontal={0}
                  fontSize={16}
                  color="#17191C"
                  letterSpacing={-0.3}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
                {email.length > 0 && emailFocused && (
                  <Pressable
                    onPress={() => {
                      setEmail('')
                      emailRef.current?.focus()
                    }}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#787C83" />
                  </Pressable>
                )}
              </XStack>
            </YStack>

            {/* 비밀번호 */}
            <YStack>
              <Text
                fontSize={13}
                fontWeight="500"
                color={passwordFocused ? '#5464F2' : '#17191C'}
                letterSpacing={-0.3}
                lineHeight={18.2}
                paddingBottom={10}
              >
                비밀번호
              </Text>
              <XStack
                backgroundColor="white"
                borderWidth={1}
                borderColor={passwordFocused ? '#5464F2' : 'rgba(218,223,230,0.6)'}
                borderRadius={8}
                height={52}
                alignItems="center"
                paddingLeft={16}
                paddingRight={password.length > 0 && passwordFocused ? 8 : 16}
              >
                <Input
                  ref={passwordRef as any}
                  flex={1}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호를 입력해주세요"
                  secureTextEntry
                  backgroundColor="transparent"
                  borderWidth={0}
                  height={50}
                  paddingHorizontal={0}
                  fontSize={16}
                  color="#17191C"
                  letterSpacing={-0.3}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                {password.length > 0 && passwordFocused && (
                  <Pressable
                    onPress={() => {
                      setPassword('')
                      passwordRef.current?.focus()
                    }}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#787C83" />
                  </Pressable>
                )}
              </XStack>
            </YStack>
          </YStack>
        </YStack>

        {/* Login Button */}
        <YStack paddingBottom={32}>
          <Pressable onPress={handleLogin} disabled={!isFormValid || isLoading}>
            <YStack
              backgroundColor={isFormValid ? '#5464F2' : '#5464F247'}
              paddingVertical={16}
              paddingHorizontal={24}
              borderRadius={8}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                color='white'
                fontSize={16}
                fontWeight="500"
                letterSpacing={-0.3}
                lineHeight={20}
              >
                로그인
              </Text>
            </YStack>
          </Pressable>
        </YStack>
      </YStack>

      {/* Footer */}
      <YStack alignItems="center" paddingVertical={20} gap={8}>
        <Text
          fontSize={13}
          fontWeight="500"
          color="#3F444F"
          letterSpacing={-0.26}
        >
          가입정보를 잊으셨나요?
        </Text>
        <XStack alignItems="center" justifyContent="center" gap={16}>
          <Pressable>
            <Text fontSize={13} color="#007BD9" letterSpacing={-0.26}>
              아이디찾기
            </Text>
          </Pressable>
          <Separator vertical borderColor="#3F444F" height={14} />
          <Pressable>
            <Text fontSize={13} color="#007BD9" letterSpacing={-0.26}>
              비밀번호 찾기
            </Text>
          </Pressable>
        </XStack>
      </YStack>
    </YStack>
  )
}
