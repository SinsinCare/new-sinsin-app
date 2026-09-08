import { Image, Pressable, StyleSheet, View } from "react-native"
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  ReduceMotion,
  ZoomIn,
} from "react-native-reanimated"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

import BellGlyph from "@/assets/images/home-bell.svg"
import { Text } from "@/src/shared/components/AppText"
import { hapticSelection } from "@/src/lib/haptics"
import { LAYOUT } from "@/src/theme/surface"
import { useHomeInk } from "./homeInk"

/**
 * 홈 히어로 — 시안(2026-09-04, Figma export `home.svg`)의 좌표를 그대로 옮겼다.
 *
 * 복숭아색 면(아래 모서리 r28) 위에 **기록/통계** 제목, 종, 말풍선, 캐릭터, 과일 네 점.
 * 캐릭터는 **가만히 있는다** — 예전 홈의 둥둥 뜨는 애니메이션은 이 시안에서 뺐다
 * (2026-09-04 요청).
 *
 * 캐릭터는 **면 밖으로 넘친다.** 시안에서 캐릭터 상자(y206~374)는 히어로 밑변(357)을
 * 17 넘어 CTA(373) 윗선에 닿고, 레이어 순서도 맨 위다 — 손이 흰 본문 위에 얹힌다.
 * 그래서 복숭아 면(overflow hidden)과 캐릭터를 **형제**로 두고, 바깥 상자에 zIndex 를
 * 줘 뒤따르는 본문보다 위에 그린다. 캐릭터를 면 안에 넣으면 밑변에서 잘린다.
 *
 * 캐릭터·과일은 시안 프레임(375) 폭의 **무대** 위에 절대 좌표로 놓고 무대를 가운데
 * 맞춘다. 넓은 화면에서도 서로의 상대 위치가 시안과 같다. 좌표는 세이프에어리어
 * 아래 기준(시안의 상태바 47 을 뺀 값).
 *
 * 자산은 시안 SVG 에 박힌 원본(과일 1254px·캐릭터 1024px)을 3x 로 줄여 실었다.
 */

// 시안: 히어로 바닥 y=357, 상태바 47 → 세이프에어리어 아래로 310.
const HERO_HEIGHT = 310
const HERO_RADIUS = 28
const STAGE_WIDTH = 375
// 제목 줄(시안 y55, h34)·말풍선(y105, h70)·캐릭터(y206).
const HEADER_TOP = 8
const HEADER_HEIGHT = 36
const BUBBLE_TOP = 16

const CHARACTER = require("@/assets/images/home-hero-character.png")

/**
 * 과일 48×48. 시안은 상자의 **왼쪽 위 모서리**를 축으로 돌렸고(SVG `rotate(θ x y)`),
 * RN 은 **가운데**를 축으로 돌린다. 그래서 시안 좌표를 그대로 쓰면 최대 12pt 어긋난다 —
 * 아래 left/top 은 시안 회전의 결과 중심에 RN 상자의 중심을 맞춘 값이다
 * (C = 모서리 + R(θ)·(24,24), left = Cx−24).
 */
const FRUITS = [
  {
    key: "berry",
    source: require("@/assets/images/home-hero-berry.png"),
    left: 28.2,
    top: 183.2,
    rotate: "14.24deg",
  },
  {
    key: "apple",
    source: require("@/assets/images/home-hero-apple.png"),
    left: 76,
    top: 141,
    rotate: "-5.02deg",
  },
  {
    key: "onion",
    source: require("@/assets/images/home-hero-onion.png"),
    left: 254.8,
    top: 139.8,
    rotate: "13.11deg",
  },
  {
    key: "pumpkin",
    source: require("@/assets/images/home-hero-pumpkin.png"),
    left: 302,
    top: 185,
    rotate: "-8.22deg",
  },
] as const
const FRUIT_SIZE = 48

const BUBBLE_ACCENT = "#FE7139"

interface BubbleLine {
  pre: string
  keyword: string
  post: string
}

/** "기록"·"영양소에 맞는 식사" 같은 핵심어 하나만 브랜드색으로 든다. */
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

interface HomeHeroProps {
  hasRecord: boolean
  streak: number
  withinLimits: boolean
  /** 제목 줄의 "통계" → 통계 페이지 */
  onOpenStats: () => void
  /** 달력 아이콘 → 날짜 고르기(지난 날짜의 기록을 본다) */
  onPressDate: () => void
  /** 종 → 알림함 */
  onOpenNotifications: () => void
}

export function HomeHero({
  hasRecord,
  streak,
  withinLimits,
  onOpenStats,
  onPressDate,
  onOpenNotifications,
}: HomeHeroProps) {
  const { t } = useTranslation("common")
  const insets = useSafeAreaInsets()
  const ink = useHomeInk()

  const lines = getBubbleLines({ hasRecord, withinLimits, streak, t })

  return (
    <View style={[styles.outer, { height: HERO_HEIGHT + insets.top }]}>
      <View style={[styles.surface, { backgroundColor: ink.heroBg }]}>
        {/* ── 무대: 과일(글자 뒤에 깔린다) ── */}
        <View
          pointerEvents="none"
          style={[styles.stage, { top: insets.top, height: HERO_HEIGHT }]}
        >
          {/*
            첫 진입에만 과일이 톡톡 떠오른다(순서대로 70ms). 그 뒤로는 **가만히** —
            떠다니는 반복 동작은 시안에서 뺐다. 동작 줄이기면 즉시 그린다.
          */}
          {FRUITS.map((fruit, index) => (
            <Animated.Image
              key={fruit.key}
              entering={ZoomIn.delay(220 + index * 70)
                .duration(360)
                .easing(Easing.out(Easing.back(1.4)))
                .reduceMotion(ReduceMotion.System)}
              source={fruit.source}
              style={{
                position: "absolute",
                left: fruit.left,
                top: fruit.top,
                width: FRUIT_SIZE,
                height: FRUIT_SIZE,
                transform: [{ rotate: fruit.rotate }],
              }}
              resizeMode="contain"
            />
          ))}
        </View>

        {/* ── 제목 줄: 기록 | 통계 ······ 달력 · 종 ── */}
        <View style={[styles.header, { marginTop: insets.top + HEADER_TOP }]}>
          <View style={styles.titles}>
            <Text style={[styles.titleActive, { color: ink.strong }]}>
              {t("home.hero.record")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.hero.viewStats")}
              onPress={() => {
                hapticSelection()
                onOpenStats()
              }}
              hitSlop={8}
            >
              {({ pressed }) => (
                <Text
                  style={[
                    styles.titleInactive,
                    { color: ink.inactive, opacity: pressed ? 0.5 : 1 },
                  ]}
                >
                  {t("home.hero.stats")}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.actions}>
            <HeaderButton
              label={t("home.hero.chooseDate")}
              onPress={onPressDate}
            >
              <Ionicons
                name="calendar-clear-outline"
                size={22}
                color={ink.inactive}
              />
            </HeaderButton>
            <HeaderButton
              label={t("home.hero.notifications")}
              onPress={onOpenNotifications}
            >
              <BellGlyph width={24} height={24} color={ink.inactive} />
            </HeaderButton>
          </View>
        </View>

        {/* ── 말풍선(시안 199×70, r16) ── */}
        <Animated.View
          entering={FadeIn.delay(380)
            .duration(280)
            .reduceMotion(ReduceMotion.System)}
          style={styles.bubbleWrap}
          pointerEvents="none"
        >
          <View style={styles.bubble}>
            {lines.map((l, index) => (
              <Text
                key={index}
                style={[styles.bubbleLine, { color: ink.bubbleText }]}
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
        </Animated.View>
      </View>

      {/* ── 캐릭터: 면 밖, 맨 위. 밑변을 17 넘어 CTA 에 닿는다(시안 y206~374). ── */}
      <View
        pointerEvents="none"
        style={[styles.stage, { top: insets.top, height: HERO_HEIGHT }]}
      >
        <Animated.Image
          entering={FadeInUp.duration(420)
            .easing(Easing.out(Easing.cubic))
            .reduceMotion(ReduceMotion.System)}
          source={CHARACTER}
          style={styles.character}
          resizeMode="contain"
        />
      </View>
    </View>
  )
}

/**
 * 제목 줄 오른쪽의 아이콘 버튼. 상자는 44 로 터치 영역을 지키고, 마지막 버튼의
 * 아이콘 오른쪽 끝이 `screenX` 에 닿도록 줄 자체에서 그만큼 뺀다.
 */
function HeaderButton({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticSelection()
        onPress()
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: pressed ? 0.5 : 1 },
      ]}
    >
      {children}
    </Pressable>
  )
}

const ICON_BUTTON = 44
const ICON = 24
const BUBBLE_BG = "#FFFFFF"

const styles = StyleSheet.create({
  // 바깥 상자는 자르지 않는다(캐릭터가 넘친다). 뒤따르는 본문 위에 서도록 zIndex.
  outer: { width: "100%", zIndex: 1 },
  surface: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },
  stage: {
    position: "absolute",
    left: "50%",
    marginLeft: -STAGE_WIDTH / 2,
    width: STAGE_WIDTH,
  },
  // 시안: x82 y206 w196.5 h167.9 — 바닥이 히어로 밑변(357) 아래로 17 넘어가 잘린다.
  character: {
    position: "absolute",
    left: 82,
    top: 159,
    width: 196,
    height: 168,
  },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: LAYOUT.screenX,
    paddingRight: LAYOUT.screenX - (ICON_BUTTON - ICON) / 2,
  },
  titles: { flexDirection: "row", alignItems: "baseline", gap: 12 },
  titleActive: {
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.42,
    fontWeight: "700",
  },
  titleInactive: {
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.42,
    fontWeight: "500",
  },
  actions: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    width: ICON_BUTTON,
    height: ICON_BUTTON,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleWrap: {
    alignItems: "center",
    marginTop: BUBBLE_TOP,
    paddingHorizontal: 24,
  },
  bubble: {
    maxWidth: 320,
    backgroundColor: BUBBLE_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  // 꼬리는 말풍선과 같은 면을 45° 돌려 겹친다 — 선 없이 면 하나로 이어진다.
  bubbleTail: {
    width: 12,
    height: 12,
    marginTop: -8,
    borderRadius: 4,
    backgroundColor: BUBBLE_BG,
    transform: [{ rotate: "45deg" }],
  },
  // 시안: 16, 줄 간격 23.
  bubbleLine: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.32,
    fontWeight: "600",
    textAlign: "center",
  },
  bubbleKeyword: { color: BUBBLE_ACCENT },
})
