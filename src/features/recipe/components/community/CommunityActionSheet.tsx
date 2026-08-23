/**
 * **액션 시트** — 게시글 `⋯`(수정·삭제·신고) · 댓글 `⋯` · 스토리 `⋯`(관심없음·신고하기).
 * 스펙: `docs/design/community-redesign/00-MASTER.md` §2.17 · §5.8
 * · 실측 `meal-169.md` §2.2 · 판정 `01-DECISIONS.md` **D3** · **D13**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ■ D3 — 파괴적/무거운 액션은 여기, 정렬 같은 선택은 `V2Menu`
 *
 * 오탭 비용이 큰 항목(삭제·신고·차단)을 손가락에서 먼 팝오버에 두지 않는다.
 * `SortDropdown` 이 그 반대편이다. 두 표면을 갈라 둔 것이 D3 의 전부이므로,
 * 여기에 "그냥 고르기" 를 넣거나 저기에 삭제를 넣는 순간 판정이 무의미해진다.
 *
 * ■ 강조는 **취소 CTA 하나뿐**이다 (§2.17 이 시안을 뒤집었다)
 *
 * 시안은 `삭제하기`(파괴적)를 중립 회색으로, `수정하기`를 브랜드 강조로 그렸다.
 * §2.17 판정: **파괴적 옵션을 강조하지 않고, 브랜드 강조는 화면당 1개(취소 CTA)만.**
 * 그래서 옵션은 전부 `selected={false}` 로 그린다 — `V2Option` 의 선택면(주황 테두리 +
 * `primary.primaryWeak`)을 여기서 쓰면 "고를 수 있는 값" 처럼 보이고, 실제로 시안에서
 * `관심없음` 이 그렇게 그려져 있었다(그 프레임이 오독의 출처다).
 * 옵션에 `destructive` 축을 아예 열지 않은 이유도 같다 — 축이 있으면 다음 사람이 쓴다.
 *
 * ■ 전폭 시트다 (§5.8)
 *
 * 시안은 좌우·하단 10 인셋 + 4모서리 r28 의 **떠 있는 카드**지만, 집안 규칙은
 * "바텀시트 한 계보"(정본 `V2BottomSheet`, 전폭·상단만 r28)다. 10px 플로팅을 위해
 * 계보를 포크하지 않는다. 그래버 48×4 · 상단 16 은 `V2BottomSheet` 기본값과 **정확히 일치**한다
 * (실측 카드 상단 16 → 그래버 4 → 24 = `handleArea` 의 16/4/24 그대로).
 *
 * ■ 옵션 높이 55 를 기대하지 말 것 (D13)
 *
 * §2.17 은 같은 칸에서 "높이 55" 와 "1px 테두리" 를 주장하는데 Yoga 는 테두리를
 * 레이아웃에 포함하므로 둘 다 참일 수 없다. `V2Option` 은 `16 + title.xSmall(23) + 16 + 1 + 1`
 * = **57** 이고 **DS 는 안 고친다**(D13). 옵션 사이 16 만 여기서 준다.
 *
 * ■ `V2BottomCTA fade` 로 위 36 이 사라진다
 *
 * 실측은 CTA 바로 위에 `white 0 → white 1` 36px 그라디언트다(옵션 목록이 CTA 밑으로
 * 지나감을 말한다). `V2BottomCTA` 의 `fade` 가 바로 그것이고, 끝점을 `"transparent"`
 * 가 아니라 **테마 배경색의 알파 0** 으로 잡아 다크에서도 회색 띠가 안 생긴다.
 *
 * ■ 고르면 닫는다 — 그 다음 모달은 소비처가 기다려야 한다
 *
 * `V2Menu` 와 같은 순서(`onSelect()` → `onClose()`)를 쓴다. 다만 이 시트의 항목들은
 * 대개 **다음 모달**(삭제 확인창·신고 화면)을 연다. iOS 는 이전 모달의 전이가 끝나기
 * 전의 present 를 조용히 거부하므로, 그런 항목은 `afterModalTransitions()` 를 거쳐야 한다
 * (`shared/components/appModalGate`). 시트가 대신 기다려 주지 않는 이유는, 무엇을 여는
 * 항목인지 아는 쪽이 소비처이기 때문이다.
 */
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"

import { V2BottomCTA } from "@/src/design-system-v2/components/V2BottomCTA"
import { V2BottomSheet } from "@/src/design-system-v2/components/V2BottomSheet"
import { V2Option } from "@/src/design-system-v2/components/V2Option"
import { SHEET_GUTTER } from "@/src/design-system-v2/tokens/layout"
import { spacing } from "@/src/design-system-v2/tokens/spacing"
import type { AnalyticsSurface } from "@/src/features/analytics"

/**
 * 항목 하나. **톤 축이 없다** — 파괴적이든 아니든 같은 면으로 그린다(머리말 §강조).
 */
export type CommunityAction = {
  /** React key 이자 항목 식별자. */
  key: string
  /** `t()` 로 만든 카피. */
  label: string
  onPress: () => void
}

export type CommunityActionSheetProps = {
  /** `V2BottomSheet` 가 `sheet_opened`/`sheet_dismissed` 를 이 표면으로 쏜다. */
  surface: AnalyticsSurface
  visible: boolean
  onClose: () => void
  /** 위에서부터 이 순서로. 소유권 분기(`isMine`)는 화면이 이미 끝낸 상태로 넘긴다(§5.11). */
  actions: CommunityAction[]
}

export function CommunityActionSheet({
  surface,
  visible,
  onClose,
  actions,
}: CommunityActionSheetProps) {
  const { t } = useTranslation()

  return (
    <V2BottomSheet
      surface={surface}
      visible={visible}
      onClose={onClose}
      footer={
        <V2BottomCTA
          fade
          primaryLabel={t("action.cancel")}
          onPrimary={onClose}
        />
      }
    >
      <View style={styles.options}>
        {actions.map((action) => (
          <V2Option
            key={action.key}
            // 화면당 브랜드 강조는 취소 CTA 하나뿐이다 — 머리말 §강조.
            selected={false}
            label={action.label}
            onPress={() => {
              action.onPress()
              onClose()
            }}
          />
        ))}
      </View>
    </V2BottomSheet>
  )
}

const styles = StyleSheet.create({
  /*
    `V2BottomSheet` 는 children 을 full-bleed 로 준다(제목·푸터에만 가로 패딩이 있다).
    시트 좌우 여백은 DS 값 24 를 그대로 쓴다(§0.2) — 실측은 떠 있는 카드 기준 10+16 = 26 이고,
    전폭 시트로 옮기면서 그 자리를 대신하는 것이 `SHEET_GUTTER` 다.
  */
  options: {
    paddingHorizontal: SHEET_GUTTER,
    gap: spacing[16],
  },
})
