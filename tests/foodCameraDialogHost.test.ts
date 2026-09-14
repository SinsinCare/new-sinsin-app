import { readFileSync } from "fs"
import { join } from "path"

/**
 * 푸드 카메라 페이지(native-stack fullScreenModal)는 자기 다이얼로그 호스트를 가져야 한다.
 * 없으면 사진 권한 거부 상태에서 "갤러리에서 가져오기" 의 설정 열기 확인창이 루트 RN Modal 로
 * present 되다 iOS 에 거부돼 아무것도 안 보인다(2026-09-12 TestFlight 제보, 시뮬레이터 재현).
 */
describe("food camera page owns a dialog host", () => {
  const src = readFileSync(
    join(__dirname, "../src/features/home/views/FoodCameraScreen.tsx"),
    "utf8",
  )
  it("mounts V2DialogHost inside the page", () => {
    expect(src).toMatch(
      /import \{ V2DialogHost \} from "@\/src\/design-system-v2"/,
    )
    expect(src).toMatch(/<V2DialogHost \/>/)
  })
  it("gallery path still goes through the permission helper that shows the confirm", () => {
    expect(src).toMatch(/pickImageAssetFromGallery\(\)/)
    const helper = readFileSync(
      join(__dirname, "../src/features/recipe/services/imagePickerService.ts"),
      "utf8",
    )
    expect(helper).toMatch(/showConfirm\(\{/)
  })
})
