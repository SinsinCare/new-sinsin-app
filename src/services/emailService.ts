import axios from "axios"

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "<backend-api-base-url>"

export const emailService = {
  async checkEmailAvailability(_email: string): Promise<boolean> {
    // TODO: 백엔드 API 연동
    // const response = await axios.get(`${BACKEND_URL}/check-email`, { params: { email } })
    // return response.data.available
    return true
  },

  async sendVerificationCode(_email: string): Promise<void> {
    // TODO: 백엔드 API 연동
    // await axios.post(`${BACKEND_URL}/send-verification`, { email })
  },

  async verifyCode(_email: string, _code: string): Promise<boolean> {
    // TODO: 백엔드 API 연동
    // const response = await axios.post(`${BACKEND_URL}/verify-code`, { email, code })
    // return response.data.verified
    return true
  },
}
