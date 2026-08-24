#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8")
const app = JSON.parse(read("app.json"))
const packageLock = JSON.parse(read("package-lock.json"))
const plugin = app.expo.plugins.find(
  (entry) => Array.isArray(entry) && entry[0] === "@react-native-kakao/core",
)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(plugin, "@react-native-kakao/core plugin is missing")
const options = plugin[1] ?? {}
assert(
  typeof options.nativeAppKey === "string" &&
    /^[a-f0-9]{32}$/u.test(options.nativeAppKey),
  "Kakao native app key is missing or malformed",
)
const kakaoConfigSource = read("src/config/kakaoConfig.ts")
const socialAuthSource = read("src/services/auth/socialAuthService.ts")
assert(
  kakaoConfigSource.includes('from "../../app.json"') &&
    socialAuthSource.includes('from "@/src/config/kakaoConfig"') &&
    !/KAKAO_NATIVE_APP_KEY\s*=\s*["'][a-f0-9]{32}["']/u.test(socialAuthSource),
  "JavaScript Kakao SDK key is not sourced from app.json",
)
assert(
  options.android?.authCodeHandlerActivity === true,
  "Android AuthCodeHandlerActivity is disabled",
)
assert(
  options.ios?.handleKakaoOpenUrl === true &&
    options.ios?.kakaotalkLoginEnabled === true,
  "iOS Kakao URL handling is incomplete",
)

const requiredRules = [
  "-keepattributes Signature, InnerClasses, EnclosingMethod",
  "-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations",
  "-keep,allowobfuscation,allowshrinking interface retrofit2.Call",
  "-keep,allowobfuscation,allowshrinking class retrofit2.Response",
  "-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation",
  "-keepclasseswithmembers,includedescriptorclasses class * { @retrofit2.http.* <methods>; }",
]
for (const file of ["app.json", "android/app/proguard-rules.pro"]) {
  const source = read(file)
  for (const rule of requiredRules) {
    assert(source.includes(rule), `${file}: missing R8 rule: ${rule}`)
  }
}

assert(
  app.expo.plugins.some(
    (entry) =>
      Array.isArray(entry) &&
      entry[0] === "expo-build-properties" &&
      entry[1]?.android?.enableProguardInReleaseBuilds === true,
  ),
  "Android release minification is not enabled",
)
for (const dependency of [
  "@react-native-kakao/core",
  "@react-native-kakao/user",
]) {
  assert(
    packageLock.packages?.[`node_modules/${dependency}`]?.version === "2.4.5",
    `${dependency} lockfile version is not 2.4.5`,
  )
}

const manifest = read("android/app/src/main/AndroidManifest.xml")
assert(
  manifest.includes("com.kakao.sdk.auth.AuthCodeHandlerActivity") &&
    manifest.includes(`android:scheme="kakao${options.nativeAppKey}"`),
  "generated Android Kakao callback is missing or uses a different app key",
)

const patch = read("patches/@react-native-kakao+user+2.4.5.patch")
assert(
  patch.includes("SelectAccount"),
  "Kakao iOS reauthentication patch is missing",
)

console.log("KAKAO_NATIVE_CONFIG_OK")
