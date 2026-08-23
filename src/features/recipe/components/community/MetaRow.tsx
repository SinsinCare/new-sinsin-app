/**
 * **지표 한 줄** — `조회 N` · ♥N · 💬N · (우측) 시각.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.3 (WBS 1.1).
 *
 * ```
 * [조회 3,291] ─12─ [♥16 ─2─ 541] ─12─ [💬16 ─2─ 77] ─── flex ─── [2시간 전]
 * ```
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 아이콘 16 + 간격 2 (§4-G21)
 *
 * 실측 글리프는 12~14 인데 `iconSize` 에 14 가 없다. §4-G21 의 판정은 **토큰을 늘리지 말고
 * `xs`(16)를 쓰고 간격을 좁혀라** 다 — 16 박스 안의 글리프가 ~13 이라 좌우로 1.5씩 여백을
 * 이미 들고 오기 때문에, 실측 간격 4 를 그대로 주면 6~7 로 보인다.
 *
 * G21 은 "4→3", §2.3 의 도면은 `─2─` 로 서로 다르게 적혀 있다. **3 은 스페이싱 사다리에
 * 없고**(`spacing.ts` 머리말: 원오프 3/5/7/9/… 는 인접 토큰으로 스냅) 도면이 2 를 적었으므로
 * `spacing[2]` 를 쓴다. 시각 간격은 2 + 1.5 = 3.5 로 실측 4 와 0.5 차이다.
 *
 * ■ 왜 수를 `formatCount(value, language)` 로 거르나
 *
 * `3291` 은 세 자리마다 끊기지 않으면 읽는 게 아니라 세는 일이 된다. `toLocaleString()` 은
 * **기기 로케일**을 따라가서 앱 언어와 어긋나므로 쓰지 않는다(`displayNumber.ts` 머리말).
 *
 * ■ 줄 전체가 **한 가지 회색**이다 (2026-08-21)
 *
 * 예전에는 숫자·시각이 `label.alternative`, 아이콘이 `label.assistive` 로 두 단이었다.
 * 라이트에서 재면 각각 2.8:1 · 1.7:1 이라 **둘 다 본문 기준(4.5:1) 밖**이고, 위계를
 * 만들라고 나눈 두 값이 실제로는 "덜 읽히는 것"과 "안 읽히는 것"이었다.
 * 조회수·좋아요·시각은 장식이 아니라 읽으라고 그리는 수다 — 읽히는 가장 옅은 단
 * (`label.neutral`, 라이트 5.2 · 다크 5.8)으로 통일한다. 제목(`label.normal`, 14.1)과의
 * 위계는 그대로다. 사다리의 근거는 `design-system-v2/tokens/colors.ts` §label.
 *
 * ■ 시각은 문자열로 받는다
 *
 * 목록은 `2시간 전`, 상세·댓글은 `2026.07.28` 이다. 어느 쪽인지는 **부르는 화면이 안다**.
 * 여기서 날짜를 포맷하면 같은 컴포넌트가 두 가지 시간 규칙을 들고 있게 된다.
 * 크기만 여기서 정한다(목록 12 / 상세 13 — §5.4 판정).
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"

import { V2Icon } from "@/src/design-system-v2/components/V2Icon"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { spacing } from "@/src/design-system-v2/tokens/spacing"

import { formatCount } from "../../utils/displayNumber"

/** 하트 글리프. 목록의 지표는 **집계 표시**라 기본이 채운 하트다(§2.3). */
export type MetaRowHeart = "filled" | "outline"

/** 시각의 크기. 목록 12 Regular / 상세·댓글 13 Regular — §5.4. */
export type MetaRowTimeVariant = "list" | "detail"

export type MetaRowProps = {
  /**
   * 조회수. **`null`/`undefined` 면 `조회 N` 을 통째로 안 그린다** — 옛 서버는 이 값을
   * 안 준다(§2.3 하위호환). 0 은 값이 있는 것이므로 그린다.
   */
  viewCount?: number | null
  likeCount: number
  commentCount: number
  /** 기본 `filled`. */
  heart?: MetaRowHeart
  /** 우측 정렬 시각. 안 주면 안 그린다(`CompactPostRow` 는 시각이 없다 — §2.4). */
  timeText?: string
  /** 기본 `list`(12 Regular). */
  timeVariant?: MetaRowTimeVariant
  style?: StyleProp<ViewStyle>
}

export function MetaRow({
  viewCount,
  likeCount,
  commentCount,
  heart = "filled",
  timeText,
  timeVariant = "list",
  style,
}: MetaRowProps) {
  const { colors } = useV2Theme()
  const { t, i18n } = useTranslation("recipe")
  const language = i18n.language

  return (
    <View style={[styles.row, style]}>
      {viewCount != null ? (
        <V2Text
          token="subtext.medium"
          color={colors.label.neutral}
          numberOfLines={1}
        >
          {/*
            `{{count}}` 는 i18next 가 복수형을 고르는 열쇠라 **수를 그대로** 넘겨야 한다.
            그런데 화면에 찍혀야 하는 건 `3,291` 이다. i18next 는 `replace` 가 있으면
            보간 데이터를 그쪽에서만 읽으므로(복수형 선택은 이미 `count` 로 끝난 뒤다),
            둘을 같이 넘겨 복수형과 표기를 동시에 맞춘다.
          */}
          {t("post.viewCount", {
            count: viewCount,
            replace: { count: formatCount(viewCount, language) },
          })}
        </V2Text>
      ) : null}

      <View
        style={styles.stat}
        accessibilityLabel={t("post.likeCount", { count: likeCount })}
      >
        <V2Icon
          name={heart === "outline" ? "heartOutline" : "heartFilled"}
          size="xs"
          color={colors.label.neutral}
        />
        <V2Text token="subtext.medium" color={colors.label.neutral}>
          {formatCount(likeCount, language)}
        </V2Text>
      </View>

      <View
        style={styles.stat}
        accessibilityLabel={t("post.commentCount", { count: commentCount })}
      >
        <V2Icon name="chatOutline" size="xs" color={colors.label.neutral} />
        <V2Text token="subtext.medium" color={colors.label.neutral}>
          {formatCount(commentCount, language)}
        </V2Text>
      </View>

      {timeText ? (
        <V2Text
          token={timeVariant === "detail" ? "subtext.medium" : "subtext.small"}
          color={colors.label.neutral}
          numberOfLines={1}
          style={styles.time}
        >
          {timeText}
        </V2Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  /** 지표끼리 12. 높이는 안 박는다 — 13/18 라인박스가 스스로 18 을 만든다(§2.3). */
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  /** 아이콘↔숫자. §4-G21 — 16 박스가 이미 여백을 들고 온다. */
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  /*
    시각은 **실제 컬럼 우변**에 붙는다. 시안이 썸네일 없는 행에서도 237 고정폭으로 그린 건
    시안 오류다(§5.21-9) — `marginLeft:"auto"` 는 부모가 실제로 차지한 폭을 따라간다.
  */
  time: { marginLeft: "auto" },
})
