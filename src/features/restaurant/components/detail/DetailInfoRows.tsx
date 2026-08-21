/**
 * 상세 홈 탭 맨 위의 정보 요약 (목업 -9 / 확장 상태 -10).
 *
 * ```
 * 🕐  영업중  21:30까지
 * 📍  서울 강남구 선릉로86길 4-4 1층  복사              ⌄
 *       [지번] 대치동 889-65  복사
 *       [우편번호] 06192  복사
 * 📞  00-000-0000  복사
 * 🔗  인스타그램  블로그
 * ```
 *
 * ## 영업시간은 서버가 판정한 `today` 한 덩어리를 그대로 쓴다
 *
 * 요일을 기기 시계로 뽑으면 시간대가 틀어진 사용자에게 엉뚱한 마감 시각이 뜬다.
 * 서버가 KST 고정으로 판정해 `today`(상태 + 오늘의 시각들 + 다음 전환)를 주고,
 * `/:id` 와 `/:id/hours` 가 **같은 계산 결과**를 준다. 그래서 요일별 표에서 오늘을
 * 다시 찾지 않는다 — 예전 코드가 `hours.find(h => h.weekday === today)` 로 그걸
 * 하려다 `today` 가 객체인 것을 몰라 항상 못 찾았고, 그 결과 마감 시각이 영원히 비었다.
 * `/hours` 가 아직 안 왔으면 상세가 최상위에 펼쳐 준 같은 필드로 같은 모양을 만든다
 * (`todayFromDetail`) — 값의 출처가 둘이어도 **모양과 뜻은 하나**여야 한다.
 *
 * `nextOpenWeekday`/`nextOpenTime` 을 반드시 함께 넘긴다. `DAY_OFF` 일 때
 * `수요일 11:00 오픈` 을 그릴 수 있는 유일한 근거이고, 빠뜨리면 휴무일이
 * 보조 문구 없는 맨 `휴무일` 로만 보인다.
 *
 * ## 전화번호를 링크로만 두지 않는다
 *
 * `tel:` 은 태블릿·시뮬레이터에서 열리지 않는다. 그래서 `복사` 를 나란히 둔다.
 * 프로토타입은 네 곳의 `복사` 를 링크처럼 꾸며 놓고 클립보드 호출이 없었다 —
 * 여기서는 실제로 복사하고 토스트로 확인해 준다.
 */

import { useMemo, useState } from "react"
import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import * as Clipboard from "expo-clipboard"
import { useTranslation } from "react-i18next"

import {
  iconSize,
  spacing,
  typography,
  useV2Theme,
  V2Icon,
} from "@/src/design-system-v2"
import { showSuccessToast } from "@/src/lib/toast"
import { normalizeHttpsUrl, phoneUrl } from "@/src/shared/utils/externalUrl"

import { ROW_ICON, ROW_ICON_GAP } from "../../layout"
import { useRestaurantHours } from "../../hooks/useRestaurantHours"
import type { RestaurantDetailDto, TodayHoursDto } from "../../types"
import { AddressBlock } from "../AddressBlock"
import { BusinessStatusText } from "../BusinessStatusText"

/**
 * 행 본문의 타이포. 시안(C1_2) 3배 렌더에서 네 행 전부 **13pt** 다 — 한글 음절 이송이
 * `서울/강남구/선릉로86길`(주소) 33.6px · `까지`(영업시간) 34px 이고, 0.864em 으로 나누면
 * 12.96 · 13.1 이다(15 였다면 38.9px 여야 한다). 숫자만 있는 전화번호도 잉크 높이 28px 로
 * 같은 값이다. 앞 판본의 `subtext.large`(15/20)는 두 단계 위였다.
 */
const ROW_TEXT = typography.subtext.medium

/**
 * 정보 행의 세로 피치. 아이콘 상자(`ROW_ICON` 20) + 행 간격(`ROW_ICON_GAP` 8) = **28**,
 * 시안 실측값이다(주소→전화 28.0 · 전화→링크 28.0).
 */
const ROW_PITCH = ROW_ICON + ROW_ICON_GAP

/**
 * 행 안 텍스트 링크의 hitSlop. **세로만 좁다.**
 *
 * 텍스트 링크는 글리프 높이(13pt 본문 = 18)만큼만 차지해서 손끝 최소치 44 에 못 미친다.
 * 그래서 오랫동안 사방 `spacing[8]` 로 메웠는데, 행 간격이 `ITEM_GAP`(16, 피치 36)에서
 * `spacing[8]`(피치 28)로 반 줄면서 **위아래 행의 슬롭이 서로 겹치게 됐다** —
 * 18 + 8×2 = 34 > 28. 겹친 구간의 승자는 z-order 상 뒤에 그려지는 아래 행이라, 위 행
 * 바로 밑을 겨눈 탭이 아래 행 동작을 실행한다(주소 밑을 누르면 전화가 걸린다).
 *
 * 피치 28 은 시안이 정한 값이라 손대지 않는다. 대신 세로 슬롭을 `(피치 − 글리프) / 2`
 * 로 잡아 두 행의 슬롭이 정확히 맞닿기만 하게 한다: (28 − 18) / 2 = **5**. 가로는 옆
 * 행이 없으므로 그대로 8 이다.
 *
 * 세로 44 를 포기한 것이 아니라, **44 를 채우려다 옆 것을 훔치는 상태**를 그만둔 것이다.
 * 44 가 꼭 필요하면 글리프 상자를 키워야지 슬롭을 더 벌려서 될 일이 아니다.
 */
const ROW_VERTICAL_HIT_SLOP = (ROW_PITCH - ROW_TEXT.lineHeight) / 2
const ROW_HIT_SLOP = {
  top: ROW_VERTICAL_HIT_SLOP,
  bottom: ROW_VERTICAL_HIT_SLOP,
  left: spacing[8],
  right: spacing[8],
} as const

export interface DetailInfoRowsProps {
  restaurantId: number
  detail: RestaurantDetailDto
}

/**
 * 상태 줄이 필요한 필드만. **요일은 들어 있지 않다** — `BusinessStatusText` 는 요일을
 * 쓰지 않으므로(`DAY_OFF` 의 보조 문구도 `nextOpenWeekday` 로 만든다) 폴백을 만들 때
 * 요일을 억지로 알아낼 이유가 없다. `/:id` 와 `/:id/hours` 의 `today` 가 **이 부분집합에서
 * 키 이름이 완전히 같다**는 것이 요점이고, 그래서 두 출처를 한 자리에 꽂을 수 있다.
 */
type StatusFields = Omit<TodayHoursDto, "weekday">

export function DetailInfoRows({ restaurantId, detail }: DetailInfoRowsProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const [addressExpanded, setAddressExpanded] = useState(false)

  const { today: todayFromHours } = useRestaurantHours(restaurantId)

  // `/hours` 가 오면 그쪽을 쓴다(같은 계산이지만 더 신선하다). 아직이면 상세가 최상위에
  // 펼쳐 준 같은 필드로 그린다 — 모르는 시각을 추측해 채우는 분기는 없다.
  const status = useMemo<StatusFields>(
    () => todayFromHours ?? detail,
    [todayFromHours, detail],
  )

  const copy = async (value: string, message: string) => {
    await Clipboard.setStringAsync(value)
    showSuccessToast(message)
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <V2Icon name="clock" size={iconSize.sm} color={colors.label.neutral} />
        <BusinessStatusText
          status={status.businessStatus}
          closingTime={status.closeTime}
          openingTime={status.openTime}
          // 브레이크타임이 오늘의 다음 사건이면 마감 대신 그것을 말한다
          // (`영업중 · 15:00에 브레이크타임`). 판정은 서버의 `nextTransitionAt` 이 한다.
          breakStartTime={status.breakStart}
          breakEndTime={status.breakEnd}
          lastOrder={status.lastOrder}
          // 휴무일의 `수요일 11:00 오픈`. 예전에는 넘기지 않아 보조 문구가 없었다.
          nextOpenWeekday={status.nextOpenWeekday}
          nextOpenTime={status.nextOpenTime}
          nextTransitionAt={status.nextTransitionAt}
          style={styles.rowBody}
        />
      </View>

      {detail.address && (
        <View style={styles.row}>
          <V2Icon
            name="mapPin"
            size={iconSize.sm}
            color={colors.label.neutral}
          />
          <AddressBlock
            roadAddress={detail.address}
            jibunAddress={detail.jibunAddress}
            zipcode={detail.zipcode}
            expanded={addressExpanded}
            onToggleExpanded={() => setAddressExpanded((prev) => !prev)}
            style={styles.rowBody}
          />
        </View>
      )}

      {detail.phone && (
        <View style={styles.row}>
          <V2Icon
            name="phone"
            size={iconSize.sm}
            color={colors.label.neutral}
          />
          <View style={[styles.rowBody, styles.inlineRow]}>
            <Pressable
              onPress={() => {
                const target = phoneUrl(detail.phone as string)
                if (target) void Linking.openURL(target)
              }}
              accessibilityRole="link"
              accessibilityState={{ disabled: false }}
              accessibilityLabel={t("restaurant.detail.call")}
              hitSlop={ROW_HIT_SLOP}
              style={({ pressed }) => [pressed && styles.pressedText]}
            >
              <Text
                style={[ROW_TEXT, styles.link, { color: colors.label.normal }]}
              >
                {detail.phone}
              </Text>
            </Pressable>
            <CopyButton
              label={t("restaurant.address.copy")}
              onPress={() => {
                void copy(
                  detail.phone as string,
                  t("restaurant.address.phoneCopied"),
                )
              }}
            />
          </View>
        </View>
      )}

      {(detail.instagramUrl || detail.blogUrl) && (
        <View style={styles.row}>
          <V2Icon name="link" size={iconSize.sm} color={colors.label.neutral} />
          <View style={[styles.rowBody, styles.inlineRow]}>
            {detail.instagramUrl && (
              <ExternalLink
                label={t("restaurant.sns.instagram")}
                url={detail.instagramUrl}
              />
            )}
            {detail.blogUrl && (
              <ExternalLink
                label={t("restaurant.sns.blog")}
                url={detail.blogUrl}
              />
            )}
          </View>
        </View>
      )}
    </View>
  )
}

/** `복사` 텍스트 버튼. 밑줄 + 브랜드색으로 "누를 수 있다" 를 색이 아니라 형태로도 말한다. */
function CopyButton({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  const { colors } = useV2Theme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      accessibilityLabel={label}
      hitSlop={ROW_HIT_SLOP}
      style={({ pressed }) => [pressed && styles.pressedText]}
    >
      <Text style={[ROW_TEXT, styles.link, { color: colors.primary.primary }]}>
        {label}
      </Text>
    </Pressable>
  )
}

function ExternalLink({ label, url }: { label: string; url: string }) {
  const { colors } = useV2Theme()
  const target = normalizeHttpsUrl(url)
  return (
    <Pressable
      onPress={() => {
        if (target) void Linking.openURL(target)
      }}
      accessibilityRole="link"
      accessibilityState={{ disabled: !target }}
      disabled={!target}
      accessibilityLabel={label}
      hitSlop={ROW_HIT_SLOP}
      style={({ pressed }) => [pressed && styles.pressedText]}
    >
      <Text style={[ROW_TEXT, styles.link, { color: colors.label.normal }]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  /*
    행 사이 8. 시안(C1_2) 3배 렌더에서 아이콘 잉크의 세로 중심을 재면 행 피치가
    **28.0pt** 로 일정하다(주소→전화 28.0 · 전화→링크 28.0). 행 높이를 정하는 것은
    둘 중 큰 쪽인 아이콘 상자(`iconSize.sm` 20)이고(본문 `ROW_TEXT` 는 18),
    20 + 8 = 28 이 그 값이다. 이 피치가 `ROW_HIT_SLOP` 의 세로 한도를 정한다.

    앞 판본은 `ITEM_GAP`(16, 목록 항목 간격)을 썼다 — 피치 36 이라 네 줄이 한 문단이
    아니라 네 개의 항목처럼 흩어졌다. 카드 면이 사라진 지금은 이 간격이 "이 넷은 한
    덩어리" 를 말하는 유일한 장치이므로 항목 간격이 아니라 문단 행간을 쓴다.
  */
  container: { gap: spacing[8] },
  /*
    아이콘은 첫 줄에 맞춘다 — 주소가 세 줄로 늘어나도 아이콘이 가운데로 떠내려가지 않게.

    간격이 `ROW_ICON_GAP` 인 것이 중요하다. 여기가 12 였을 때 이 네 줄의 텍스트만
    x=48 에서 시작해, x=44 에서 시작하는 다른 아이콘 행(주차·SNS)과 **본문 시작선이
    둘로 갈라졌다**. 두 번째 시작선은 `TEXT_INDENT` 하나여야 한다(layout.ts 머리말).
  */
  row: { flexDirection: "row", alignItems: "flex-start", gap: ROW_ICON_GAP },
  rowBody: { flex: 1 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  link: { textDecorationLine: "underline" },
  // 텍스트 링크는 행이 아니라 버튼이라 0.6 이 아니라 0.85 를 쓴다.
  pressedText: { opacity: 0.85 },
})
