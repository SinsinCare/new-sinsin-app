/**
 * 의사 검색.
 *
 * ## 왜 `useQuery` 인가 (뮤테이션이 아니라)
 *
 * 옛 `AskDoctorScreen` 은 검색을 `useMutation` 으로 쏘고 결과를 `useState` 에 담았다.
 * 그러면 화면을 벗어나는 순간 결과가 사라져서, 의사를 골랐다가 뒤로 돌아오면 방금 본
 * 목록이 조용히 비어 있었다. 검색은 "서버 상태를 읽는 일" 이므로 쿼리가 맞다 —
 * 같은 조건으로 돌아오면 캐시가 즉시 답한다(`doctorSearchQuery`, staleTime 60s).
 *
 * ## 제출한 조건과 입력 중인 값을 분리한다
 *
 * `submitted` 는 **검색 버튼을 누른 순간의 조건**이다. 입력값을 그대로 쿼리 키에 넣으면
 * 글자를 칠 때마다 키가 바뀌어 캐시가 매번 어긋나고, 서버는 셋 다 빈 요청에 400
 * (`DOCTOR_SEARCH_CRITERIA_REQUIRED`)을 준다. `submitted === null` 이면 `enabled: false`
 * 라서 아직 아무것도 나가지 않는다.
 */

import { useState } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"

import {
  V2BottomCTA,
  V2EmptyState,
  V2ErrorState,
  V2LoadingState,
  V2ScreenHeader,
  V2TextField,
  spacing,
  typography,
  useLoadingVisible,
  useV2Theme,
} from "@/src/design-system-v2"
import { resolveError } from "@/src/lib/errorMessage"
import type { DoctorCard, DoctorSearchParams } from "@/src/types/doctorLink"

import { DoctorRow } from "../components/DoctorCards"
import { doctorSearchQuery } from "../data/doctorLinkQueries"

const EMPTY_FORM = { name: "", hospital: "", department: "" }

export function DoctorSearchScreen({
  onSelect,
  onBack,
}: {
  onSelect?: (doctor: DoctorCard) => void
  onBack?: () => void
}) {
  const { t } = useTranslation("settings")
  const { colors } = useV2Theme()

  const [form, setForm] = useState(EMPTY_FORM)
  const [submitted, setSubmitted] = useState<DoctorSearchParams | null>(null)

  const name = form.name.trim()
  const hospital = form.hospital.trim()
  const department = form.department.trim()
  // 서버 규칙과 같은 규칙으로 CTA 를 잠근다 — 셋 다 비면 400 이 오는 요청이라
  // 눌리게 두면 사용자는 이유 없는 실패만 본다.
  const hasCriteria = Boolean(name || hospital || department)

  const search = useQuery(
    doctorSearchQuery(submitted ?? {}, submitted !== null),
  )
  // 캐시가 답하면 로더를 아예 띄우지 않는다(깜빡임 방지).
  const showLoading = useLoadingVisible(submitted !== null && search.isPending)
  const searchFailure = search.isError ? resolveError(search.error) : null

  const update = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSearch = () => {
    if (!hasCriteria) return
    Keyboard.dismiss()
    // 빈 칸은 키에서 빼서 "이름만" 과 "이름+빈 병원" 이 다른 캐시가 되지 않게 한다.
    setSubmitted({
      name: name || undefined,
      hospital: hospital || undefined,
      department: department || undefined,
    })
  }

  const results = search.data?.items ?? []

  return (
    <View style={[styles.root, { backgroundColor: colors.background.default }]}>
      <V2ScreenHeader title={t("doctorLink.search.title")} onBack={onBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[typography.title.small, { color: colors.label.normal }]}
          >
            {t("doctorLink.search.headlineLead")}
            <Text style={{ color: colors.primary.primary }}>
              {t("doctorLink.search.headlineHighlight")}
            </Text>
            {t("doctorLink.search.headlineTail")}
          </Text>

          <View style={styles.fields}>
            <V2TextField
              label={t("doctorLink.search.nameLabel")}
              placeholder={t("doctorLink.search.namePlaceholder")}
              value={form.name}
              onChangeText={(value) => update("name", value)}
              returnKeyType="next"
            />
            <V2TextField
              label={t("doctorLink.search.hospitalLabel")}
              placeholder={t("doctorLink.search.hospitalPlaceholder")}
              value={form.hospital}
              onChangeText={(value) => update("hospital", value)}
              returnKeyType="next"
            />
            <V2TextField
              label={t("doctorLink.search.departmentLabel")}
              placeholder={t("doctorLink.search.departmentPlaceholder")}
              value={form.department}
              onChangeText={(value) => update("department", value)}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>

          {/* 결과는 같은 화면 아래에 편다. 검색 전(submitted === null)에는 아무것도
              그리지 않는다 — 빈 상태를 미리 보여 주면 "결과 없음" 으로 오해된다. */}
          {submitted !== null && (
            <View style={styles.results}>
              {showLoading ? (
                <V2LoadingState />
              ) : searchFailure ? (
                // `DOCTOR_ERROR_001`(조건 미입력)처럼 조건을 바꿔야 하는 실패는
                // 같은 조건으로 다시 불러도 답이 같다 — 재시도를 그리지 않는다.
                searchFailure.retryable ? (
                  <V2ErrorState
                    title={searchFailure.title}
                    description={searchFailure.body}
                    onRetry={() => void search.refetch()}
                    retryLabel={t("doctorLink.search.retry")}
                  />
                ) : (
                  <V2ErrorState
                    title={searchFailure.title}
                    description={searchFailure.body}
                  />
                )
              ) : search.isPending ? null : results.length === 0 ? (
                <V2EmptyState
                  title={t("doctorLink.search.emptyTitle")}
                  description={t("doctorLink.search.emptyBody")}
                />
              ) : (
                <>
                  <View style={styles.resultHeader}>
                    <Text
                      style={[
                        typography.title.xSmall,
                        { color: colors.label.normal },
                      ]}
                    >
                      {t("doctorLink.search.resultTitle")}
                    </Text>
                    <Text
                      style={[
                        typography.label.small,
                        { color: colors.label.alternative },
                      ]}
                    >
                      {t("doctorLink.search.resultCount", {
                        count: search.data?.total ?? results.length,
                      })}
                    </Text>
                  </View>

                  <View style={styles.resultList}>
                    {results.map((doctor) => (
                      <DoctorRow
                        key={doctor.id}
                        doctor={doctor}
                        onPress={() => onSelect?.(doctor)}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>

        <V2BottomCTA
          primaryLabel={t("doctorLink.search.cta")}
          onPrimary={handleSearch}
          primaryProps={{
            disabled: !hasCriteria,
            loading: submitted !== null && search.isFetching,
          }}
        />
      </KeyboardAvoidingView>
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
  },
  fields: {
    marginTop: spacing[28],
    gap: spacing[24],
  },
  results: { marginTop: spacing[32] },
  resultHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing[12],
  },
  resultList: { gap: spacing[8] },
})
