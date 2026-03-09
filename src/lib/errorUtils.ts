import { ApiError } from "@/src/services/core/apiError"

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.message}\n\n코드: ${error.code}${error.statusCode ? ` (${error.statusCode})` : ""}`
  }
  if (error instanceof Error) return error.message
  return "알 수 없는 오류가 발생했습니다."
}
