import type { FoodAnalysisRequest, FoodAnalysisResponse, ChatRequest, ChatResponse } from '../types'

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '<backend-api-base-url>'

export const aiService = {
  async analyzeFoodImage(request: FoodAnalysisRequest): Promise<FoodAnalysisResponse> {
    const response = await fetch(`${BACKEND_URL}/analyze-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('음식 분석에 실패했습니다.')
    }

    return response.json()
  },

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('채팅 응답에 실패했습니다.')
    }

    return response.json()
  },
}
