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

import { ITEM_GAP, ROW_ICON_GAP } from "../../layout"
import { useRestaurantHours } from "../../hooks/useRestaurantHours"
import type { RestaurantDetailDto, TodayHoursDto } from "../../types"
import { AddressBlock } from "../AddressBlock"
import { BusinessStatusText } from "../BusinessStatusText"

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
                void Linking.openURL(`tel:${detail.phone}`)
              }}
              accessibilityRole="link"
              accessibilityState={{ disabled: false }}
              accessibilityLabel={t("restaurant.detail.call")}
              hitSlop={spacing[8]}
              style={({ pressed }) => [pressed && styles.pressedText]}
            >
              <Text
                style={[
                  typography.subtext.large,
                  styles.link,
                  { color: colors.label.normal },
                ]}
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
      hitSlop={spacing[8]}
      style={({ pressed }) => [pressed && styles.pressedText]}
    >
      <Text
        style={[
          typography.subtext.medium,
          styles.link,
          { color: colors.primary.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function ExternalLink({ label, url }: { label: string; url: string }) {
  const { colors } = useV2Theme()
  return (
    <Pressable
      onPress={() => {
        void Linking.openURL(url)
      }}
      accessibilityRole="link"
      accessibilityState={{ disabled: false }}
      accessibilityLabel={label}
      hitSlop={spacing[8]}
      style={({ pressed }) => [pressed && styles.pressedText]}
    >
      <Text
        style={[
          typography.subtext.large,
          styles.link,
          { color: colors.label.normal },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { gap: ITEM_GAP },
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
