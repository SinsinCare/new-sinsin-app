import * as dotenv from "dotenv"
import * as path from "path"

// 프로젝트 루트 .env (EXPO_PUBLIC_BACKEND_URL 등)
dotenv.config({ path: path.resolve(__dirname, "../.env") })
// 테스트 전용 계정·오버라이드
dotenv.config({ path: path.resolve(__dirname, ".env.test") })
