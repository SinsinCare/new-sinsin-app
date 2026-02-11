export const nicknameService = {
  async checkNicknameAvailability(_nickname: string): Promise<boolean> {
    // TODO: 백엔드 API 연동
    // const response = await axios.get(`${BACKEND_URL}/check-nickname`, { params: { nickname } })
    // return response.data.available
    return true
  },
}
