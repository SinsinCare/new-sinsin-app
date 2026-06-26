const handledRequestIds = new Set<string>()

export function markFoodAnalysisRequestHandled(requestId: string): void {
  handledRequestIds.add(requestId)
}

export function isFoodAnalysisRequestHandled(requestId: string): boolean {
  return handledRequestIds.has(requestId)
}
