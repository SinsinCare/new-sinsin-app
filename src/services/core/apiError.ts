export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public isNetworkError = false,
    public fieldErrors?: unknown,
    public result?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export interface ApiErrorLike {
  message: string
  code: string
  statusCode?: number
  isNetworkError?: boolean
  fieldErrors?: unknown
  result?: unknown
}

export function isApiErrorLike(error: unknown): error is ApiErrorLike {
  if (error instanceof ApiError) return true
  if (!error || typeof error !== "object") return false

  const candidate = error as Partial<ApiErrorLike>
  return (
    typeof candidate.message === "string" && typeof candidate.code === "string"
  )
}
