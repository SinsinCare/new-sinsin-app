export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public isNetworkError = false,
  ) {
    super(message)
    this.name = "ApiError"
  }
}
