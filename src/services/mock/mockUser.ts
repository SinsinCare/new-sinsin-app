import type { AppUser } from "../types/serviceTypes"

export class MockUser implements AppUser {
  constructor(
    public uid: string,
    public email: string | null,
    public displayName: string | null,
  ) {}
}

// 개발용 기본 Mock 사용자
export const DEFAULT_MOCK_USER = new MockUser(
  "mock-user-001",
  "test@sinsin.dev",
  "김철수",
)
