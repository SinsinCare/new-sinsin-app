/**
 * 연결된 기관 목록.
 *
 * ## 시안에 없는 것을 하나 넣었다 — 연결 해지
 * 공유 동의 문구가 이미 앱에 나가 있고 그 문구는 "사용자는 정보를 언제든지 공유를
 * 중단할 수 있어요" 라고 약속한다(`doctorLink.preview.noticeRevoke`). 그런데 그
 * 약속을 지킬 화면이 어디에도 없었다 — 서버에는 `DELETE /doctor/connections/:id` 가
 * 이미 있는데 부르는 자리가 없었다. 약속한 것을 못 하게 두는 편보다, 시안에 없는
 * 동작을 하나 더하는 편이 낫다고 판단했다.
 *
 * 어디에 두었나: **줄을 길게 누르면** 확인 다이얼로그가 뜬다. trailing 슬롯을 쓰지
 * 않은 이유는 그 자리가 이미 상태를 말하고 있기 때문이다 — 승인된 줄은 chevron,
 * 대기·거절은 배지. 여기에 해지 버튼까지 넣으면 줄마다 세 가지가 겹쳐 시안이 지키던
 * 밀도가 무너진다. 파괴적 동작을 목록에서 롱프레스로 감추는 건 흔한 절충이지만
 * 발견성이 낮은 것도 사실이라, 상세(공유 설정) 쪽에도 같은 동작을 붙이는 게 다음 수순이다.
 *
 * `DoctorRow` 에 `onLongPress` 가 없어(다른 화면도 같은 컴포넌트를 쓰므로 시그니처를
 * 바꾸지 않았다) 바깥 `Pressable` 이 탭과 롱프레스를 모두 받는다. 안쪽 `DoctorRow` 는
 * `onPress` 를 비워 두면 스스로 disabled 가 되어 터치 responder 를 잡지 않는다.
 */

import { useState, type ReactNode } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  V2Badge,
  V2Button,
  V2EmptyState,
  V2ErrorState,
  V2LoadingState,
  V2Modal,
  V2ScreenHeader,
  spacing,
  typography,
  useLoadingVisible,
  useV2Theme,
} from "@/src/design-system-v2"
import { presentError, resolveError } from "@/src/lib/errorMessage"
import { doctorLinkService } from "@/src/services/data/doctorLinkService"
import type {
  DoctorConnection,
  DoctorConnectionStatus,
} from "@/src/types/doctorLink"

import {
  doctorConnectionsQuery,
  doctorLinkKeys,
} from "../data/doctorLinkQueries"
import { DoctorRow } from "../components/DoctorCards"

function ConnectionRow({
  connection,
  trailing,
  onOpen,
  onRequestRevoke,
}: {
  connection: DoctorConnection
  /**
   * 상태 배지. **undefined 여야** `DoctorRow` 가 chevron 으로 대체한다 —
   * 여기에 null 을 렌더하는 컴포넌트를 넘기면 (요소는 존재하므로) chevron 이 영영 안 나온다.
   */
  trailing?: ReactNode
  onOpen?: (connection: DoctorConnection) => void
  onRequestRevoke: (connection: DoctorConnection) => void
}) {
  // 의사 정보가 비어 있는 연결은 줄로 그릴 것이 없다(DoctorRow 도 null 을 돌려준다).
  if (!connection.doctor) return null

  // 이미 해지된 연결을 또 해지할 수는 없다.
  const revocable = connection.status !== "REVOKED"

  return (
    <Pressable
      onPress={() => onOpen?.(connection)}
      onLongPress={revocable ? () => onRequestRevoke(connection) : undefined}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      <DoctorRow doctor={connection.doctor} trailing={trailing} />
    </Pressable>
  )
}

export function ConnectedListScreen({
  onOpen,
  onAdd,
  onBack,
}: {
  onOpen?: (connection: DoctorConnection) => void
  onAdd?: () => void
  onBack?: () => void
}) {
  const { t } = useTranslation(["settings", "common"])
  const { colors } = useV2Theme()
  const queryClient = useQueryClient()

  const connections = useQuery(doctorConnectionsQuery())
  const showLoading = useLoadingVisible(connections.isLoading)

  /** 확인 다이얼로그가 붙잡고 있는 연결. null 이면 다이얼로그가 닫힌 상태. */
  const [pendingRevoke, setPendingRevoke] = useState<DoctorConnection | null>(
    null,
  )

  const revoke = useMutation({
    mutationFn: (connectionId: string) =>
      doctorLinkService.revokeConnection(connectionId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: doctorLinkKeys.connections(),
      }),
    onError: (error, connectionId) => {
      // `DOCTOR_ERROR_003`(이미 사라진 연결)이면 다시 눌러도 같은 답이 온다 —
      // 카탈로그가 그때는 재시도 대신 새로고침 버튼을 준다.
      presentError(error, {
        scope: "doctor-revoke",
        retry: () => revoke.mutate(connectionId),
        refresh: () => void connections.refetch(),
      })
    },
  })

  /**
   * 해지된 연결은 목록에서 뺀다. 서버와 목이 이미 걸러 주지만 여기서도 거른다 —
   * `총 N개` 가 해지된 것까지 세면 화면의 줄 수와 숫자가 어긋난다. 목록과 카운트는
   * **같은 배열**에서 나와야 한다.
   */
  const items = (connections.data?.items ?? []).filter(
    (connection) => connection.status !== "REVOKED",
  )
  const total = items.length

  /**
   * 상태 → 배지. APPROVED 는 undefined 를 돌려준다 — 정상 상태에 배지를 붙이면
   * 목록 전체가 배지밭이 되고 정작 눈에 띄어야 할 대기·거절이 묻힌다.
   * 승인된 줄에는 `DoctorRow` 의 chevron 만 남는다(시안 그대로).
   */
  const statusBadge = (status: DoctorConnectionStatus): ReactNode => {
    switch (status) {
      case "PENDING":
        return (
          <V2Badge size="s" color="yellow" variant="weak">
            {t("doctorLink.connections.statusPending")}
          </V2Badge>
        )
      case "REJECTED":
        return (
          <V2Badge size="s" color="red" variant="weak">
            {t("doctorLink.connections.statusRejected")}
          </V2Badge>
        )
      case "REVOKED":
        /*
         * 상태 배지에는 **상태**를 적는다. 전에는 액션 라벨("연결 해지")을 빌려 써서
         * 배지가 버튼처럼 읽혔고, 눌러도 아무 일이 없었다.
         * (서버·목 모두 해지된 연결은 목록에서 빼므로 실제로는 거의 오지 않는다.)
         */
        return (
          <V2Badge size="s" color="neutral" variant="weak">
            {t("doctorLink.connections.statusRevoked")}
          </V2Badge>
        )
      default:
        return undefined
    }
  }

  const renderBody = () => {
    if (connections.isError) {
      // 문구는 resolver 가 고른다. 예전 문구는 "연결 목록을 불러오지 못했어요" 하나라
      // 세션이 끊긴 것인지 권한이 없는 것인지 구분되지 않았다.
      const resolved = resolveError(connections.error)
      return resolved.retryable ? (
        <V2ErrorState
          title={resolved.title}
          description={resolved.body}
          onRetry={() => void connections.refetch()}
          retryLabel={t("common:action.retry")}
          style={styles.state}
        />
      ) : (
        <V2ErrorState
          title={resolved.title}
          description={resolved.body}
          style={styles.state}
        />
      )
    }

    if (!connections.data) {
      return showLoading ? <V2LoadingState style={styles.state} /> : null
    }

    if (items.length === 0) {
      return (
        <V2EmptyState
          icon="doctor"
          title={t("doctorLink.connections.emptyTitle")}
          description={t("doctorLink.connections.emptyBody")}
          actionLabel={t("doctorLink.connections.add")}
          onAction={() => onAdd?.()}
          style={styles.state}
        />
      )
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.label.normal }]}>
            {t("doctorLink.connections.sectionTitle")}
          </Text>
          <Text style={[styles.total, { color: colors.label.alternative }]}>
            {t("doctorLink.connections.total", { count: total })}
          </Text>
        </View>

        <View style={styles.rows}>
          {items.map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              trailing={statusBadge(connection.status)}
              onOpen={onOpen}
              onRequestRevoke={setPendingRevoke}
            />
          ))}
        </View>

        <V2Button
          color="neutral"
          variant="weak"
          size="l"
          fullWidth
          onPress={() => onAdd?.()}
        >
          {t("doctorLink.connections.add")}
        </V2Button>
      </>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader
        title={t("doctorLink.connections.title")}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {renderBody()}
      </ScrollView>

      <V2Modal
        visible={pendingRevoke != null}
        onRequestClose={() => setPendingRevoke(null)}
        title={t("doctorLink.connections.revokeConfirmTitle")}
        description={t("doctorLink.connections.revokeConfirmBody")}
        primaryLabel={t("doctorLink.connections.revoke")}
        onPrimary={() => {
          const target = pendingRevoke
          // 먼저 닫는다 — 해지는 목록 무효화로 결과가 보이고, 실패하면 토스트가 말한다.
          setPendingRevoke(null)
          if (target) revoke.mutate(target.id)
        }}
        secondaryLabel={t("common:action.cancel")}
        onSecondary={() => setPendingRevoke(null)}
        destructive
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    paddingBottom: spacing[32],
    gap: spacing[16],
  },
  state: {
    paddingVertical: spacing[32],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[8],
  },
  sectionTitle: {
    ...typography.title.small,
  },
  total: {
    ...typography.label.small,
  },
  rows: {
    gap: spacing[12],
  },
  pressed: { opacity: 0.85 },
})
