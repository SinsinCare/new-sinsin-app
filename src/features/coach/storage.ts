/**
 * 기능별 첫 진입 안내(하프시트)의 "봤음" 기록.
 *
 * 기기당·기능당 한 번만 보여주기 위한 저장소다. 계정이 아니라 **기기** 기준인
 * 이유: 이 안내는 화면 읽는 법이지 사용자 데이터가 아니고, 서버 왕복을 붙이면
 * 첫 진입의 400ms 안에 답이 못 온다(공지 팝업이 이미 그 비용을 내고 있다).
 *
 * 값은 본 기능 키의 배열 하나다. 버전을 키에 박아 두어(`v1`) 안내 내용을 크게
 * 갈아엎는 날 키만 올리면 전원이 다시 본다 — 항목별 revision 은 공지처럼 서버가
 * 내용을 바꾸는 물건에나 필요하다.
 */

import AsyncStorage from "@react-native-async-storage/async-storage"

export const FEATURE_INTRO_SEEN_KEY = "@sinsin/feature-intro-seen:v1"

/** 안내가 존재하는 기능들. 키가 곧 i18n 네임스페이스(`coach.<key>.*`)다. */
export type FeatureIntroKey = "restaurant" | "recipe" | "consult"

interface IntroStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

/** 깨진 payload 는 "아무도 안 봤다" 로 읽는다 — 안내가 한 번 더 뜨는 쪽이 안전하다. */
export function parseSeen(raw: string | null): readonly string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : []
  } catch {
    return []
  }
}

export function createFeatureIntroStorage(
  storage: IntroStorage = AsyncStorage,
) {
  return {
    async hasSeen(feature: FeatureIntroKey): Promise<boolean> {
      return parseSeen(await storage.getItem(FEATURE_INTRO_SEEN_KEY)).includes(
        feature,
      )
    },
    async markSeen(feature: FeatureIntroKey): Promise<void> {
      const seen = parseSeen(await storage.getItem(FEATURE_INTRO_SEEN_KEY))
      if (seen.includes(feature)) return
      await storage.setItem(
        FEATURE_INTRO_SEEN_KEY,
        JSON.stringify([...seen, feature]),
      )
    },
  }
}

export const featureIntroStorage = createFeatureIntroStorage()
