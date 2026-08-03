/**
 * 연결 확인 — 고른 의사에게 연결을 **요청**하는 마지막 자리.
 *
 * 여기서 나가는 건 승인이 아니라 요청(PENDING)이다. 공유 범위는 승인 뒤 별도 화면에서
 * 정한다(서버가 승인 전 범위 변경을 409 로 막는다). 그래서 이 화면의 안내 두 줄은
 * "무엇이 열리는가" 가 아니라 "열린 뒤에도 네가 닫을 수 있다" 를 말한다.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  V2BottomCTA,
  V2ScreenHeader,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { getErrorMessage } from "@/src/lib/errorUtils"
import { doctorLinkService } from "@/src/services/data/doctorLinkService"
import type { DoctorCard, DoctorConnection } from "@/src/types/doctorLink"

import { DoctorHeroCard } from "../components/DoctorCards"
import { doctorLinkKeys } from "../data/doctorLinkQueries"

const NOTICE_KEYS = ["noticePurpose", "noticeRevoke"] as const

export function DoctorPreviewScreen({
  doctor,
  onConnected,
  onBack,
}: {
  doctor: DoctorCard | null
  onConnected?: (connection: DoctorConnection) => void
  onBack?: () => void
}) {
  const { t } = useTranslation("settings")
  const { colors } = useV2Theme()
  const queryClient = useQueryClient()

  const connect = useMutation({
    mutationFn: (doctorId: string) =>
      doctorLinkService.requestConnection({ doctorId }),
    onSuccess: (connection) => {
      // 연결 목록은 이 요청으로 한 줄 늘었다. 목록 화면이 옛 캐시를 그대로 그리면
      // 방금 만든 요청이 없는 것처럼 보인다.
      void queryClient.invalidateQueries({
        queryKey: doctorLinkKeys.connections(),
      })
      onConnected?.(connection)
    },
  })

  const handleConnect = () => {
    // isPending 중에는 V2Button 이 이미 눌림을 막지만, 연타로 들어온 두 번째 탭이
    // 요청을 하나 더 만들면 서버에 중복 PENDING 이 남는다 — 여기서도 한 번 더 막는다.
    if (!doctor || connect.isPending) return
    connect.mutate(doctor.id)
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader title={t("doctorLink.preview.title")} onBack={onBack} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.title.small, { color: colors.label.normal }]}>
          {t("doctorLink.preview.headline")}
        </Text>

        <DoctorHeroCard doctor={doctor} />

        <View style={styles.notices}>
          {NOTICE_KEYS.map((key) => (
            // 가운뎃점을 문장 안에 넣지 않고 별도 <Text> 로 두는 이유: 둘째 줄부터가
            // 점 아래로 들어가지 않고 글자 시작선에 맞춰 걸린다(시안의 들여쓰기).
            <View key={key} style={styles.noticeRow}>
              <Text
                style={[
                  typography.subtext.medium,
                  { color: colors.label.alternative },
                ]}
              >
                {"·"}
              </Text>
              <Text
                style={[
                  typography.subtext.medium,
                  styles.noticeText,
                  { color: colors.label.alternative },
                ]}
              >
                {t(`doctorLink.preview.${key}`)}
              </Text>
            </View>
          ))}
        </View>

        {connect.isError && (
          <Text
            lineBreakStrategyIOS="hangul-word"
            textBreakStrategy="balanced"
            style={[
              typography.subtext.medium,
              { color: colors.status.negative },
            ]}
          >
            {/* 고정 문구 한 줄이던 자리. 이미 보낸 요청·해지된 연결처럼 CTA 를 다시
                눌러도 소용없는 실패가 여기로 오는데, 그걸 구분해 주지 않았다. */}
            {getErrorMessage(connect.error)}
          </Text>
        )}
      </ScrollView>

      <V2BottomCTA
        primaryLabel={t("doctorLink.preview.cta")}
        onPrimary={handleConnect}
        primaryProps={{
          disabled: !doctor,
          loading: connect.isPending,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[24],
    paddingBottom: spacing[24],
    gap: spacing[20],
  },
  notices: { gap: spacing[10] },
  noticeRow: {
    flexDirection: "row",
    gap: spacing[8],
    paddingHorizontal: spacing[8],
  },
  noticeText: { flex: 1 },
})
