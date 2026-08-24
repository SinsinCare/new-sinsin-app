import fs from "node:fs"
import path from "node:path"
import { KAKAO_NATIVE_APP_KEY } from "../src/config/kakaoConfig"

const root = process.cwd()
const app = JSON.parse(
  fs.readFileSync(path.join(root, "app.json"), "utf8"),
) as {
  expo: {
    plugins: unknown[]
    ios?: { infoPlist?: { LSApplicationQueriesSchemes?: string[] } }
  }
}

function kakaoPlugin(): [string, Record<string, unknown>] | undefined {
  return app.expo.plugins.find(
    (plugin): plugin is [string, Record<string, unknown>] =>
      Array.isArray(plugin) && plugin[0] === "@react-native-kakao/core",
  )
}

describe("Kakao native release configuration", () => {
  it("declares one native app key and both native callback handlers", () => {
    const plugin = kakaoPlugin()
    expect(plugin).toBeDefined()
    const options = plugin?.[1] as {
      nativeAppKey?: unknown
      android?: { authCodeHandlerActivity?: unknown }
      ios?: { handleKakaoOpenUrl?: unknown; kakaotalkLoginEnabled?: unknown }
    }
    expect(options.nativeAppKey).toMatch(/^[a-f0-9]{32}$/u)
    expect(KAKAO_NATIVE_APP_KEY).toBe(options.nativeAppKey)
    expect(options.android?.authCodeHandlerActivity).toBe(true)
    expect(options.ios).toMatchObject({
      handleKakaoOpenUrl: true,
      kakaotalkLoginEnabled: true,
    })
    expect(app.expo.ios?.infoPlist?.LSApplicationQueriesSchemes).toEqual(
      expect.arrayContaining(["kakaokompassauth", "kakaolink", "kakaotalk"]),
    )
  })

  /*
    아래 두 테스트는 prebuild 산출물(`android/` — gitignore 됨)을 읽는다. CNG 라
    fresh clone·CI 에는 그 디렉터리가 없고, 그 머신에서 ENOENT 로 죽으면 "설정이
    틀렸다" 로 오독된다(2026-08-25 리뷰). 산출물이 있는 머신에서만 검증하되,
    **조용히 넘어가지 않고 skip 으로 표에 남긴다** — skip 은 "검증 안 됨" 이지
    "통과" 가 아니다. EAS 빌드는 매번 prebuild 를 다시 돌리므로 로컬 산출물 검증이
    배포 산출물을 완전히 대변하지는 않는다는 한계도 같은 이유로 여기 적는다.
  */
  const hasPrebuildOutput = fs.existsSync(path.join(root, "android/app"))
  const itOnPrebuiltMachine = hasPrebuildOutput ? it : it.skip

  itOnPrebuiltMachine(
    "retains Retrofit generic signatures and annotations in release builds",
    () => {
      const appJson = fs.readFileSync(path.join(root, "app.json"), "utf8")
      const generatedRules = fs.readFileSync(
        path.join(root, "android/app/proguard-rules.pro"),
        "utf8",
      )
      for (const rule of [
        "-keepattributes Signature, InnerClasses, EnclosingMethod",
        "-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations",
        "-keep,allowobfuscation,allowshrinking interface retrofit2.Call",
        "-keepclasseswithmembers,includedescriptorclasses class * { @retrofit2.http.* <methods>; }",
      ]) {
        expect(appJson).toContain(rule)
        expect(generatedRules).toContain(rule)
      }
    },
  )

  itOnPrebuiltMachine(
    "generates the Kakao OAuth callback scheme into AndroidManifest",
    () => {
      const plugin = kakaoPlugin()
      const key = String(plugin?.[1]?.nativeAppKey ?? "")
      const manifest = fs.readFileSync(
        path.join(root, "android/app/src/main/AndroidManifest.xml"),
        "utf8",
      )
      expect(manifest).toContain("com.kakao.sdk.auth.AuthCodeHandlerActivity")
      expect(manifest).toContain(`android:scheme="kakao${key}"`)
    },
  )
})
