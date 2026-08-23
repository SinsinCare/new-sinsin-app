/**
 * **댓글 · 대댓글 행 (98)** — 게시글 상세(S4) · 답글쓰기(S5) · 스토리 댓글 시트(S12) 공용.
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.8 (WBS 1.7).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ 세로 리듬은 왜 스펙 표와 두 칸 다른가 (액션줄 18 · 아래여백 12)
 *
 * §2.8 의 리듬 표는 `액션줄 16 (13 Regular / lh 16) · paddingBottom 14` 로 98 을 만든다.
 * 두 가지가 걸린다:
 *
 *   1. **13 Regular / lh 16 인 토큰이 정본에 없다.** 13 Regular 은 `subtext.medium`
 *      (13/18)뿐이고, 구역 스펙(`comment-write.md` T4~T6)도 그 토큰을 지목한다.
 *      lh 를 16 으로 덮어쓰면 그 자리에 오프토큰 타이포가 하나 생긴다(§0.2 위반).
 *   2. **실측 중심선이 18 쪽을 가리킨다.** `comment-write.md` §2.3 이 잰 세 중심은
 *      이름줄 +24 · 본문 +48 · 액션줄 **+77** 이다. 액션줄이 68 에서 시작할 때
 *      lh 16 이면 중심이 76(1 어긋남), lh **18** 이면 정확히 **77** 이다.
 *
 * 그래서 액션줄 18 · 아래여백 12 로 잡는다 — **합계는 그대로 98** 이고, 세 중심선이
 * 전부 실측과 일치하며, 타이포는 토큰에서 나온다. (`comment-write.md` §2.3 이 "98 을
 * 정확히 재현한다"며 적어 둔 또 다른 레시피 `14·20·4·16·13·14·14` 는 더해 보면 **95** 다.)
 *
 * 리듬을 `COMMENT_ROW_RHYTHM` 으로 **내보내는** 이유: 이 저장소의 jest 에는 렌더러가
 * 없어서(`tests/helpers/hookHarness.ts` 머리말) "행이 98 로 그려지는가"를 사후에 잴 방법이
 * 없다. 항을 이름으로 꺼내 두면 **합이 `ROW.commentRow` 인가**를 테스트가 직접 묻는다.
 * 세 항을 타이포 토큰의 `lineHeight` 에서 **파생**시킨 것도 같은 이유다 — 본문을 다른
 * 토큰으로 갈아 끼우면 합이 깨져서 즉시 드러난다.
 *
 * ■ 이름줄은 높이 16 인데 배지는 21, ⋯ 는 24 다
 *
 * 셋이 같은 중심선(+24)을 공유한다는 것이 실측이고(`comment-write.md` §2.3), 행 높이 98 은
 * 이름줄이 **16 만** 기여할 때만 나온다. 그래서 줄 높이를 16 으로 **박고** 큰 것들이
 * 위아래로 삐져나가게 둔다(21 은 ±2.5, 24 는 ±4). Yoga 는 넘치는 자식을 자르지 않으므로
 * 그림은 실측 그대로고, 높이만 리듬을 따른다. 줄 높이를 내용에 맡기면 배지가 있는 행만
 * 5px 커져서 같은 목록 안에서 행 높이가 두 종류가 된다.
 *
 * ■ 대댓글은 **왼쪽만** 들어간다
 *
 * 좌 32(= 20 + 12) / 우 20. `⋯`·날짜·본문의 우측 줄바꿈 지점은 부모와 같은 x 다
 * (§2.8, `comment-write.md` §2.4 가 본문 가용폭 323 으로 검증). 배경(`fill.alternative`)과
 * 하단 구분선은 **full-bleed** 라 좌우 패딩은 안쪽 `View` 가 갖는다 — 바깥에 주면 Yoga 가
 * 절대 배치 자식(구분선)을 패딩 안쪽 기준으로 놓아 선이 20 만큼 짧아진다(`PostRow` 와 같은 함정).
 *
 * ■ `⋯` 가 여는 메뉴는 이 컴포넌트의 것이 아니다 — 특히 대댓글에서
 *
 * 여기서는 **트리거만** 그린다(`onPressMore`). 대댓글의 메뉴에 `답글` 을 넣으면 안 된다:
 * 서버가 대댓글의 대댓글을 거부하므로 그건 보장된 막다른 길이다. 화면이 소유권(`isMine`)과
 * 깊이를 보고 항목을 정한다(§3.5). 행이 그리는 `답글쓰기` 링크도 같은 규칙으로,
 * **`onPressReply` 를 안 주면 아예 안 그려진다** — 대댓글에서 이 링크는 형제 답글(같은
 * 부모)로 라우팅되어야 하고, 그 판단은 화면만 할 수 있다.
 */
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useTranslation } from "react-i18next"

import { V2Divider } from "@/src/design-system-v2/components/V2Divider"
import { V2Icon } from "@/src/design-system-v2/components/V2Icon"
import { V2Text } from "@/src/design-system-v2/components/V2Text"
import { useV2Theme } from "@/src/design-system-v2/hooks/useV2Theme"
import { touchTarget } from "@/src/design-system-v2/tokens/size"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import { typography } from "@/src/design-system-v2/tokens/typography"

import { formatCount } from "../../utils/displayNumber"
import { COMMUNITY_GUTTER, ROW } from "./communityLayout"
import { MicroPill } from "./MicroPill"

/**
 * 행의 **세로 리듬 정본**. 합이 `ROW.commentRow`(98)이고, 본문이 한 줄 늘 때마다
 * `bodyLine`(16)씩 자란다. 머리말 §세로 리듬 참조.
 *
 * 세 줄 높이는 그 줄이 실제로 쓰는 **타이포 토큰의 `lineHeight`** 다. 숫자를 따로 적으면
 * 토큰이 바뀌었을 때 리듬만 옛 값으로 남는다.
 */
export const COMMENT_ROW_RHYTHM = {
  padTop: spacing[16],
  /** 이름 + `작성자` 배지 + `⋯` 가 공유하는 줄. 13 Medium. */
  nameLine: typography.label.xSmallWeak.lineHeight,
  nameToBody: spacing[8],
  /** 본문 한 줄. 줄이 늘면 이만큼씩 행이 자란다(§5.5 판정: 16). */
  bodyLine: typography.label.xSmallWeak.lineHeight,
  bodyToAction: spacing[12],
  /** `♥ N · 💬 N · 답글쓰기 · 날짜` 줄. 13 Regular(`subtext.medium`). */
  actionLine: typography.subtext.medium.lineHeight,
  padBottom: spacing[12],
} as const

/** `⋯` 아이콘 프레임. §2.8 "24 박스, 우측 인셋 20". */
const MORE_BOX = 24

/** 아이콘↔수치 2 (§2.8 도면 `♥16 ─2─ N`). */
const ICON_GAP = spacing[2]

/** 액션 그룹끼리 12. */
const ACTION_GAP = spacing[12]

export type CommentRowProps = {
  authorName: string
  /** 본문. 줄바꿈 제한 없음 — 한 줄 늘 때마다 행이 16 자란다. */
  body: string
  /**
   * 우측 정렬 시각. **절대 날짜**(`2026.07.28`)를 화면이 만들어 넘긴다 —
   * 어떤 시간 규칙인지는 화면이 안다(`MetaRow` 와 같은 계약).
   */
  timeText: string
  likeCount: number
  /** 이 댓글에 달린 답글 수. **0 도 그린다**(§2.8). */
  replyCount: number
  /** 좋아요 눌림. 하트 **모양은 안 바뀌고 색만** `status.negative` 가 된다(§3.11). */
  liked?: boolean
  /**
   * 글쓴이 배지의 라벨(§2.8 `작성자`, `MicroPill face="brandWeak"` 40×21).
   * 안 주면 배지가 없다.
   *
   * ⚠ 문자열을 받는 이유: 이 라벨의 i18n 키가 아직 없다(추가는 WBS 2.21 일괄).
   * 없는 키로 `t()` 를 부르면 화면에 키가 그대로 찍히고 `tests/i18nKeyExistence.test.ts`
   * 가 깨진다. 키가 생기면 이 프롭을 지우고 여기서 `t()` 를 부른다.
   */
  authorBadge?: string
  /** 대댓글 변형 — 좌 들여쓰기 12 + `fill.alternative` 면(§2.8). */
  isReply?: boolean
  /**
   * 삭제된 댓글(§6.3-21 보존). 본문이 안내 문구로 바뀌고 **배지·액션줄·`⋯` 가 사라진다** —
   * 남은 자리에 좋아요·답글을 그리면 없는 것을 누르게 된다.
   */
  isDeleted?: boolean
  onPressLike?: () => void
  /** 안 주면 `답글쓰기` 를 **안 그린다**(머리말 §⋯ 메뉴). */
  onPressReply?: () => void
  /** 안 주면 `⋯` 를 안 그린다(내 댓글이 아닌데 신고도 못 하는 화면 등). */
  onPressMore?: () => void
  style?: StyleProp<ViewStyle>
}

export function CommentRow({
  authorName,
  body,
  timeText,
  likeCount,
  replyCount,
  liked = false,
  authorBadge,
  isReply = false,
  isDeleted = false,
  onPressLike,
  onPressReply,
  onPressMore,
  style,
}: CommentRowProps) {
  const { colors } = useV2Theme()
  const { t, i18n } = useTranslation()
  const language = i18n.language

  const showActions = !isDeleted

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isReply
            ? colors.fill.alternative
            : colors.background.default,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          isReply && { paddingLeft: COMMUNITY_GUTTER + ROW.commentReplyIndent },
        ]}
      >
        <View style={styles.nameLine}>
          <V2Text
            token="label.xSmallWeak"
            color={colors.label.neutral}
            numberOfLines={1}
            style={styles.name}
          >
            {authorName}
          </V2Text>

          {authorBadge && !isDeleted ? (
            <MicroPill face="brandWeak" label={authorBadge} />
          ) : null}

          {onPressMore && !isDeleted ? (
            <Pressable
              onPress={onPressMore}
              // 24 박스 + 사방 10 = 44. 손끝 최소치를 그리는 크기 대신 히트영역으로 채운다.
              hitSlop={(touchTarget.min - MORE_BOX) / 2}
              accessibilityRole="button"
              accessibilityLabel={t("community.postDetail.commentMore")}
              style={styles.more}
            >
              <V2Icon
                name="more"
                size={MORE_BOX}
                color={colors.label.neutral}
              />
            </Pressable>
          ) : null}
        </View>

        <V2Text
          token="label.xSmallWeak"
          color={isDeleted ? colors.label.neutral : colors.label.normal}
          style={styles.body}
          textBreakStrategy="balanced"
        >
          {isDeleted ? t("community.postDetail.deletedComment") : body}
        </V2Text>

        {showActions ? (
          <View style={styles.actionLine}>
            {renderStat({
              icon: "heartFilled",
              iconColor: liked ? colors.status.negative : colors.label.neutral,
              textColor: colors.label.neutral,
              value: formatCount(likeCount, language),
              label: t("community.postDetail.likeCount", { count: likeCount }),
              selected: liked,
              onPress: onPressLike,
            })}

            {renderStat({
              icon: "chatOutline",
              iconColor: colors.label.neutral,
              textColor: colors.label.neutral,
              value: formatCount(replyCount, language),
              label: t("community.postDetail.commentCount", {
                count: replyCount,
              }),
            })}

            {onPressReply ? (
              <Pressable
                onPress={onPressReply}
                hitSlop={spacing[8]}
                accessibilityRole="button"
                accessibilityLabel={t("community.postDetail.reply")}
              >
                <V2Text token="subtext.medium" color={colors.label.neutral}>
                  {t("community.postDetail.reply")}
                </V2Text>
              </Pressable>
            ) : null}

            <V2Text
              token="subtext.medium"
              color={colors.label.neutral}
              numberOfLines={1}
              style={styles.time}
            >
              {timeText}
            </V2Text>
          </View>
        ) : null}
      </View>

      {/* 모든 행(마지막 포함)에 있다 — §2.8. 인셋 0(안쪽 View 가 패딩을 갖는 이유). */}
      <V2Divider tone="alternative" style={styles.divider} />
    </View>
  )
}

/**
 * `♥16 ─2─ N` 한 덩어리. 누를 수 있으면 그 덩어리 전체가 히트영역이다.
 *
 * **컴포넌트가 아니라 부르는 함수다.** 컴포넌트로 두면 트리에 자기 이름의 노드가 하나
 * 끼어들어, 렌더러 없이 트리를 읽는 이 저장소의 테스트가 그 안(아이콘 색·수치)을 못 본다
 * — 하트가 눌림 색을 잃어도 초록이 되는 종류의 구멍이다(`V2Tab.renderItem` 과 같은 관용구).
 */
function renderStat({
  icon,
  iconColor,
  textColor,
  value,
  label,
  selected,
  onPress,
}: {
  icon: "heartFilled" | "chatOutline"
  iconColor: string
  textColor: string
  value: string
  label: string
  selected?: boolean
  onPress?: () => void
}) {
  const content = (
    <>
      <V2Icon name={icon} size="xs" color={iconColor} />
      <V2Text token="subtext.medium" color={textColor}>
        {value}
      </V2Text>
    </>
  )

  if (!onPress) {
    return (
      <View style={styles.stat} accessibilityLabel={label}>
        {content}
      </View>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={spacing[8]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={styles.stat}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  /** 면과 구분선은 full-bleed. 높이는 내용이 정한다(본문 줄당 +16). */
  row: { position: "relative" },
  inner: {
    paddingTop: COMMENT_ROW_RHYTHM.padTop,
    paddingBottom: COMMENT_ROW_RHYTHM.padBottom,
    paddingHorizontal: COMMUNITY_GUTTER,
  },
  /** 높이를 박는다 — 배지 21·⋯ 24 는 이 줄 밖으로 삐져나온다(머리말 §이름줄). */
  nameLine: {
    height: COMMENT_ROW_RHYTHM.nameLine,
    flexDirection: "row",
    alignItems: "center",
    // 이름 ↔ `작성자` 배지 8 (§2.8).
    gap: spacing[8],
  },
  /** 긴 닉네임이 배지를 밀어내지 않게. */
  name: { flexShrink: 1 },
  /** `⋯` 는 줄 오른쪽 끝 = 우측 인셋 20(안쪽 패딩이 그 20 이다). */
  more: { marginLeft: "auto" },
  body: { marginTop: COMMENT_ROW_RHYTHM.nameToBody },
  actionLine: {
    height: COMMENT_ROW_RHYTHM.actionLine,
    marginTop: COMMENT_ROW_RHYTHM.bodyToAction,
    flexDirection: "row",
    alignItems: "center",
    gap: ACTION_GAP,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: ICON_GAP,
  },
  /** 날짜는 실제 컬럼 우변에 붙는다(`MetaRow` 와 같은 규칙). */
  time: { marginLeft: "auto" },
  divider: { position: "absolute", left: 0, right: 0, bottom: 0 },
})
