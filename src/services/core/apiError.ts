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
  }
}
