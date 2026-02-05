import type { FoodAnalysisRequest, FoodAnalysisResponse, ChatRequest, ChatResponse } from '../types'
import axios from 'axios';

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  '<backend-api-base-url>'

export const aiService = {
  async analyzeFoodImage(request: FoodAnalysisRequest): Promise<FoodAnalysisResponse> {
    const response = await axios.post(`${BACKEND_URL}/analyze-food`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return response.data
  },

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await axios.post(`${BACKEND_URL}/chat`, request, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return response.data
  },
}