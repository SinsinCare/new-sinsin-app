/**
 * 데이터 공유 설정 — "이 의사에게 무엇을 열지" 를 받는 화면.
 *
 * 연결(승인)과 공유 범위는 별개다. 승인은 접근의 전제일 뿐이고 무엇이 열리는지는
 * 여기서 켠 토글이 정한다. 그래서 승인 전에는 토글을 아예 잠근다 — 서버도 같은
 * 이유로 409 를 준다(`doctorLinkService.updateSharing` 주석). 눌러 보고 실패하는
 * 것보다 처음부터 잠긴 채로 이유를 말하는 편이 낫다.
 */

import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Toast from "react-native-toast-message"

import { presentError, resolveError } from "@/src/lib/errorMessage"

import {
  V2BottomCTA,
  V2ErrorState,
  V2LoadingState,
  V2ScreenHeader,
  spacing,
  typography,
  useLoadingVisible,
  useV2Theme,
  type V2IconName,
} from "@/src/design-system-v2"
import { doctorLinkService } from "@/src/services/data/doctorLinkService"
import {
  SHARE_CONSENT_VERSION,
  SHARE_SCOPE_KEYS,
  type DoctorCard,
  type DoctorConnectionStatus,
  type ShareGrant,
  type ShareScopeKey,
} from "@/src/types/doctorLink"

import { doctorLinkKeys, sharingQuery } from "../data/doctorLinkQueries"
import { DoctorBrandCard } from "../components/DoctorCards"
import {
  SharingNoticeItem,
  SharingToggleRow,
} from "../components/SharingToggleRow"

/**
 * 화면의 세 줄과 서버 필드·아이콘·문구를 잇는 유일한 표.
 * `as const` 를 붙여야 i18n 키가 리터럴로 남아 t() 의 키 타입 검사를 통과한다.
 */
const SCOPE_ROWS = {
  examResults: {
    icon: "tube",
    titleKey: "doctorLink.sharing.examResultsTitle",
    bodyKey: "doctorLink.sharing.examResultsBody",
  },
  dietRecords: {
    icon: "fork",
    titleKey: "doctorLink.sharing.dietRecordsTitle",
    bodyKey: "doctorLink.sharing.dietRecordsBody",
  },
  vitals: {
    icon: "health",
    titleKey: "doctorLink.sharing.vitalsTitle",
    bodyKey: "doctorLink.sharing.vitalsBody",
  },
} as const satisfies Record<
  ShareScopeKey,
  { icon: V2IconName; titleKey: string; bodyKey: string }
>

/** 화면이 들고 있는 값 — `ShareGrant` 에서 읽기 전용 시각 칸을 뺀 네 개의 불리언. */
type SharingDraft = Pick<
  ShareGrant,
  "examResults" | "dietRecords" | "vitals" | "realtime"
>

function toDraft(grant: ShareGrant): SharingDraft {
  return {
    examResults: grant.examResults,
    dietRecords: grant.dietRecords,
    vitals: grant.vitals,
    realtime: grant.realtime,
  }
}

export function DataSharingScreen({
  connectionId,
  doctor,
  status,
  onAnalyze,
  onSaved,
  onBack,
}: {
  connectionId: string
  doctor: DoctorCard | null
  /** 연결 상태. APPROVED 가 아니면 서버가 저장을 거부하므로 토글을 잠근다. */
  status: DoctorConnectionStatus
  onAnalyze?: () => void
  onSaved?: () => void
  onBack?: () => void
}) {
  const { t } = useTranslation(["settings", "common"])
  const { colors } = useV2Theme()
  const queryClient = useQueryClient()

  const sharing = useQuery(sharingQuery(connectionId))

  /**
   * 서버 값을 로컬로 복사한다. 토글은 왕복을 기다리지 않고 즉시 움직여야 하고,
   * "공유하기" 를 누르기 전까지는 아무것도 열리지 않아야 하기 때문이다.
   *
   * `sharing.data` 참조가 바뀔 때만 다시 심는다 — React Query 의 구조적 공유 덕분에
   * 내용이 같은 재요청은 참조가 그대로라 사용자가 만지던 값이 지워지지 않는다.
   * 반대로 저장 후 무효화처럼 내용이 실제로 달라지면 새 값으로 갈아탄다.
   */
  const [draft, setDraft] = useState<SharingDraft | null>(null)
  useEffect(() => {
    if (sharing.data) setDraft(toDraft(sharing.data))
  }, [sharing.data])

  const save = useMutation({
    mutationFn: (next: SharingDraft) =>
      doctorLinkService.updateSharing(connectionId, {
        ...next,
        consentVersion: SHARE_CONSENT_VERSION,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: doctorLinkKeys.sharing(connectionId),
        }),
        // 목록 카드가 각 연결의 sharing 을 함께 들고 있어 같이 상해야 한다.
        queryClient.invalidateQueries({
          queryKey: doctorLinkKeys.connections(),
        }),
      ])
      Toast.show({ type: "success", text1: t("doctorLink.sharing.saved") })
      onSaved?.()
    },
    onError: (error, next) => {
      // 승인 전 연결은 서버가 `DOCTOR_ERROR_004` 로 막는다 — "연결이 승인된 뒤에
      // 공유를 설정할 수 있어요" 가 화면의 고정 문구보다 정확하다.
      presentError(error, {
        scope: "doctor-sharing-save",
        retry: () => save.mutate(next),
      })
    },
  })

  const canEdit = status === "APPROVED"
  const showLoading = useLoadingVisible(sharing.isLoading, {
    surface: "doctor_sharing",
  })
  const sharingFailure = sharing.isError ? resolveError(sharing.error) : null

  const setField = (key: keyof SharingDraft) => (next: boolean) => {
    setDraft((prev) => (prev ? { ...prev, [key]: next } : prev))
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader title={t("doctorLink.sharing.title")} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <DoctorBrandCard doctor={doctor} />

        {/* `common:state.error`("문제가 생겼어요") 한 줄이던 자리. 공유 설정을 못 읽는
            이유는 연결이 해지됐거나(`DOCTOR_ERROR_003`) 세션이 끊긴 쪽이 대부분이고,
            둘 다 여기서 다시 부른다고 풀리지 않는다. */}
        {sharingFailure ? (
          sharingFailure.retryable ? (
            <V2ErrorState
              surface="doctor_sharing"
              title={sharingFailure.title}
              description={sharingFailure.body}
              onRetry={() => void sharing.refetch()}
              retryLabel={t("common:action.retry")}
              style={styles.state}
            />
          ) : (
            <V2ErrorState
              surface="doctor_sharing"
              title={sharingFailure.title}
              description={sharingFailure.body}
              style={styles.state}
            />
          )
        ) : draft == null ? (
          showLoading ? (
            <V2LoadingState style={styles.state} />
          ) : null
        ) : (
          <>
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.label.normal }]}
              >
                {t("doctorLink.sharing.sectionTitle")}
              </Text>

              {!canEdit && (
                <Text
                  style={[styles.pending, { color: colors.label.alternative }]}
                >
                  {/*
                   * 상태마다 다른 이유를 말한다. 예전에는 전부 "승인 대기 중이에요" 였는데,
                   * 거절되거나 해지된 연결에까지 그 문장을 보여 주면 화면이 거짓말을 한다 —
                   * 사용자는 기다리면 열린다고 믿고 계속 기다리게 된다.
                   */}
                  {status === "REJECTED"
                    ? t("doctorLink.sharing.rejectedNotice")
                    : status === "REVOKED"
                      ? t("doctorLink.sharing.revokedNotice")
                      : t("doctorLink.sharing.pendingNotice")}
                </Text>
              )}

              <View style={styles.rows}>
                {SHARE_SCOPE_KEYS.map((key) => {
                  const row = SCOPE_ROWS[key]
                  return (
                    <SharingToggleRow
                      key={key}
                      icon={row.icon}
                      title={t(row.titleKey)}
                      body={t(row.bodyKey)}
                      value={draft[key]}
                      onValueChange={setField(key)}
                      disabled={!canEdit}
                    />
                  )
                })}
              </View>
            </View>

            {/*
             * 실시간 전송 토글.
             * 사실대로 적어 둔다: 오늘 서버에는 의사를 향한 실시간 전송 채널이 없다
             * (WebSocket·SSE·푸시 어느 것도 없음). 그래서 이 값을 켜도 지금 당장
             * 무언가 전송되지는 않는다. 서버는 이 값을 저장만 하고, 이것은 채널이
             * 생겼을 때 무엇을 보낼지에 대한 **의도의 기록**으로 남는다.
             * 채널이 생기기 전까지 문구를 "전송되고 있다" 로 바꾸면 거짓말이 된다.
             */}
            <SharingToggleRow
              tone="highlight"
              icon="letter"
              title={t("doctorLink.sharing.realtimeTitle")}
              body={t("doctorLink.sharing.realtimeBody")}
              value={draft.realtime}
              onValueChange={setField("realtime")}
              disabled={!canEdit}
            />

            {/* 연결 확인 화면과 같은 두 문장. 동의의 근거라 두 화면에서 글자가 달라지면 안 된다. */}
            <View style={styles.notices}>
              <SharingNoticeItem text={t("doctorLink.preview.noticePurpose")} />
              <SharingNoticeItem text={t("doctorLink.preview.noticeRevoke")} />
            </View>
          </>
        )}
      </ScrollView>

      <V2BottomCTA
        layout="horizontal"
        secondaryLabel={t("doctorLink.sharing.analyze")}
        onSecondary={() => onAnalyze?.()}
        primaryLabel={t("doctorLink.sharing.submit")}
        onPrimary={() => {
          if (draft) save.mutate(draft)
        }}
        primaryProps={{
          loading: save.isPending,
          disabled: draft == null || !canEdit,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    paddingBottom: spacing[32],
    gap: spacing[24],
  },
  state: {
    paddingVertical: spacing[32],
  },
  section: {
    gap: spacing[16],
  },
  sectionTitle: {
    ...typography.title.xSmall,
  },
  pending: {
    ...typography.subtext.medium,
  },
  rows: {
    gap: spacing[24],
  },
  notices: {
    gap: spacing[12],
  },
})
