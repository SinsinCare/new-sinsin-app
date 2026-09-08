import { Text } from "@/src/design-system-v2/primitives/NativeText"
/**
 * 홈 탭의 `AI 식단 상담` 섹션 — 상담 시트로 들어가는 **유일한 문** (시안 C4_1 · E1_2).
 *
 * 추천 질문 한 줄을 누르면 그 질문이 실린 채로 시트가 열리고, `질문하기` 를 누르면 빈
 * 상태로 열린다. 실제 대화는 공통 `/consult` 페이지에서 이어간다 —
 * 이 파일은 **무엇을 물을지 고르는 자리**일 뿐이라 `useChat` 도 컨텍스트 빌더도 모른다.
 *
 * ## 왜 `DetailSection` 을 쓰지 않는가
 *
 * 형제 섹션(`메뉴`·`사진`·`후기`)은 전부 `DetailSection` 껍데기다. 여기만 다른 이유는
 * 시안이 그 껍데기가 표현할 수 없는 것을 둘 요구하기 때문이다.
 *
 * 1. **두 톤 제목.** `AI` 만 브랜드색이고 `식단 상담` 은 `label.normal` 이다.
 *    `DetailSection` 은 `<Text>` 하나에 색 하나다(`title: string`).
 * 2. **부제.** `궁금한 점을 물어보세요!` 가 제목 바로 아래 붙는다. `DetailSection` 에는
 *    부제 슬롯이 없고, 자식으로 내리면 `SECTION_TITLE_GAP`(12) 만큼 떨어져 제목에서
 *    분리된다 — 시안은 제목 라인박스 바로 다음 줄이다(아래 실측표의 `0`).
 *
 * 그래서 껍데기를 이 파일이 직접 그리되 **치수는 전부 `layout.ts` 에서 가져온다**
 * (`GUTTER`/`SECTION_GAP`/`SECTION_TITLE_GAP`). 격자를 새로 만들면 이 섹션만 형제들과
 * 다른 시작선·다른 상하 여백을 갖게 되고, 그게 정확히 `layout.ts` 머리말이 말하는
 * "왼쪽 시작선이 여러 개" 다. `DetailSection` 에 두 톤 제목과 부제 슬롯이 생기면 이
 * 껍데기를 지우고 갈아탄다.
 *
 * 두 톤을 만드는 방법은 `ReviewWritePrompt` 와 같다 — 번역된 **한 문장 안에서** 강조할
 * 조각의 위치를 찾아 앞·강조·뒤로 쪼갠다. 조각을 따로 이어 붙이지 않는 이유는 그러면
 * 사이의 공백을 코드가 지어내야 하고, 공백을 쓰지 않는 로케일에서 문장이 깨지기 때문이다.
 * (그래서 `restaurant.consult.sectionTitleRest` 는 여기서 읽지 않는다 — 이어 붙이는
 * 방식이었다면 필요했을 키다.)
 *
 * ## 3배 렌더 실측 (C4_1 / E1_2, 375×812 화면 dp)
 *
 * | 항목 | 실측 | 채택한 토큰 |
 * |---|---|---|
 * | 제목 잉크 | y 337.33–352.67 (h 15.33), x 24.33– | `typography.title.xSmall`(17 Bold) — 형제 `메뉴`·`후기` 와 같은 값 |
 * | 제목 `AI` | 최암 `rgb(254,113,57)` | `primary.primary` |
 * | 제목 `식단 상담` | 최암 `rgb(42,42,55)` | `label.normal` |
 * | 부제 잉크 | y 360.33–371.00 (h 10.67), 최암 `rgb(108,109,112)` | 12 Regular = `typography.subtext.small` · `label.neutral` |
 * | 제목→부제 | 라인박스 간격 ≈ 1 | 0 (그냥 쌓는다) |
 * | 부제→행1 | 라인박스 간격 12.33 | `SECTION_TITLE_GAP`(12) |
 * | 질문 행 | 높이 40.0, x 20.0–354.67(폭 335) | `ROW_HEIGHT` · 좌우는 화면 정본 `GUTTER`(16) |
 * | 행 면 | `rgb(248,248,248)` | `fill.alternative`(`#70737c0d` over white = 247.7). `fill.normal` 은 244 라 **다른 값**이다 |
 * | 행 모서리 | 곡률 반경 = 높이의 절반 | `radius.full` |
 * | 행 간격 | 6.0 | `spacing[6]` |
 * | 번호 잉크 | 중심 x 40.0(= 면 왼쪽 +20), 높이 11.0, 획 1.92–2.09 | 15 **Bold** = `typography.label.smallStrong` · `primary.primary` |
 * | 질문 잉크 | x 56.33(세 행 동일), 획/크기 = 0.093 | 13 **Medium** = `typography.label.xSmallWeak` · `label.normal` |
 * | 셰브론 잉크 | 6.33 × 11.0, 오른쪽 끝이 면 오른쪽에서 12.67 안쪽, `rgb(194,195,196)` | `iconSize.sm`(20) · `label.assistive` |
 * | 행4→pill | 16.0 | `spacing[16]` (형제 pill 행과 같은 값) |
 * | pill | 84.67 × 32.0, 흰 면 + 1dp `rgb(224,224,226)`, 라벨 13 | `OutlinePill` — 아래 §pill |
 *
 * 무게 판정은 **획 굵기 ÷ 글자 크기**를 같은 타일 안의 기준점 둘로 보간해서 했다:
 * 12 Regular = 0.0765, 17 Bold = 0.1278 → Medium(500) 0.0936 / SemiBold(600) 0.1107.
 * 질문 문장 두 개가 0.0962·0.0899 (평균 0.093) 라 **Medium** 이다. 번호는 0.123–0.139 로
 * Bold 기준점과 같고, 같은 시안의 `후기 1,413`(= `label.small`, 15 SemiBold) 은 0.0745 라
 * 확실히 다르다. 숫자를 SemiBold 로 내리면 번호가 질문보다 안 읽힌다.
 *
 * ## 셰브론은 상자가 아니라 **잉크**를 맞춘다 (`paddingRight` 가 12 가 아닌 이유)
 *
 * `icon-chevron-right.svg` 는 24 상자 안에 `M9 18L15 12L9 6`(획 2, 둥근 끝) 이라 잉크가
 * 상자 좌우에서 각각 8/24 만큼 안쪽에 있다. `iconSize.sm`(20)이면 6.67 이다. 시안의
 * 잉크 오른쪽 끝은 면에서 12.67 안쪽이므로 **상자** 오른쪽은 면에서 6.0 이어야 한다.
 * `paddingRight: spacing[12]` 를 주면 잉크가 18.67 안쪽으로 들어가 오른쪽만 허전해진다.
 * 같은 판단을 상세 헤더의 뒤로가기 셰브론이 먼저 했다(`RestaurantDetailScreen` 의
 * `CHEVRON_INK_INSET`) — 사람은 상자가 아니라 획을 본다.
 *
 * ## `질문하기` 는 **테두리** pill 이다 — 채움 버튼을 만들지 말 것
 *
 * 이 화면의 채움(브랜드 면) 버튼은 하단 바의 `진단하기` 하나뿐이고 시안도 그 규칙을
 * 지킨다(행은 회색 면, 브랜드색은 번호에만, CTA 는 테두리). 여기에 오렌지 CTA 를 넣는
 * 순간 한 화면에 채움이 둘이 되고 `진단하기` 가 죽는다. 회귀는
 * `tests/restaurantAiConsultEntry.test.ts` 가 막는다.
 *
 * 다만 사실 하나를 남긴다: **시안의 pill 은 32/13 이고 `OutlinePill` 은 38/15 다**
 * (`controlHeight.md` · `typography.label.small`). 여기서 혼자 32/13 으로 내리면 같은
 * 화면의 `사진 전체보기`·`후기 더보기` 와 갈려 pill 이 세 종류가 된다 — 그 셋은 시안에서
 * 전부 같은 컴포넌트다. 고칠 자리는 `OutlinePill` 이고 별건이다.
 *
 * ## 행 수는 4 고정이 아니다
 *
 * 시안은 네 줄이지만 그건 목업이 메뉴 3건짜리 한식집이고 프로필이 있는 경우다.
 * 질문을 만드는 규칙은 `consult/suggestedQuestions.ts` 가 갖고, 여기는 **받은 만큼만**
 * 그린다. 0개면 섹션 자체가 없다 — 빈 제목과 부제만 남은 섹션은 "AI 가 고장났다" 로 읽힌다.
 */

import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"
import { trackAnalyticsEvent } from "@/src/features/analytics"

import type { ConsultQuestion } from "../../consult/types"
import { GUTTER, SECTION_GAP, SECTION_TITLE_GAP } from "../../layout"
import { OutlinePill } from "./OutlinePill"

/** 시안 실측 40.0. `height` 가 아니라 하한인 이유는 아래 `styles.row` 주석. */
const ROW_HEIGHT = 40

/**
 * 번호가 앉는 칸의 폭. 시안에서 `1`·`2`·`3`·`4` 의 잉크 폭이 제각각인데도 중심이
 * 40.0 에 고정돼 있다 — 즉 숫자는 **가운데 정렬된 고정폭 칸**에 있다. 폭을 주지 않으면
 * 한 자리 수와 두 자리 수 사이에서 질문 문장의 시작선이 흔들린다.
 */
const NUMBER_COLUMN = 16

export interface AiConsultSectionProps {
  /** 계측용. 어느 식당의 질문이 눌렸는지 없이는 이 이벤트가 아무 말도 못 한다. */
  restaurantId: number
  /**
   * `buildConsultQuestions` 가 돌려준 것 그대로. 순서가 곧 화면 순서이자 번호다.
   * 빈 배열이면 이 컴포넌트는 아무것도 그리지 않는다(호출부도 띠를 그리지 않아야 한다).
   */
  questions: ConsultQuestion[]
  /** 질문 행이면 그 질문, `질문하기` 면 `null`. 시트를 여는 것은 호출부 몫이다. */
  onAsk: (question: ConsultQuestion | null) => void
}

export function AiConsultSection({
  restaurantId,
  questions,
  onAsk,
}: AiConsultSectionProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()

  if (questions.length === 0) return null

  /*
    한 문장 안에서 `AI` 의 자리를 찾아 앞·강조·뒤로 쪼갠다(머리말 §두 톤 제목).
    못 찾으면 통째로 한 톤에 그린다 — 강조를 잃는 것이 문장이 깨지는 것보다 낫다.
  */
  const title = t("restaurant.consult.sectionTitle")
  const accent = t("restaurant.consult.sectionTitleAccent")
  const at = accent === "" ? -1 : title.indexOf(accent)
  const before = at >= 0 ? title.slice(0, at) : title
  const after = at >= 0 ? title.slice(at + accent.length) : ""

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text
          style={[typography.title.xSmall, { color: colors.label.normal }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {before}
          {at >= 0 && (
            <Text style={{ color: colors.primary.primary }}>{accent}</Text>
          )}
          {after}
        </Text>
        <Text
          style={[typography.subtext.small, { color: colors.label.neutral }]}
          lineBreakStrategyIOS="hangul-word"
        >
          {t("restaurant.consult.sectionSubtitle")}
        </Text>
      </View>

      <View style={styles.rows}>
        {questions.map((question, index) => (
          <Pressable
            key={question.kind}
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
            /*
              스크린 리더에는 번호와 문장을 한 문장으로 준다. 번호만 따로 읽히면
              "1" 다음에 문장이 오는 두 조각이 되어 목록의 자리를 알려 주지 못한다.
            */
            accessibilityLabel={t("restaurant.consult.questionAccessibility", {
              index: index + 1,
              question: question.text,
            })}
            onPress={() => {
              /*
                `kind` 와 `index` 를 **둘 다** 싣는다. 행 수가 고정이 아니라서
                `kind` 만 보면 "안 눌린 질문" 과 "애초에 안 뜬 질문" 이 같은 0 이 된다.
                문장 자체는 싣지 않는다 — 갈래로 이미 갈리고, 새니타이저가 어차피 떤다.
              */
              trackAnalyticsEvent("restaurant_ai_consult_question_tap", {
                restaurant_id: restaurantId,
                kind: question.kind,
                index,
              })
              onAsk(question)
            }}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: colors.fill.alternative },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.number,
                typography.label.smallStrong,
                { color: colors.primary.primary },
              ]}
            >
              {index + 1}
            </Text>
            <Text
              style={[
                styles.question,
                typography.label.xSmallWeak,
                { color: colors.label.normal },
              ]}
              numberOfLines={1}
              lineBreakStrategyIOS="hangul-word"
            >
              {question.text}
            </Text>
            <V2Icon
              name="chevronRight"
              size={iconSize.sm}
              color={colors.label.assistive}
            />
          </Pressable>
        ))}
      </View>

      {/* 시트를 **빈 상태로** 연다. 추천 질문에 없는 것을 묻고 싶은 사용자의 문이다. */}
      <View style={styles.pillRow}>
        <OutlinePill
          label={t("restaurant.consult.askCta")}
          showChevron
          onPress={() => onAsk(null)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // 형제 섹션(`DetailSection`)과 **같은 격자**여야 한다 — 머리말 §왜 DetailSection 을 안 쓰나.
  section: { paddingHorizontal: GUTTER, paddingVertical: SECTION_GAP },
  // 제목과 부제 사이에는 간격이 없다(실측 ≈1). 부제까지가 한 덩어리이고 그 아래가 12 다.
  header: { marginBottom: SECTION_TITLE_GAP },
  rows: { gap: spacing[6] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    /*
      시안은 정확히 40 이지만 `height` 로 박지 않는다 — OS 글자 크기를 키운 사용자에게
      13pt 한 줄이 40 을 넘기면 잘린다. 하한이면 그 경우에만 행이 자라고 `radius.full`
      이라 모양은 그대로 알약이다. 평상시 렌더 결과는 40 으로 같다.
    */
    minHeight: ROW_HEIGHT,
    borderRadius: radius.full,
    paddingLeft: spacing[12],
    // 12 가 아니다 — 셰브론은 상자가 아니라 잉크를 맞춘다(머리말 §셰브론).
    paddingRight: spacing[6],
    gap: spacing[8],
  },
  number: { width: NUMBER_COLUMN, textAlign: "center" },
  // 길면 한 줄로 자른다(시안 3행이 `…` 로 끊긴다). 두 줄이 되면 행 높이가 제각각이 된다.
  question: { flex: 1 },
  // 형제 섹션의 `사진 전체보기`·`후기 더보기` pill 행과 같은 값.
  pillRow: { alignItems: "center", paddingTop: spacing[16] },
  // 목록 행 규칙 — 카드(0.9)보다 강한 값.
  pressed: { opacity: 0.6 },
})
