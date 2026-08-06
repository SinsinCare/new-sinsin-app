import { useEffect, useRef } from "react"
import { Animated, Image, StyleSheet, Text, View } from "react-native"
import type { ImageSourcePropType } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

/** 유저의 데이터 입력 상태에 따라 깔리는 배경 종류 */
export type CharacterBackgroundVariant = "low" | "high"

// 개선판 리소스(375×336 프레임). 상태 변주는 배경 대신 말풍선이 말한다 —
// 배경이 통째로 바뀌면 기록 한 번에 화면이 다른 앱처럼 출렁인다.
const BACKGROUND_SOURCES: Record<
  CharacterBackgroundVariant,
  ImageSourcePropType
> = {
  low: require("@/assets/images/home-record-bg.png"),
  high: require("@/assets/images/home-record-bg.png"),
}

const CHARACTER_SOURCE = require("@/assets/images/home-record-character.png")

/**
 * 상단 영역 높이(세이프에어리어 제외). 목업의 히어로 비례를 따른다 —
 * 캐릭터 아래로 오렌지 여백이 넉넉히 남고, 그 위로 본문 패널이 라운드로 겹친다.
 * 아래 섹션이 더 붙어도 스크롤이 받아준다. 한 화면에 다 넣으려고 누르지 않는다.
 */
const HERO_HEIGHT = 280

// 말풍선은 배경과 무관하게 흰 면 — 다크에서도 오렌지 배경 위라 그대로 둔다.
const BUBBLE_BG = "#FFFFFF"
const BUBBLE_TEXT = "#17181C"
const BUBBLE_ACCENT = "#FE7139"

interface BubbleLine {
  pre: string
  keyword: string
  post: string
}

/** "기록"·"식사" 같은 핵심어 하나만 브랜드색으로 든다. */
function line(pre: string, keyword: string, post: string): BubbleLine {
  return { pre, keyword, post }
}

function getBubbleLines({
  hasRecord,
  withinLimits,
  streak,
  t,
}: {
  hasRecord: boolean
  withinLimits: boolean
  streak: number
  t: TFunction<"common">
}): BubbleLine[] {
  if (!hasRecord) {
    return [
      line(
        t("home.character.empty.first.pre"),
        t("home.character.empty.first.keyword"),
        t("home.character.empty.first.post"),
      ),
      line(
        t("home.character.empty.second.pre"),
        t("home.character.empty.second.keyword"),
        t("home.character.empty.second.post"),
      ),
    ]
  }
  if (withinLimits) {
    return [
      line(
        t("home.character.onTarget.pre"),
        t("home.character.onTarget.keyword"),
        t("home.character.onTarget.post"),
      ),
      streak > 1
        ? line(
            t("home.character.streak.pre", { count: streak }),
            t("home.character.streak.keyword"),
            t("home.character.streak.post"),
          )
        : line(
            t("home.character.tomorrow.pre"),
            t("home.character.tomorrow.keyword"),
            t("home.character.tomorrow.post"),
          ),
    ]
  }
  return [
    line(
      t("home.character.progress.first.pre"),
      t("home.character.progress.first.keyword"),
      t("home.character.progress.first.post"),
    ),
    line(
      t("home.character.progress.second.pre"),
      t("home.character.progress.second.keyword"),
      t("home.character.progress.second.post"),
    ),
  ]
}

interface CharacterSectionProps {
  selectedDate: Date
  hasRecord: boolean
  streak: number
  withinLimits: boolean
  backgroundVariant: CharacterBackgroundVariant
}

/**
 * 홈 상단. 말풍선 한 장과 떠 있는 캐릭터 — 그림자·그라데이션·배지를 걷어냈다.
 * 상태(기록 여부·영양 제한·연속 기록)는 말풍선 문구가 말한다.
 */
export function CharacterSection({
  hasRecord,
  streak,
  withinLimits,
  backgroundVariant,
}: CharacterSectionProps) {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const floatY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -10,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [floatY])

  const lines = getBubbleLines({ hasRecord, withinLimits, streak, t })

  return (
    <View style={[styles.container, { height: HERO_HEIGHT + insets.top }]}>
      <Image
        source={BACKGROUND_SOURCES[backgroundVariant]}
        style={styles.background}
        resizeMode="cover"
      />

      <View style={[styles.bubbleWrap, { marginTop: insets.top + 12 }]}>
        <View style={styles.bubble}>
          {lines.map((l, index) => (
            <Text
              key={index}
              style={styles.bubbleLine}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {l.pre}
              <Text style={styles.bubbleKeyword}>{l.keyword}</Text>
              {l.post}
            </Text>
          ))}
        </View>
        <View style={styles.bubbleTail} />
      </View>

      <Animated.Image
        source={CHARACTER_SOURCE}
        style={[styles.character, { transform: [{ translateY: floatY }] }]}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  // 리소스 프레임 375×336. 상태바 뒤까지 차므로 세이프에어리어만큼 더 키운다(인라인 height).
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  bubbleWrap: { alignItems: "center", paddingHorizontal: 24 },
  bubble: {
    // 영어 문장은 한국어보다 길다 — 폭을 묶지 않으면 말풍선이 화면 양끝에
    // 닿고, 줄이 늘어난 만큼 overflow:hidden 인 히어로에서 캐릭터가 잘린다.
    maxWidth: 320,
    backgroundColor: BUBBLE_BG,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  // 꼬리는 말풍선과 같은 면을 45° 돌려 겹친다 — 선 없이 면 하나로 이어진다.
  bubbleTail: {
    width: 14,
    height: 14,
    marginTop: -8,
    borderRadius: 3,
    backgroundColor: BUBBLE_BG,
    transform: [{ rotate: "45deg" }],
  },
  bubbleLine: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.3,
    fontWeight: "600",
    color: BUBBLE_TEXT,
    textAlign: "center",
  },
  bubbleKeyword: { color: BUBBLE_ACCENT },
  character: {
    width: 150,
    height: 150,
    marginTop: 4,
  },
})
