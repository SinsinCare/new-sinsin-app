import appConfig from "../app.json"
import englishNativeCopy from "../locales/en.json"
import koreanNativeCopy from "../locales/ko.json"
import packageConfig from "../package.json"

const {
  getPrebuildArguments,
  getSyncEnvironment,
} = require("../scripts/sync-native-config")

describe("native locale configuration", () => {
  it("declares Korean and English to both mobile platforms", () => {
    const localizationPlugin = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-localization",
    )

    expect(localizationPlugin).toEqual([
      "expo-localization",
      {
        supportedLocales: {
          ios: ["ko", "en"],
          android: ["ko", "en"],
        },
      },
    ])
    expect(appConfig.expo.locales).toEqual({
      ko: "./locales/ko.json",
      en: "./locales/en.json",
    })
  })

  it("keeps permission dialogs and the installed app name localized", () => {
    expect(koreanNativeCopy.ios.CFBundleDisplayName).toBe("신신당부")
    expect(englishNativeCopy.ios.CFBundleDisplayName).toBe("Sinsin Care")
    expect(englishNativeCopy.android.app_name).toBe("Sinsin Care")

    for (const copy of Object.values(englishNativeCopy.ios)) {
      expect(copy).not.toMatch(/[가-힣]/)
    }
  })

  it("syncs app config before every local native run", () => {
    expect(packageConfig.scripts["native:sync:ios"]).toBe(
      "node scripts/sync-native-config.js ios",
    )
    expect(packageConfig.scripts["native:sync:android"]).toBe(
      "node scripts/sync-native-config.js android",
    )

    expect(packageConfig.scripts.ios).toBe(
      "npm run native:sync:ios && expo run:ios",
    )
    expect(packageConfig.scripts.android).toBe(
      "npm run native:sync:android && expo run:android",
    )
    expect(packageConfig.scripts["ios:test"]).toContain("-- npm run ios")
    expect(packageConfig.scripts["ios:prod"]).toContain("-- npm run ios")
    expect(packageConfig.scripts["ios-no-user"]).toContain("npm run ios")
    expect(packageConfig.scripts["android:test"]).toContain(
      "-- npm run android",
    )
    expect(packageConfig.scripts["android:prod"]).toContain(
      "-- npm run android",
    )
  })

  it("uses the local Expo CLI for a no-install config sync", () => {
    expect(getPrebuildArguments("ios").slice(1)).toEqual([
      "prebuild",
      "--platform",
      "ios",
      "--no-install",
    ])
    expect(getPrebuildArguments("android").slice(1)).toEqual([
      "prebuild",
      "--platform",
      "android",
      "--no-install",
    ])
    expect(() => getPrebuildArguments("web")).toThrow("<ios|android>")
    expect(getSyncEnvironment({ SAMPLE: "value" })).toEqual({
      SAMPLE: "value",
      COREPACK_ENABLE_PROJECT_SPEC: "0",
    })
  })
})
