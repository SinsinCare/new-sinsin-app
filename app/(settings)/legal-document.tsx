import React from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { useAppColorScheme } from "@/src/hooks/useAppColorScheme"
import Ionicons from "@expo/vector-icons/Ionicons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useAppRouter } from "@/src/shared/navigation"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { tokens } from "@/src/theme/tokens"
import { useTranslation } from "react-i18next"

function useLegalColors() {
  const isDark = useAppColorScheme() === "dark"
  return {
    bg: isDark ? tokens.color.appBgDark.val : tokens.color.appBg.val,
    headerText: isDark ? tokens.color.textDark.val : "#111",
    heading: isDark ? tokens.color.textDark.val : "#111",
    heading2: isDark ? "#D4D4DA" : "#222",
    heading3: isDark ? "#BBBBC4" : "#333",
    body: isDark ? tokens.color.textDarkSub.val : "#444",
    note: isDark ? "#6B7280" : "#888",
    icon: isDark ? tokens.color.textDarkSub.val : "#333",
  }
}

const PRIVACY_POLICY = `주식회사 메디올로지(이하 "회사")는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 권익을 보호하기 위하여 다음과 같은 개인정보 처리방침을 수립·공개한다.

## 제1조 (개인정보의 처리 목적)

회사는 다음의 목적을 위하여 개인정보를 처리한다. 처리한 개인정보는 다음 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우 관련 법령에 따라 별도의 동의를 받는다.

1. 회원 가입 및 관리
   - 회원 식별, 본인 확인
   - 회원 자격 유지·관리
   - 부정 이용 방지 및 서비스 악용 방지
2. 서비스 제공
   - 만성신장질환(CKD) 관련 맞춤형 식이·건강 관리 서비스 제공
   - AI 기반 건강 정보 분석, 리포트 및 추천 제공
   - 건강 기록 관리 및 시각화
3. 고객 상담 및 민원 처리
   - 문의 응대 및 불만 처리
   - 공지사항 전달
4. 서비스 개선 및 연구
   - 서비스 이용 통계 분석
   - 알고리즘 성능 개선 및 품질 향상
   - 신규 서비스 개발

## 제2조 (처리하는 개인정보의 항목)

회사는 다음과 같은 개인정보를 처리한다.

### 1. 회원가입 및 서비스 이용 시

1. 필수 정보
   - 이메일 주소
   - 비밀번호
   - 닉네임 또는 사용자 식별 정보
2. 선택 정보
   - 성별
   - 생년월일
   - 체중
   - 생활습관 정보(식이, 운동 등)

### 2. 건강정보 (민감정보)

이용자의 명시적 동의 하에 다음 정보를 처리할 수 있다.

- 신장질환 관련 병력 정보
- 검사 결과(사구체여과율, 크레아티닌, 전해질 등)
- 식단 기록 및 건강 지표 기록
- 증상 입력 정보

※ 건강정보는 「개인정보 보호법」 제23조에 따른 민감정보로서, 별도의 동의를 받은 경우에만 처리한다.

### 3. 자동 수집 정보

- 서비스 이용 기록
- 접속 로그, 쿠키
- 기기 정보(OS, 앱 버전 등)

## 제3조 (개인정보의 처리 및 보유 기간)

회사는 법령에 따른 개인정보 보유·이용 기간 또는 이용자로부터 동의 받은 기간 내에서 개인정보를 처리·보유한다.

1. 회원 정보
   - 회원 탈퇴 시까지
2. 서비스 이용 기록
   - 3년 (전자상거래 등 관련 법령 기준)
3. 건강정보
   - 회원 탈퇴 시 또는 동의 철회 시 즉시 파기
   - 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관

## 제4조 (개인정보의 제3자 제공)

회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않는다.

다만, 다음의 경우에는 예외로 한다.

1. 이용자의 사전 동의를 받은 경우
2. 법령에 근거한 경우
3. 서비스 제공을 위해 불가피하게 필요한 경우(보험사·의료기관·연구기관 등과의 협업 시)

이 경우 회사는 제공 목적, 제공 항목, 보유 기간을 명확히 고지하고 별도의 동의를 받는다.

## 제5조 (개인정보 처리의 위탁)

회사는 원활한 서비스 제공을 위해 개인정보 처리 업무를 외부 업체에 위탁할 수 있다.

1. 위탁 업무 내용
   - 서버 운영 및 데이터 보관
   - 고객 상담 시스템 운영
   - 분석 시스템 운영
2. 회사는 위탁 계약 시 개인정보 보호 관련 법령을 준수하도록 관리·감독한다.

## 제6조 (정보주체의 권리와 행사 방법)

이용자는 언제든지 다음 권리를 행사할 수 있다.

1. 개인정보 열람 요청
2. 개인정보 정정·삭제 요청
3. 개인정보 처리 정지 요청
4. 동의 철회 및 회원 탈퇴

권리 행사는 이메일 또는 고객센터를 통해 요청할 수 있으며, 회사는 지체 없이 조치한다.

## 제7조 (개인정보의 파기)

회사는 개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우, 해당 정보를 지체 없이 파기한다.

1. 파기 절차
   - 목적 달성 후 내부 방침에 따라 파기
2. 파기 방법
   - 전자적 파일: 복구 불가능한 방식으로 삭제
   - 종이 문서: 분쇄 또는 소각

## 제8조 (개인정보의 안전성 확보 조치)

회사는 개인정보 보호를 위해 다음과 같은 조치를 취하고 있다.

1. 관리적 조치
   - 개인정보 보호 내부 관리계획 수립
   - 임직원 개인정보 보호 교육
2. 기술적 조치
   - 접근 권한 관리
   - 암호화 저장
   - 보안 프로그램 설치
3. 물리적 조치
   - 전산실 및 자료 보관실 접근 통제

## 제9조 (개인정보 보호책임자)

회사는 개인정보 처리에 관한 업무를 총괄하여 책임지는 개인정보 보호책임자를 지정한다.

- 개인정보 보호책임자: 주식회사 메디올로지 담당자
- 이메일: corp@mediology.ai
- 전화번호: 070-8080-3873

## 제10조 (개인정보 처리방침 변경)

본 개인정보 처리방침은 관련 법령 또는 회사 정책 변경에 따라 변경될 수 있으며, 변경 시 서비스 내 공지한다.

## 부칙

본 개인정보 처리방침은 2025년 2월 5일부터 시행한다.`

const TERMS_OF_USE = `본 약관은 주식회사 메디올로지(이하 "회사"라 한다)가 제공하는 신신당부 서비스의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 한다.

## 제1조 (목적)

본 약관은 회사가 제공하는 신신당부 서비스(이하 "서비스"라 한다)의 이용 조건, 절차 및 회사와 이용자 간의 권리·의무, 책임 사항을 규정함을 목적으로 한다.

## 제2조 (정의)

본 약관에서 사용하는 용어의 정의는 다음과 같다.

1. "회사"란 신신당부 서비스를 운영하는 주식회사 메디올로지를 의미한다.
2. "서비스"란 회사가 제공하는 만성신장질환(CKD) 환자 대상 AI 기반 식이·건강 관리, 정보 제공, 기록, 분석, 추천, 상담 지원 기능 일체를 의미한다.
3. "이용자"란 본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 말한다.
4. "회원"이란 회사에 개인정보를 제공하여 회원가입을 완료한 자를 말한다.
5. "콘텐츠"란 서비스 내에서 제공되는 텍스트, 이미지, 그래프, 리포트, 알고리즘 결과, 추천 정보, 데이터 분석 결과 등을 의미한다.
6. "AI 상담"이란 인공지능 알고리즘을 활용하여 제공되는 건강 정보, 식이·생활 가이드, 일반적 의학 정보 제공 기능을 의미한다.

## 제3조 (약관의 효력 및 변경)

1. 본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생한다.
2. 회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있다.
3. 약관이 변경되는 경우, 회사는 변경 내용과 적용 일자를 명시하여 서비스 내 공지한다.
4. 이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있다.
5. 변경 약관 시행 이후에도 서비스를 계속 이용하는 경우, 변경 약관에 동의한 것으로 본다.

## 제4조 (서비스의 내용)

회사가 제공하는 서비스는 다음과 같다.

1. 만성신장질환 관련 건강 정보 제공
2. AI 기반 식이·생활 관리 가이드 및 추천
3. 식단 기록, 건강 지표 기록 및 시각화
4. 병원 검사 결과 기반 건강 리포트 제공
5. 신장질환 관련 일반적 의학 정보 및 상담 지원
6. 기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스

## 제5조 (의료행위 아님에 대한 고지)

1. 신신당부 서비스는 의료행위, 진단, 치료, 처방을 제공하지 않는다.
2. AI 상담 및 제공되는 모든 콘텐츠는 정보 제공 및 건강 관리 참고 목적이며, 의료 전문가의 진료를 대체하지 않는다.
3. 이용자는 건강 이상, 증상 악화, 긴급 상황 발생 시 반드시 의료기관을 방문하거나 의료 전문가의 진료를 받아야 한다.
4. 회사는 서비스 이용으로 인한 의료적 판단 또는 결과에 대해 책임을 지지 않는다.

## 제6조 (회원가입)

1. 회원가입은 이용자가 약관 및 개인정보 처리방침에 동의하고 필요한 정보를 입력함으로써 완료된다.
2. 회사는 다음 각 호에 해당하는 경우 회원가입을 거부하거나 사후에 취소할 수 있다.
   - 허위 정보를 제공한 경우
   - 타인의 명의를 도용한 경우
   - 법령 또는 약관을 위반한 경우
3. 회원은 개인정보 변경 시 즉시 수정해야 하며, 미수정으로 인한 불이익에 대해 회사는 책임을 지지 않는다.

## 제7조 (회원의 의무)

회원은 다음 행위를 하여서는 안 된다.

1. 타인의 개인정보 또는 계정을 도용하는 행위
2. 서비스의 정상적인 운영을 방해하는 행위
3. 회사 또는 제3자의 지식재산권을 침해하는 행위
4. 법령, 공공질서 또는 미풍양속에 반하는 행위
5. 서비스 정보를 상업적으로 무단 이용하는 행위

## 제8조 (서비스 이용 제한 및 중단)

1. 회사는 다음의 경우 서비스 제공을 제한하거나 중단할 수 있다.
   - 시스템 점검, 유지보수
   - 천재지변, 불가항력적 사유
   - 이용자의 약관 위반
2. 서비스 중단 시 회사는 사전 공지를 원칙으로 하나, 긴급한 경우 사후 공지할 수 있다.

## 제9조 (지식재산권)

1. 서비스 및 콘텐츠에 대한 저작권 및 지식재산권은 회사 또는 정당한 권리자에게 귀속된다.
2. 이용자는 서비스를 통해 제공되는 콘텐츠를 회사의 사전 동의 없이 복제, 배포, 상업적 이용할 수 없다.

## 제10조 (개인정보 보호)

1. 회사는 개인정보 보호 관련 법령을 준수한다.
2. 개인정보의 수집, 이용, 보관, 파기에 관한 사항은 별도의 개인정보 처리방침에 따른다.

## 제11조 (책임의 제한)

1. 회사는 이용자의 건강 상태, 서비스 이용 결과, AI 분석 결과의 정확성에 대해 보증하지 않는다.
2. 회사는 이용자의 귀책 사유로 발생한 손해에 대해 책임을 지지 않는다.
3. 무료로 제공되는 서비스에 대하여 회사는 법령이 허용하는 범위 내에서 책임을 제한할 수 있다.

## 제12조 (분쟁 해결 및 관할)

1. 회사와 이용자 간 발생한 분쟁은 상호 협의하여 해결함을 원칙으로 한다.
2. 협의가 이루어지지 않을 경우, 대한민국 법을 준거법으로 한다.
3. 관할 법원은 회사 본점 소재지 관할 법원으로 한다.

## 제13조 (고객 문의)

서비스 이용과 관련한 문의는 아래로 연락할 수 있다.

- 이메일: corp@mediology.ai
- 전화번호: 070-8080-3873

## 부칙

본 약관은 2025년 2월 5일부터 시행한다.`

const DOCUMENTS = {
  "privacy-policy": {
    content: PRIVACY_POLICY,
  },
  "terms-of-use": {
    content: TERMS_OF_USE,
  },
} as const

type DocumentType = keyof typeof DOCUMENTS

function renderContent(content: string, c: ReturnType<typeof useLegalColors>) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim() === "") continue

    if (line.startsWith("## ")) {
      elements.push(
        <ThemedText
          key={key++}
          style={[styles.heading2, { color: c.heading2 }]}
        >
          {line.slice(3)}
        </ThemedText>,
      )
      continue
    }

    if (line.startsWith("### ")) {
      elements.push(
        <ThemedText
          key={key++}
          style={[styles.heading3, { color: c.heading3 }]}
        >
          {line.slice(4)}
        </ThemedText>,
      )
      continue
    }

    if (/^\s{3,}- /.test(line)) {
      elements.push(
        <View key={key++} style={styles.subListItem}>
          <ThemedText style={[styles.bodyText, { color: c.body }]}>
            {"  - "}
          </ThemedText>
          <ThemedText
            style={[styles.bodyText, styles.listText, { color: c.body }]}
          >
            {line.trim().slice(2)}
          </ThemedText>
        </View>,
      )
      continue
    }

    if (line.startsWith("- ")) {
      elements.push(
        <View key={key++} style={styles.listItem}>
          <ThemedText style={[styles.bodyText, { color: c.body }]}>
            {"- "}
          </ThemedText>
          <ThemedText
            style={[styles.bodyText, styles.listText, { color: c.body }]}
          >
            {line.slice(2)}
          </ThemedText>
        </View>,
      )
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+\.)\s(.*)/)
      if (match) {
        elements.push(
          <View key={key++} style={styles.listItem}>
            <ThemedText style={[styles.bodyText, { color: c.body }]}>
              {match[1]}{" "}
            </ThemedText>
            <ThemedText
              style={[styles.bodyText, styles.listText, { color: c.body }]}
            >
              {match[2]}
            </ThemedText>
          </View>,
        )
        continue
      }
    }

    if (line.startsWith("※")) {
      elements.push(
        <ThemedText key={key++} style={[styles.noteText, { color: c.note }]}>
          {line}
        </ThemedText>,
      )
      continue
    }

    elements.push(
      <ThemedText key={key++} style={[styles.bodyText, { color: c.body }]}>
        {line}
      </ThemedText>,
    )
  }

  return elements
}

export default function LegalDocumentScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useAppRouter()
  const { type } = useLocalSearchParams<{ type: DocumentType }>()
  const c = useLegalColors()

  const docType = type as DocumentType
  const doc = type && DOCUMENTS[docType]
  const isPrivacyPolicy = docType === "privacy-policy"

  if (!doc) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("action.back")}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={c.icon} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: c.headerText }]}>
            {t("legalDocument.title")}
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.bodyText, { color: c.body }]}>
            {t("legalDocument.notFound")}
          </ThemedText>
        </View>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("action.back")}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={c.icon} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: c.headerText }]}>
          {isPrivacyPolicy
            ? t("settings.legal.privacy")
            : t("settings.legal.terms")}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.documentHeading, { color: c.heading }]}>
          {isPrivacyPolicy
            ? t("settings.legal.privacy")
            : t("legalDocument.termsHeading")}
        </ThemedText>
        {i18n.language.startsWith("en") && (
          <ThemedText style={[styles.noteText, { color: c.note }]}>
            {t("legalDocument.officialKoreanNotice")}
          </ThemedText>
        )}
        {renderContent(doc.content, c)}
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  documentHeading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  heading2: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: "row",
    paddingLeft: 8,
    marginBottom: 2,
  },
  subListItem: {
    flexDirection: "row",
    paddingLeft: 24,
    marginBottom: 2,
  },
  listText: {
    flex: 1,
    marginBottom: 2,
  },
})
