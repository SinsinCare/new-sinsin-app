import { useState, useRef } from 'react'
import { YStack, XStack, Text, ScrollView, Input } from 'tamagui'
import { KeyboardAvoidingView, Platform, FlatList } from 'react-native'
import { Button, GlassmorphicCard } from '../../src/shared/components'
import { aiService } from '../../src/services'
import { useAuthStore, useUserStore } from '../../src/stores'
import { Send } from '@tamagui/lucide-icons'
import type { ChatCategory } from '../../src/types'

const CATEGORIES: { id: ChatCategory; label: string; icon: string }[] = [
  { id: 'diet', label: '식이요법', icon: '🥗' },
  { id: 'medicine', label: '약물', icon: '💊' },
  { id: 'dialysis', label: '투석', icon: '🏥' },
  { id: 'checkup', label: '검진', icon: '🩺' },
  { id: 'transplant', label: '이식', icon: '❤️' },
  { id: 'welfare', label: '복지', icon: '🏠' },
]

const SUGGESTED_PROMPTS: Record<ChatCategory, string[]> = {
  diet: ['신장에 좋은 음식은?', '나트륨을 줄이는 방법은?', '단백질 섭취량은?'],
  medicine: ['약 복용 시 주의사항은?', '부작용이 있으면?', '약 상호작용은?'],
  dialysis: ['투석 전 준비사항은?', '투석 후 관리는?', '가정 투석이 가능한가요?'],
  checkup: ['정기 검진 주기는?', '검사 결과 해석은?', '어떤 검사가 필요한가요?'],
  transplant: ['이식 대기 과정은?', '이식 후 관리는?', '생체 이식이란?'],
  welfare: ['장애등급 신청은?', '의료비 지원은?', '복지 혜택은?'],
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function ConsultationScreen() {
  const { user } = useAuthStore()
  const { profile } = useUserStore()
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory>('diet')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollViewRef = useRef<FlatList>(null)

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await aiService.chat({
        message: text,
        userId: user.uid,
        healthContext: profile ? {
          ckdStage: profile.ckdStage,
          onDialysis: profile.onDialysis,
        } : undefined,
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 응답을 받는 중 오류가 발생했습니다. 다시 시도해주세요.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <YStack flex={1} backgroundColor="$background">
        {/* 카테고리 선택 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} padding="$3">
          <XStack gap="$2">
            {CATEGORIES.map(cat => (
              <CategoryChip
                key={cat.id}
                {...cat}
                selected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            ))}
          </XStack>
        </ScrollView>

        {/* 메시지 목록 */}
        <FlatList
          ref={scrollViewRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <YStack gap="$3" paddingVertical="$8">
              <Text textAlign="center" color="$colorSubtle">
                {CATEGORIES.find(c => c.id === selectedCategory)?.icon} {CATEGORIES.find(c => c.id === selectedCategory)?.label} 관련 질문을 해보세요
              </Text>
              <YStack gap="$2">
                {SUGGESTED_PROMPTS[selectedCategory].map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="small"
                    onPress={() => sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </YStack>
            </YStack>
          }
          renderItem={({ item }) => (
            <MessageBubble message={item} />
          )}
        />

        {/* 입력 영역 */}
        <XStack
          padding="$3"
          gap="$2"
          backgroundColor="$background"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <Input
            flex={1}
            placeholder="질문을 입력하세요..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage(inputText)}
            editable={!isLoading}
          />
          <Button
            variant="primary"
            size="medium"
            disabled={!inputText.trim() || isLoading}
            onPress={() => sendMessage(inputText)}
          >
            <Send size={20} color="white" />
          </Button>
        </XStack>
      </YStack>
    </KeyboardAvoidingView>
  )
}

function CategoryChip({ id, label, icon, selected, onPress }: {
  id: string
  label: string
  icon: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <XStack
      backgroundColor={selected ? '$primary' : '$cardBackground'}
      paddingHorizontal="$3"
      paddingVertical="$2"
      borderRadius="$4"
      gap="$1"
      onPress={onPress}
      pressStyle={{ opacity: 0.8 }}
    >
      <Text>{icon}</Text>
      <Text color={selected ? 'white' : '$color'}>{label}</Text>
    </XStack>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <YStack
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxWidth="80%"
    >
      <GlassmorphicCard
        backgroundColor={isUser ? '$primary' : '$cardBackground'}
        padding="$3"
      >
        <Text color={isUser ? 'white' : '$color'}>
          {message.content}
        </Text>
      </GlassmorphicCard>
    </YStack>
  )
}
