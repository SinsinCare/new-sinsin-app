// Design System v2 — 컴포넌트 쇼케이스 (dev 전용)
// 실기기/시뮬레이터에서 v2 컴포넌트를 눈으로 확인하는 화면. 프로덕션 라우팅엔 노출 안 함.
// (app/_layout.tsx 의 리다이렉트가 __DEV__ + segment "v2-showcase"일 때 통과시킴)

import { type ReactNode, useState } from "react"
import {
  Appearance,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { v2AssetManifest } from "@/src/assets/v2AssetManifest"
import {
  iconNames,
  radius,
  useV2Theme,
  V2Badge,
  V2BottomCTA,
  V2BottomSheet,
  V2Bubble,
  V2Button,
  V2Card,
  V2Checkbox,
  V2Chip,
  V2Divider,
  V2EmptyState,
  V2ErrorState,
  V2Icon,
  V2IconButton,
  V2ListRow,
  V2LoadingState,
  V2Modal,
  V2Option,
  V2ProgressBar,
  V2Screen,
  V2ScreenHeader,
  V2SearchField,
  V2SegmentControl,
  V2Switch,
  V2Tab,
  V2TabBar,
  V2TextField,
} from "@/src/design-system-v2"

function Section({
  title,
  children,
  testID,
}: {
  title: string
  children: ReactNode
  testID?: string
}) {
  const { colors } = useV2Theme()
  return (
    <View
      style={styles.section}
      testID={testID}
      accessibilityLabel={testID ? `${title} showcase section` : undefined}
    >
      <Text style={[styles.sectionTitle, { color: colors.label.neutral }]}>
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

export default function V2Showcase() {
  const { colors } = useV2Theme()
  const scheme = useColorScheme()
  const [checked, setChecked] = useState(true)
  const [sw, setSw] = useState(true)
  const [seg, setSeg] = useState("month")
  const [tab, setTab] = useState("home")
  const [text, setText] = useState("")
  const [query, setQuery] = useState("")
  const [chipOn, setChipOn] = useState(true)
  const [opt, setOpt] = useState("hemo")
  const [modal, setModal] = useState(false)
  const [sheet, setSheet] = useState(false)

  const toggleTheme = () =>
    Appearance.setColorScheme(scheme === "dark" ? "light" : "dark")

  return (
    <V2Screen padded={false} edges={["top", "left", "right"]}>
      <V2ScreenHeader
        title="V2 Showcase"
        right={
          <V2IconButton
            name="theme"
            onPress={toggleTheme}
            testID="v2-showcase-theme-toggle"
            accessibilityLabel="Toggle showcase theme"
          />
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Button" testID="v2-showcase-button-states">
          <View style={styles.row}>
            <V2Button color="brand">브랜드</V2Button>
            <V2Button color="brand" variant="weak">
              Weak
            </V2Button>
            <V2Button color="danger">위험</V2Button>
            <V2Button color="neutral" variant="weak">
              중립
            </V2Button>
          </View>
          <View style={styles.row}>
            <V2Button size="s">S</V2Button>
            <V2Button size="m">M</V2Button>
            <V2Button size="l">L</V2Button>
            <V2Button size="xl">XL</V2Button>
          </View>
          <V2Button loading fullWidth testID="v2-showcase-button-loading">
            로딩 중
          </V2Button>
          <V2Button disabled fullWidth testID="v2-showcase-button-disabled">
            비활성 버튼
          </V2Button>
        </Section>

        <Section title="Icon Button" testID="v2-showcase-icon-button-states">
          <View style={styles.row}>
            <V2IconButton name="heart" variant="clear" />
            <V2IconButton name="heart" variant="border" />
            <V2IconButton name="heart" variant="fill" />
            <V2IconButton name="camera" variant="border" size="l" />
            <V2IconButton
              name="close"
              variant="border"
              disabled
              testID="v2-showcase-icon-button-disabled"
              accessibilityLabel="Disabled close icon button"
            />
          </View>
        </Section>

        <Section title="Text Field / Search" testID="v2-showcase-input-states">
          <V2TextField
            label="라벨"
            placeholder="입력하세요"
            value={text}
            onChangeText={setText}
            helperText="도움말 텍스트"
          />
          <V2TextField
            variant="line"
            placeholder="라인형"
            value=""
            onChangeText={() => {}}
          />
          <V2TextField
            label="에러"
            value="잘못된 값"
            onChangeText={() => {}}
            error="필수 입력이에요"
            testID="v2-showcase-text-field-error"
          />
          <V2TextField
            label="비활성"
            value="수정할 수 없어요"
            onChangeText={() => {}}
            disabled
            testID="v2-showcase-text-field-disabled"
          />
          <V2TextField
            label="여러 줄 입력"
            value="긴 내용을 입력하는 multiline 상태를 확인합니다.\n두 번째 줄도 표시됩니다."
            onChangeText={() => {}}
            multiline
            numberOfLines={3}
            testID="v2-showcase-text-field-multiline"
          />
          <V2SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="검색"
            onClear={() => setQuery("")}
          />
        </Section>

        <Section
          title="Checkbox / Switch"
          testID="v2-showcase-selection-states"
        >
          <View style={styles.row}>
            <V2Checkbox checked={checked} onChange={setChecked} />
            <V2Checkbox
              checked={!checked}
              onChange={(v) => setChecked(!v)}
              variant="line"
            />
            <V2Switch value={sw} onValueChange={setSw} />
            <V2Switch value={!sw} onValueChange={(v) => setSw(!v)} disabled />
            <V2Checkbox
              checked
              disabled
              testID="v2-showcase-checkbox-disabled"
              accessibilityLabel="Disabled checked checkbox"
            />
          </View>
        </Section>

        <Section title="Segment / Tab">
          <V2SegmentControl
            items={[
              { label: "일", value: "day" },
              { label: "주", value: "week" },
              { label: "월", value: "month" },
            ]}
            value={seg}
            onChange={setSeg}
          />
          <V2Tab
            items={[
              { label: "홈", value: "home" },
              { label: "기록", value: "log" },
              { label: "설정", value: "settings" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </Section>

        <Section title="Badge / Chip / Progress">
          <View style={styles.row}>
            <V2Badge color="brand">브랜드</V2Badge>
            <V2Badge color="red">위험</V2Badge>
            <V2Badge color="green" variant="weak">
              완료
            </V2Badge>
            <V2Badge color="blue" variant="weak">
              정보
            </V2Badge>
          </View>
          <View style={styles.row}>
            <V2Chip
              label="전체"
              selected={chipOn}
              onPress={() => setChipOn(true)}
            />
            <V2Chip
              label="신장병"
              selected={!chipOn}
              onPress={() => setChipOn(false)}
            />
            <V2Chip label="저염식" onRemove={() => {}} />
          </View>
          <V2ProgressBar value={60} color="brand" />
          <V2ProgressBar value={40} color="success" size="l" />
        </Section>

        <Section title="Bubble / Divider">
          <V2Bubble placement="start">안녕하세요 👋</V2Bubble>
          <V2Divider />
          <V2Divider variant="thick" />
        </Section>

        <Section title="Card">
          <V2Card variant="outlined">
            <Text style={{ color: colors.label.normal }}>outlined 카드</Text>
          </V2Card>
          <V2Card variant="elevated">
            <Text style={{ color: colors.label.normal }}>elevated 카드</Text>
          </V2Card>
        </Section>

        <Section
          title="Replaceable Sample Asset"
          testID="v2-showcase-sample-asset"
        >
          <View style={styles.assetPreviewRow}>
            <Image
              source={v2AssetManifest.genericCard.source}
              style={[
                styles.assetPreview,
                {
                  backgroundColor: colors.fill.background,
                  borderRadius: radius["2xl"],
                },
              ]}
              testID="v2-showcase-sample-asset-preview"
              accessibilityLabel="Temporary neutral sample artwork"
            />
            <Text
              style={[
                styles.assetPreviewLabel,
                { color: colors.label.neutral },
              ]}
            >
              genericCard · sample · replacement pending
            </Text>
          </View>
        </Section>

        <Section title="List Row / Option">
          <V2Card variant="outlined" padded={false}>
            <V2ListRow
              leadingIcon="doctor"
              title="의사 상담"
              subtitle="전문의 연결"
              trailing={<V2Switch value={sw} onValueChange={setSw} />}
            />
            <V2Divider />
            <V2ListRow
              leadingIcon="health"
              title="건강 기록"
              trailing={<Text style={{ color: colors.label.neutral }}>값</Text>}
            />
          </V2Card>
          <V2Option
            selected={opt === "hemo"}
            onPress={() => setOpt("hemo")}
            label="혈액투석"
            description="주 3회"
          />
          <V2Option
            selected={opt === "perit"}
            onPress={() => setOpt("perit")}
            label="복막투석"
            description="매일"
          />
        </Section>

        <Section title="Bottom CTA" testID="v2-showcase-bottom-cta">
          <V2BottomCTA
            layout="vertical"
            primaryLabel="주 작업"
            onPrimary={() => {}}
            secondaryLabel="보조 작업"
            onSecondary={() => {}}
          />
        </Section>

        <Section
          title="Overlay (탭하면 열림)"
          testID="v2-showcase-overlay-triggers"
        >
          <V2Button
            color="brand"
            variant="weak"
            onPress={() => setModal(true)}
            testID="v2-showcase-open-modal"
          >
            Modal 열기
          </V2Button>
          <V2Button
            color="neutral"
            variant="weak"
            onPress={() => setSheet(true)}
            testID="v2-showcase-open-bottom-sheet"
          >
            Bottom Sheet 열기
          </V2Button>
        </Section>

        <Section
          title={`Icons (${iconNames.length})`}
          testID="v2-showcase-icons"
        >
          <View style={styles.iconGrid}>
            {iconNames.map((n) => (
              <V2Icon key={n} name={n} color={colors.label.normal} />
            ))}
          </View>
        </Section>

        <Section title="States" testID="v2-showcase-async-states">
          <V2Card variant="outlined">
            <V2EmptyState
              icon="file"
              title="기록이 없어요"
              description="첫 기록을 남겨보세요"
              actionLabel="기록 추가"
              onAction={() => {}}
            />
          </V2Card>
          <V2Card variant="outlined">
            <V2LoadingState message="불러오는 중" />
          </V2Card>
          <V2Card variant="outlined">
            <V2ErrorState onRetry={() => {}} />
          </V2Card>
        </Section>
      </ScrollView>

      <V2TabBar
        items={[
          { value: "home", label: "홈", icon: "heart" },
          { value: "chat", label: "상담", icon: "chat", redDot: true },
          { value: "recipe", label: "레시피", icon: "book" },
          { value: "profile", label: "건강", icon: "health" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <V2Modal
        visible={modal}
        onRequestClose={() => setModal(false)}
        title="삭제할까요?"
        description="이 작업은 되돌릴 수 없어요."
        destructive
        primaryLabel="삭제"
        onPrimary={() => setModal(false)}
        secondaryLabel="취소"
        onSecondary={() => setModal(false)}
      />

      <V2BottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="옵션 선택"
        subTitle="원하는 항목을 골라주세요"
        primaryLabel="확인"
        onPrimary={() => setSheet(false)}
      >
        <View style={{ paddingVertical: 8 }}>
          <V2ListRow leadingIcon="camera" title="사진 촬영" />
          <V2ListRow leadingIcon="upload" title="앨범에서 선택" />
        </View>
      </V2BottomSheet>
    </V2Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingBottom: 120, gap: 4 },
  section: { marginBottom: 24, gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionBody: { gap: 12 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  iconGrid: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  assetPreviewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  assetPreview: { width: 96, height: 96 },
  assetPreviewLabel: { flex: 1, fontSize: 14, lineHeight: 20 },
})
