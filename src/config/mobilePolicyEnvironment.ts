import type { MobilePolicyEnvironment } from "@/src/features/mobilePolicy/types"

export interface RuntimeInfoSource {
  explicitEnvironment?: string
  backendUrl?: string
}

export function resolveMobilePolicyEnvironment({
  explicitEnvironment,
  backendUrl,
}: RuntimeInfoSource): MobilePolicyEnvironment {
  if (explicitEnvironment === "test" || explicitEnvironment === "production") {
    return explicitEnvironment
  }

  const normalizedBackendUrl = backendUrl?.toLowerCase() ?? ""
  if (
    normalizedBackendUrl.includes("localhost") ||
    normalizedBackendUrl.includes("127.0.0.1") ||
    normalizedBackendUrl.includes("sinsin-test") ||
    normalizedBackendUrl.includes("-test")
  ) {
    return "test"
  }

  return "production"
}
