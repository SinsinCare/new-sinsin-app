/**
 * 메뉴 한 줄. **이 기능의 핵심 화면 요소**다 — 목업 -14.
 *
 * ```
 * [제한] 순대국밥                      [썸네일 86×86]
 * 나트륨 1,300mg · 한 끼 기준의 186%
 * 진하게 우려낸 순대국밥에 매콤한 다대기와 정갈한
 * 반찬을 곁들인 든든한 한 상
 * 12,000원
 * ```
 *
 * ## 조판은 시안 실측이다 (2026-08-20, C1_2 3배 렌더)
 *
 * 잉크 높이는 임계값에 따라 흔들리므로 **글자 이송(advance)** 으로 잰다. Pretendard 의
 * 한글 이송은 0.864em, 공백 0.251em, 숫자 0.66em(Bold)이라 픽셀에서 크기가 역산된다.
 *
 * - 이름 `신신백숙` 음절 이송 12.67·13.67·12.33 → 평균 12.89 = **15pt**(0.864×15=12.96).
 *   `순대국밥` 도 잉크 폭 51.0 으로 같은 값이다. 세로획 6–7px(=2.0–2.3pt)라 **Bold**.
 *   → `label.smallStrong`. 앞 판본의 `title.xSmall`(17)은 한 단계 컸다.
 * - 설명 `3음절+공백` 묶음이 34.0 으로 세 번 반복 → 34.0/(3×0.864+0.251) = **11.96 ≈ 12pt**,
 *   줄 피치 16.0 실측 → `subtext.small`(12/16). 세로획 2–3px 로 Regular.
 *   앞 판본은 `subtext.large`(15/20)라 설명이 이름만큼 커 보였다.
 * - 가격 `0`→`0` 이송 9.67·9.33 → 15pt 대(Bold 0.66×15=9.9), 세로획 5–6px → **15 Bold**.
 *   → `label.smallStrong`. 이름과 같은 크기·굵기인 것이 시안 그대로다.
 *
 * **근거 줄(`label.smallWeak` 15 medium)은 줄이지 않는다.** 시안에 없는 줄이라 실측
 * 대상이 아니고, 이 화면에서 사용자가 실제로 행동을 정하는 한 줄이다. 설명이 12 로
 * 내려가면서 위계는 오히려 또렷해졌다 — 이름 15 Bold · 근거 15 Medium · 설명 12 Regular.
 *
 * ## 배지는 서버가 사용자 기준으로 계산한 값만 쓴다
 *
 * `safetyLevel` 은 요청 시각에 `foodVerdict(menu, effectiveLimits(user))` 로 계산된
 * 값이다. `legacyRiskLevel`(정적 `restaurant_menu.risk_level`)은 고정 프리셋으로 시드돼
 * 5기·투석 환자가 1기와 똑같은 배지를 보게 만든다 — 응답에 있지만 **그리지 않는다**.
 *
 * ## 근거 없는 배지를 그리지 않는 세 가지 규칙
 *
 * 1. `profileMissing` 이면 배지를 **아예 감춘다**. 기준이 없는데 등급을 말할 수 없다.
 *    (대신 목록 상단에 `ProfileMissingNotice` 가 한 번 뜬다.)
 * 2. `safetyLevel === "UNKNOWN"` 이면 배지가 없다. 미판정을 `안전` 으로 올리는 방향의
 *    오류가 신장 환자에게 가장 위험하다.
 * 3. 숫자는 **응답에 있는 값만** 쓴다. `menuSafetyEvidence()` 가 그 경계를 지킨다 —
 *    한도(mg)를 `amount / ratio` 로 역산해 "당신의 기준" 이라고 부르지 않는다.
 *
 * ## 근거 줄을 이름 바로 아래 둔 이유
 *
 * 목업에는 없는 한 줄이다. 배지 색만으로는 "왜, 얼마나 제한인지" 를 말하지 못하는데,
 * 그걸 가격 아래로 내리면 배지와 멀어져 연결되지 않는다.
 * 배지 → 이름 → 근거 순서가 읽는 순서와 같다.
 *
 * ## `추정` 을 행마다 붙이지 않는다
 *
 * 오늘 DB 는 100% `ESTIMATED` 라 행마다 붙이면 같은 단어가 다섯 번 찍힌다. 목록이
 * 위에서 한 번 말하고(`MenuTab`), 값이 **행마다 다를 때만** `showConfidence` 로 켠다.
 * 그 판단은 `menuConfidenceMode()` 가 목록 단위로 한다.
 *
 * ## 썸네일이 없는 메뉴가 실제로 있다 — 그래도 **자리는 비우지 않는다**
 *
 * 초판은 "빈 회색 박스는 사진을 못 불러왔다로 읽힌다" 는 이유로 없으면 열 자체를 뺐다.
 * 실제 데이터에서 그 판단이 뒤집혔다: 메뉴 2,013행 중 사진이 있는 것은 **4행**뿐이라
 * 사진 없음이 예외가 아니라 기본이고, 그래서 (1) 사진이 섞인 목록은 행마다 본문 폭이
 * 달라 들쭉날쭉하고 (2) 한 장도 없는 목록은 다른 화면처럼 보였다.
 *
 * 지금은 항상 같은 자리를 두고, 빈 자리에는 갤러리 글리프를 얹어 "이 메뉴에는 사진이
 * 없다" 를 말한다. **음식 그림을 그리지 않는 것이 요지다** — 무엇이 나오는지 모르는데
 * 그림을 그리면 양·모양을 주장하게 되고, 그건 스톡 사진을 걷어낸 이유와 같은 잘못이다.
 */

import { StyleSheet, Text, View, type ViewStyle } from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"

import {
  V2Icon,
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { dynamicKey } from "@/src/i18n/dynamicKey"

import type { MenuItemDto, SafetyLevel } from "../../types"
import { menuSafetyEvidence } from "../../utils/menuSafetyEvidence"
import { safetyBadge } from "../../utils/safetyBadge"
import { SafetyBadge } from "../SafetyBadge"

/**
 * 썸네일 치수. **정사각 86**이고, 3배 렌더 실측이다(2026-08-20 시안 C1_2).
 *
 * 두 줄 다 x=807..1064px 에서 흰색으로 끊기고(=269.0..355.0pt, 258px=86.00pt),
 * 세로도 583..841px 로 같은 258px 다. 오른쪽 끝 355.0 은 시안의 우측 여백 20 이다
 * (우리는 `GUTTER` 16 이라 4pt 더 오른쪽에 붙는다 — 화면 정본을 시안보다 앞세운다).
 *
 * 앞 판본의 `88×72`(가로로 넓은 직사각)는 **옛 목업**의 값이다. 가로형은 정사각과
 * 달리 사진마다 위아래가 잘려 나가는 축이 정해져 있어서(음식 사진은 세로 중앙이
 * 접시다) 국밥 한 그릇이 그릇 테두리로만 보이는 행이 실제로 있었다.
 *
 * 모서리 반경은 그대로 `radius.sm`(8). 실측 코너 곡선(꼭대기 줄에서 20px 들여쓰기,
 * 3px 아래 11px, 6px 아래 8px …)이 반경 24px=8pt 의 원호와 1px 안에서 맞는다.
 *
 * **`export` 인 것이 계약이다.** 로딩 자리표시(`DetailSkeletons`)가 이 자리를 미리
 * 그려야 하는데, 거기에 같은 수를 손으로 적어 두면 여기만 바뀌는 날 스켈레톤이 옛
 * 치수로 남는다(실제로 `88×72` 로 남아 있었다). 미러를 만들지 말고 이 값을 가져갈 것.
 */
export const THUMBNAIL = 86

/** 설명 클램프 줄 수. 목업 -14 그대로. */
const DESCRIPTION_LINES = 2

/**
 * 등급 → 근거 문구 키. `UNKNOWN` 이 `null` 인 것이 규칙 2번의 구현이다 —
 * 여기서 문구를 주면 미판정에도 설명이 붙어 판정이 난 것처럼 보인다.
 * 조건문을 화면 안에 흘리지 않고 이 표 하나로 고정한다.
 *
 * 숫자 근거(`menuSafetyEvidence`)를 만들 수 있으면 그쪽이 이긴다. 이 표는 영양소 값이
 * 없거나 비율이 0 인 **폴백**이다 — 실측 DB 에서는 거의 오지 않지만, 오는 날
 * "왜 제한인지" 를 한 마디도 못 하는 행이 생기지 않게 남겨 둔다.
 */
const REASON_KEY = {
  SAFE: "restaurant.safety.reason.SAFE",
  CAUTION: "restaurant.safety.reason.CAUTION",
  RESTRICTED: "restaurant.safety.reason.RESTRICTED",
  UNKNOWN: null,
} as const satisfies Record<SafetyLevel, string | null>

/** 근거의 단위 → 문구 키. `mg`/`g` 를 문자열로 이어 붙이지 않는다(로케일마다 다르다). */
const AMOUNT_KEY = {
  mg: "restaurant.safety.evidence.amountMg",
  g: "restaurant.safety.evidence.amountG",
} as const

export interface MenuRowProps {
  menu: MenuItemDto
  /**
   * 프로필이 없어 판정 기준 자체가 없는 상태. `true` 면 배지와 근거 줄을 감춘다.
   * 행마다 판단하지 않고 목록이 한 번 정해서 내려 준다 — 응답의 `profileMissing` 은
   * 메뉴별 값이 아니라 요청 단위 값이다.
   */
  profileMissing?: boolean
  /**
   * 이 행에 `추정`/`검수` 를 표기할 것인가. **기본은 `false`** 다 — 목록이 한 가지
   * 신뢰도로만 이뤄져 있으면 목록이 위에서 한 번 말한다(`menuConfidenceMode`).
   * 값이 행마다 다를 때만 목록이 이 prop 을 켠다.
   */
  showConfidence?: boolean
  style?: ViewStyle
}

export function MenuRow({
  menu,
  profileMissing = false,
  showConfidence = false,
  style,
}: MenuRowProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  // 배지를 그릴 수 있는 조건: 기준이 있고(프로필 존재) 판정이 났다(UNKNOWN 아님).
  const canShowVerdict = !profileMissing && menu.safetyLevel !== "UNKNOWN"

  const evidence = canShowVerdict ? menuSafetyEvidence(menu) : null
  // 근거 줄의 강조 색은 배지와 **같은 색**이다. 다른 색을 쓰면 사용자가 둘을 다른
  // 정보로 읽는다. 색만으로 뜻을 전하지 않기 위해 배지 라벨과 숫자가 항상 함께 있다.
  const accent =
    (canShowVerdict ? safetyBadge(menu.safetyLevel, colors)?.fg : null) ??
    colors.label.neutral

  const amountText = evidence
    ? t(dynamicKey(AMOUNT_KEY[evidence.unit]), {
        nutrient: t(dynamicKey(`restaurant.safety.driver.${evidence.driver}`)),
        value: evidence.amount.toLocaleString("ko-KR"),
      })
    : null
  // 크기는 백분율 하나다 — 행마다 단위가 갈리면 목록을 비교할 수 없다(menuSafetyEvidence.ts).
  const magnitudeText =
    evidence === null
      ? null
      : t("restaurant.safety.evidence.percent", {
          percent: evidence.magnitude.value,
        })

  const reasonKey = REASON_KEY[menu.safetyLevel]
  const driver = menu.safetyDriver
  // 숫자 근거가 있으면 등급 문장은 그리지 않는다 — 같은 말을 두 줄로 하게 된다.
  const reason =
    canShowVerdict && evidence === null && reasonKey !== null && driver !== null
      ? t(dynamicKey(reasonKey), {
          driver: t(dynamicKey(`restaurant.safety.driver.${driver}`)),
        })
      : null
  const confidenceLabel =
    canShowVerdict && showConfidence
      ? menu.confidence === "VERIFIED"
        ? t("restaurant.safety.verified")
        : t("restaurant.safety.estimated")
      : null
  const metaLine = [reason, confidenceLabel].filter(Boolean).join(" · ")

  return (
    <View style={[styles.row, style]}>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          {/* 근거 영양소를 함께 넘긴다 — 배지의 접근성 문구가 "안전도 제한" 대신
              "나트륨 기준으로 제한" 이 된다. 이 기능에서 가장 안전에 민감한 요소이므로
              스크린리더 사용자가 보이는 정보보다 적게 받아서는 안 된다. */}
          {canShowVerdict && (
            <SafetyBadge level={menu.safetyLevel} driver={menu.safetyDriver} />
          )}
          <Text
            style={[
              typography.label.smallStrong,
              styles.name,
              { color: colors.label.normal },
            ]}
            numberOfLines={1}
          >
            {menu.name}
          </Text>
        </View>

        {/*
          근거 줄. 이 화면에서 사용자가 실제로 행동을 정하는 한 줄이라 설명문(14)보다
          작지 않게 두고, 배수·백분율만 배지 색으로 강조한다. 영양소 이름과 값은
          중립색이다 — 줄 전체를 빨갛게 칠하면 목록이 경고판이 되어 오히려 안 읽힌다.
        */}
        {amountText !== null && magnitudeText !== null && (
          <Text
            style={[
              typography.label.smallWeak,
              { color: colors.label.neutral },
            ]}
          >
            {amountText}
            <Text style={{ color: accent }}>{` · ${magnitudeText}`}</Text>
          </Text>
        )}

        {metaLine.length > 0 && (
          <Text
            style={[
              typography.caption.small,
              { color: colors.label.alternative },
            ]}
            lineBreakStrategyIOS="hangul-word"
          >
            {metaLine}
          </Text>
        )}

        {menu.description && (
          <Text
            style={[typography.subtext.small, { color: colors.label.neutral }]}
            numberOfLines={DESCRIPTION_LINES}
            lineBreakStrategyIOS="hangul-word"
          >
            {menu.description}
          </Text>
        )}

        {menu.price !== null && (
          <Text
            style={[
              typography.label.smallStrong,
              { color: colors.label.normal },
            ]}
          >
            {t("restaurant.detail.price", {
              price: menu.price.toLocaleString("ko-KR"),
            })}
          </Text>
        )}
      </View>

      {/*
        사진 자리는 **항상 있다.** 종전에는 `menu.imageUrl &&` 로 감싸서 사진이 없으면
        슬롯째 사라졌고, 그래서 (1) 사진이 섞인 목록은 행마다 글 폭이 달라 들쭉날쭉했고
        (2) 한 장도 없는 목록은 다른 화면처럼 보였다. 실제로 메뉴 2,013행 중 사진이 있는
        것은 4행뿐이라 이 상태가 기본이었다.

        빈 자리는 회색 타일 + 갤러리 글리프다 — **음식을 그리지 않는다.** 무엇이 나오는지
        모르는데 그림을 그리면 양·모양을 주장하게 되고, 이 앱에서 그건 사진을 지어내는 것과
        같다(스톡 사진을 걷어낸 이유와 같은 규칙).
      */}
      {menu.imageUrl ? (
        <Image
          source={{ uri: menu.imageUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          // 메뉴 사진은 장식이다. 이름·가격이 이미 같은 행에 있어 다시 읽힐 필요가 없다.
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <View
          // 빈 자리도 장식이다. 스크린리더가 "이미지 없음" 을 읽을 이유가 없다.
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[
            styles.thumbnail,
            styles.thumbnailEmpty,
            { backgroundColor: colors.fill.normal },
          ]}
        >
          <V2Icon
            name="gallery"
            size={iconSize.sm}
            color={colors.label.assistive}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
    paddingVertical: spacing[16],
  },
  body: { flex: 1, gap: spacing[6] },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  // 배지가 고정폭이므로 이름이 남은 폭을 다 쓰고 말줄임한다.
  name: { flex: 1 },
  thumbnail: {
    width: THUMBNAIL,
    height: THUMBNAIL,
    borderRadius: radius.sm,
  },
  thumbnailEmpty: { alignItems: "center", justifyContent: "center" },
})
