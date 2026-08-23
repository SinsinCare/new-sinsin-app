/**
 * 상담 시트의 머리 — 가운데 제목 + 오른쪽 끝 ✕.
 *
 * ## 왜 `V2BottomSheet` 의 `title`/`showClose` 를 안 쓰나
 *
 * 표현할 수 없어서다(실측):
 *  - `title` 은 `typography.title.small`(20 Bold) **좌측 정렬** + `paddingHorizontal: 24`.
 *    시안은 **가운데 15 Bold** 다.
 *  - `showClose` 는 32pt 원형 `V2Button neutral/weak` 안의 `✕` 다. 시안은 **맨 글리프**이고
 *    주변이 전부 순백이다(원형 면 없음).
 *
 * 그래서 `layout="fill"` 시트는 헤더를 children 첫 블록으로 직접 그린다. 그 규약은
 * `V2BottomSheet` 의 `layout` prop 머리말이 이미 못 박아 두었다 — 여기서 새로 정하는 게 아니다.
 */

import { StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"

import { V2Box, V2Icon, V2Text, useV2Theme } from "@/src/design-system-v2"
import { fontFamily, spacing } from "@/src/design-system-v2/tokens"

/**
 * ✕ 글리프 상자 28.
 *
 * 시안 실측 잉크는 15.33×15.33 이다. `icon-close.svg` 는 24 뷰박스 안에서 6.5→17.5 를 굵기 2
 * 둥근 끝으로 긋는다 → 잉크가 13/24. 15.33 을 얻으려면 상자가 13×(28/24)=15.17 인 **28** 이다.
 * `iconSize.lg` 와 같은 값이라 새로 만든 숫자가 아니다.
 */
const CLOSE_BOX = 28

/**
 * ✕ 상자의 오른쪽 여백 8.
 *
 * 시안은 **잉크** 오른쪽 끝이 화면 우단에서 14.3 이다. 위 글리프는 상자 안에 좌우로
 * 5.5×(28/24)=6.4 씩 여백을 갖고 있으므로, 상자를 8 에 두어야 잉크가 14.4 에 온다.
 * 시트 거터(20·24)와 다른 것은 그 때문이지 실수가 아니다.
 */
const CLOSE_INSET = spacing[8]

/** 제목 줄상자. `label.small`(15/19)의 행간 그대로 — 헤더는 한 줄이다. */
export const CONSULT_HEADER_HEIGHT = 20

/** 28pt 글리프를 44pt 터치 타겟으로 채운다 — 시각 크기는 시안대로 두고 손가락만 넓힌다. */
const CLOSE_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 }

/*
  ✕ 색: 시안 실측 rgb(71,72,76)(#47484c, 흰 배경 대비 9.1:1). **v2 에 그 값이 없다** —
  라벨 계열의 알파 램프(`#37383c` 82%/47%/29%)에 92% 짝이 없고, 없는 알파를 새로 고르는 것은
  이 디자인 시스템이 금지한 일이다(`tokens/blend.ts` 머리말: 색을 만들지 않는다).

  남는 후보는 둘뿐인데 밝기 차이가 거의 같다(L* 기준 시안 30.6):
  `label.normal` rgb(42,42,55)=15.4 / `label.neutral` rgb(108,109,112)=46.0 — 각각 15.2·15.4
  떨어져 있다. 그래서 대비로 갈랐다. 이 ✕ 는 시트를 닫는 **유일한** 컨트롤이라
  14.1:1 쪽(`label.normal`)에 둔다. 시안보다 어두운 것은 알고 있는 차이지 실수가 아니다.
*/

export function ConsultSheetHeader({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { colors } = useV2Theme()

  return (
    <V2Box style={styles.row}>
      {/*
        `AI` 도 검정이다. 홈탭 섹션 제목(`AI` 만 브랜드색)과 **일부러 다르다** — 홈탭에서는
        스크롤로 지나가며 눈에 걸려야 하고, 여기는 이미 들어온 화면이라 강조할 이유가 없다.
      */}
      <V2Text
        token="label.small"
        color={colors.label.strong}
        style={styles.title}
        numberOfLines={1}
      >
        {t("restaurant.consult.sheetTitle")}
      </V2Text>
      <V2Box
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("restaurant.consult.sheetClose")}
        hitSlop={CLOSE_HIT_SLOP}
        style={styles.close}
      >
        <V2Icon name="close" size={CLOSE_BOX} color={colors.label.normal} />
      </V2Box>
    </V2Box>
  )
}

const styles = StyleSheet.create({
  row: {
    height: CONSULT_HEADER_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    // 15 Bold 토큰이 없다(`label.small` 은 SemiBold 15/19). 크기·행간은 토큰에서 받고
    // face 만 Bold 로 올린다 — `fontWeight` 를 주면 이미 굵은 face 위에 합성 볼드가 얹힌다.
    fontFamily: fontFamily.bold,
    textAlign: "center",
  },
  close: {
    position: "absolute",
    right: CLOSE_INSET,
    // 상자(28)가 줄상자(20)보다 커서 위아래로 4씩 넘치지만, 넘치는 쪽은 핸들 여백과 빈 자리뿐이라
    // 아무것도 가리지 않는다. 세로 중심은 제목과 같다.
    top: (CONSULT_HEADER_HEIGHT - CLOSE_BOX) / 2,
    height: CLOSE_BOX,
    justifyContent: "center",
  },
})
