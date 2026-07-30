import AsyncStorage from "@react-native-async-storage/async-storage"
import i18n, { getAppLanguage, setAppLanguage } from "../src/i18n"
import enSettings from "../src/i18n/locales/en/settings.json"
import koSettings from "../src/i18n/locales/ko/settings.json"

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("settings translations", () => {
  afterEach(async () => {
    jest.restoreAllMocks()
    await i18n.changeLanguage("ko")
  })

  it("keeps Korean and English settings keys in sync", () => {
    expect(leafKeys(enSettings).sort()).toEqual(leafKeys(koSettings).sort())
  })

  it("switches settings copy immediately without restarting the app", async () => {
    await i18n.changeLanguage("en")
    expect(i18n.t("profile.title", { ns: "settings" })).toBe("Edit profile")
    expect(i18n.t("phone.deleteTitle", { ns: "settings" })).toBe(
      "Delete this phone number?",
    )

    await i18n.changeLanguage("ko")
    expect(i18n.t("profile.title", { ns: "settings" })).toBe("프로필 수정")
    expect(i18n.t("phone.deleteTitle", { ns: "settings" })).toBe(
      "전화번호를 삭제할까요?",
    )
  })

  it("does not partially switch the live UI when persistence fails", async () => {
    await i18n.changeLanguage("ko")
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValueOnce(new Error("storage unavailable"))

    await expect(setAppLanguage("en")).rejects.toThrow("storage unavailable")
    expect(getAppLanguage()).toBe("ko")
  })
})
