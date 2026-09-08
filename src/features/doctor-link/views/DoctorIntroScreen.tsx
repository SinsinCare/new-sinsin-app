import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 의사 연결 온보딩.
 *
 * 이 화면은 데이터를 부르지 않는다 — 로딩·에러 상태가 없는 이유다. 여기서 하는 일은
 * "무엇을 왜 연결하는지" 를 먼저 말하는 것뿐이고, 실제 왕복은 다음 화면(검색)에서 시작한다.
 * 그래서 네비게이션도 직접 하지 않고 `onNext` 로 밖에 맡긴다.
 */

import {
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"

import {
  V2BottomCTA,
  V2ScreenHeader,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"

const MASCOT = require("@/assets/images/doctor-character.png")

const STEP_KEYS = ["step1", "step2", "step3"] as const

/** 번호 원 지름. 시안 실측 30(=2x 60). */
const BADGE = 30

/**
 * 번호 사이 세로 커넥터.
 *
 * `borderStyle: "dashed"` 는 안드로이드에서 borderWidth·borderRadius 조합에 따라
 * 실선으로 떨어지거나 대시 간격이 무시된다. 시안의 점선은 장식이 아니라 "1→2→3 이
 * 이어진 순서" 라는 뜻이므로 플랫폼에 맡기지 않고 View 를 반복해 직접 그린다.
 */
const CONNECTOR_DASHES = [0, 1, 2]

export function DoctorIntroScreen({
  onNext,
  onBack,
}: {
  onNext?: () => void
  onBack?: () => void
}) {
  const { t } = useTranslation("settings")
  const { colors } = useV2Theme()
  const { width, height } = useWindowDimensions()

  // 작은 화면(SE 등)에서 마스코트가 스텝 목록과 CTA 를 밀어내면 정작 읽어야 할 문장이
  // 접힌다. 폭·높이 양쪽에 상한을 둬서 마스코트가 먼저 줄어들게 한다.
  const mascotSize = Math.min(width * 0.72, height * 0.32, 280)

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader title={t("doctorLink.intro.title")} onBack={onBack} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 한 <Text> 안에 중첩해 색만 나눈다. 조각을 View 로 쪼개면 줄바꿈이 조각 경계에
            갇혀서 기기 폭이 바뀔 때 어색한 곳에서 끊긴다. */}
        <Text style={[typography.title.small, { color: colors.label.normal }]}>
          {t("doctorLink.intro.headlineLead")}
          {"\n"}
          <Text style={{ color: colors.primary.primary }}>
            {t("doctorLink.intro.headlineHighlight")}
          </Text>
          {t("doctorLink.intro.headlineTail")}
        </Text>

        <View style={[styles.mascotWrap, { minHeight: mascotSize }]}>
          {/* 장식 일러스트라 접근성 레이블을 붙이지 않는다 — 헤드라인이 이미 같은 말을
              하고 있어서, 읽어 주면 같은 문장을 두 번 듣게 된다. */}
          <Image
            source={MASCOT}
            style={{ width: mascotSize, height: mascotSize }}
            resizeMode="contain"
          />
        </View>

        <View>
          {STEP_KEYS.map((key, index) => (
            <View key={key}>
              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.fill.background },
                  ]}
                >
                  <Text
                    style={[
                      typography.label.xSmallWeak,
                      { color: colors.label.neutral },
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.label.smallWeak,
                    styles.stepText,
                    { color: colors.label.normal },
                  ]}
                >
                  {t(`doctorLink.intro.${key}`)}
                </Text>
              </View>

              {index < STEP_KEYS.length - 1 && (
                <View style={styles.connector}>
                  {CONNECTOR_DASHES.map((dash) => (
                    <View
                      key={dash}
                      style={[
                        styles.dash,
                        { backgroundColor: colors.line.strong },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <V2BottomCTA
        primaryLabel={t("doctorLink.intro.cta")}
        onPrimary={() => onNext?.()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[24],
    paddingBottom: spacing[24],
    gap: spacing[24],
  },
  // 마스코트가 남는 세로 공간을 먹고 그 안에서 가운데 선다 — 화면이 길어져도
  // 헤드라인은 위, 스텝은 아래에 붙어 있는다.
  mascotWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1 },
  // 커넥터는 번호 원과 같은 폭을 차지해 원 중심축에 정확히 선다.
  connector: {
    width: BADGE,
    alignItems: "center",
    gap: spacing[4],
    paddingVertical: spacing[4],
  },
  dash: { width: 1, height: 4 },
})
