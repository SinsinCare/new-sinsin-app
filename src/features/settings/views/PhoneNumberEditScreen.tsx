import { ScrollView, StyleSheet, Text, View } from "react-native"

import {
  V2BottomCTA,
  V2Button,
  V2Screen,
  V2ScreenHeader,
  V2TextField,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { usePhoneNumberEditor } from "../hooks/usePhoneNumberEditor"

export function PhoneNumberEditScreen() {
  const { colors } = useV2Theme()
  const {
    profile,
    phoneNumber,
    phoneNumberError,
    canSave,
    isSaving,
    isDeleting,
    handlePhoneNumberChange,
    handleSave,
    handleDelete,
    handleBack,
  } = usePhoneNumberEditor()

  return (
    <V2Screen
      keyboardAvoiding
      padded={false}
      edges={["left", "right", "bottom"]}
    >
      <V2ScreenHeader title="전화번호" onBack={handleBack} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={[typography.title.medium, { color: colors.label.strong }]}>
          연락받을 전화번호를 입력해주세요
        </Text>
        <Text
          style={[
            typography.body.mediumWeak,
            styles.description,
            { color: colors.label.alternative },
          ]}
        >
          선택 정보이며 개인 연락수단 확보를 위해 수집합니다. 마케팅 수신에
          동의한 경우에만 마케팅 안내에도 활용합니다.
        </Text>

        {profile?.hasPhoneNumber && (
          <View
            style={[
              styles.currentPhone,
              { backgroundColor: colors.fill.normal },
            ]}
          >
            <Text
              style={[
                typography.subtext.medium,
                { color: colors.label.alternative },
              ]}
            >
              현재 저장된 번호
            </Text>
            <Text
              style={[
                typography.body.mediumStrong,
                { color: colors.label.normal },
              ]}
            >
              {profile.phoneNumberMasked || "등록됨"}
            </Text>
          </View>
        )}

        <V2TextField
          label={profile?.hasPhoneNumber ? "새 전화번호" : "전화번호"}
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          placeholder="010-1234-5678"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          returnKeyType="done"
          onSubmitEditing={handleSave}
          maxLength={13}
          error={phoneNumberError ?? false}
          disabled={isSaving || isDeleting}
          accessibilityLabel="연락받을 전화번호"
          accessibilityHint="010으로 시작하는 휴대전화 번호를 입력합니다"
        />

        <Text
          style={[
            typography.subtext.medium,
            styles.policyText,
            { color: colors.label.alternative },
          ]}
        >
          전화번호는 로그인, 계정 통합 또는 SMS 본인인증 수단으로 사용하지
          않습니다.
        </Text>

        {profile?.hasPhoneNumber && (
          <V2Button
            color="danger"
            variant="weak"
            size="l"
            fullWidth
            loading={isDeleting}
            disabled={isSaving}
            onPress={handleDelete}
            accessibilityLabel="저장된 전화번호 삭제"
          >
            저장된 전화번호 삭제
          </V2Button>
        )}
      </ScrollView>

      <V2BottomCTA
        primaryLabel={profile?.hasPhoneNumber ? "변경하기" : "저장하기"}
        onPrimary={handleSave}
        primaryProps={{ disabled: !canSave, loading: isSaving }}
      />
    </V2Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing[24],
    paddingTop: spacing[20],
    paddingBottom: spacing[32],
  },
  description: {
    marginTop: spacing[8],
    marginBottom: spacing[24],
  },
  currentPhone: {
    gap: spacing[4],
    padding: spacing[16],
    marginBottom: spacing[20],
    borderRadius: radius.xl,
  },
  policyText: {
    marginTop: spacing[10],
    marginBottom: spacing[24],
  },
})
