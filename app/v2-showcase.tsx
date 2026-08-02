// Design System v2 — 컴포넌트 쇼케이스 (dev 전용)
// 실기기/시뮬레이터에서 v2 컴포넌트를 눈으로 확인하는 화면. 프로덕션 라우팅엔 노출 안 함.
// (app/_layout.tsx 의 리다이렉트가 __DEV__ + segment "v2-showcase"일 때 통과시킴)

import { type ReactNode, useState } from "react"
import {
  Appearance,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  useV2Theme,
  V2Badge,
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
  V2DotLoader,
  V2Skeleton,
  V2SkeletonCircle,
  V2SkeletonGroup,
  V2SkeletonText,
  V2Modal,
  V2Option,
  V2ProgressBar,
  V2ScreenHeader,
  V2SearchField,
  V2SegmentControl,
  V2Switch,
  V2Tab,
  V2TabBar,
  V2TextField,
  type V2IconName,
} from "@/src/design-system-v2"

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useV2Theme()
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.label.neutral }]}>
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

const ICONS: V2IconName[] = [
  "heart",
  "doctor",
  "chat",
  "health",
  "camera",
  "book",
  "report",
  "info",
  "danger",
  "search",
  "chevronLeft",
  "close",
]

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
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background.default }]}
      edges={["top"]}
    >
      <V2ScreenHeader
        title="V2 Showcase"
        right={<V2IconButton name="theme" onPress={toggleTheme} />}
      />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={styles.scroll}
      >
        <Section title="Button">
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
          <V2Button loading fullWidth>
            로딩 중
          </V2Button>
        </Section>

        <Section title="Icon Button">
          <View style={styles.row}>
            <V2IconButton name="heart" variant="clear" />
            <V2IconButton name="heart" variant="border" />
            <V2IconButton name="heart" variant="fill" />
            <V2IconButton name="camera" variant="border" size="l" />
          </View>
        </Section>

        <Section title="Text Field / Search">
          <V2TextField
            label="이름"
            placeholder="이름을 입력해 주세요"
            value={text}
            onChangeText={setText}
            helperText="앱에서 사용할 이름이에요"
          />
          <V2TextField
            variant="line"
            placeholder="라인형"
            value=""
            onChangeText={() => {}}
          />
          <V2TextField
            label="이메일"
            value="sinsin@"
            onChangeText={() => {}}
            error="이메일 형식을 확인해 주세요"
          />
          <V2SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="검색"
            onClear={() => setQuery("")}
          />
        </Section>

        <Section title="Checkbox / Switch">
          <View style={styles.row}>
            <V2Checkbox checked={checked} onChange={setChecked} />
            <V2Checkbox
              checked={!checked}
              onChange={(v) => setChecked(!v)}
              variant="line"
            />
            <V2Switch value={sw} onValueChange={setSw} />
            <V2Switch value={!sw} onValueChange={(v) => setSw(!v)} disabled />
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
          {/* tone="neutral" — 선택이 잉크 면이다. 브랜드색을 이미 쓰고 있는 화면의
              정렬·세그먼트 줄이 쓴다(레시피 목록의 정렬 줄). */}
          <View style={styles.row}>
            <V2Chip
              label="추천"
              size="s"
              tone="neutral"
              selected={chipOn}
              onPress={() => setChipOn(true)}
            />
            <V2Chip
              label="최신"
              size="s"
              tone="neutral"
              selected={!chipOn}
              onPress={() => setChipOn(false)}
            />
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

        <Section title="Overlay (탭하면 열림)">
          <V2Button color="brand" variant="weak" onPress={() => setModal(true)}>
            Modal 열기
          </V2Button>
          <V2Button
            color="neutral"
            variant="weak"
            onPress={() => setSheet(true)}
          >
            Bottom Sheet 열기
          </V2Button>
        </Section>

        <Section title="Icons (12)">
          <View style={styles.iconGrid}>
            {ICONS.map((n) => (
              <V2Icon key={n} name={n} color={colors.label.normal} />
            ))}
          </View>
        </Section>

        <Section title="States">
          <V2Card variant="outlined">
            <V2EmptyState
              icon="file"
              title="기록이 없어요"
              description="첫 기록을 남겨 보세요"
              actionLabel="기록 추가"
              onAction={() => {}}
            />
          </V2Card>
          <V2Card variant="outlined">
            <V2LoadingState message="불러오고 있어요" />
          </V2Card>
        </Section>

        {/* 로딩은 두 갈래다 — 결과 모양을 아는 자리는 스켈레톤, 모르는 자리는 점. */}
        <Section title="Loading">
          <V2Card variant="outlined">
            <V2SkeletonGroup style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <V2SkeletonCircle size={40} />
                <View style={{ flex: 1, gap: 8 }}>
                  <V2Skeleton width="52%" height={16} />
                  <V2Skeleton width="34%" height={13} />
                </View>
              </View>
              <V2Skeleton height={96} radius="lg" />
              <V2SkeletonText lines={3} lineHeight={14} />
            </V2SkeletonGroup>
          </V2Card>
          <V2Card variant="outlined">
            <View
              style={{ flexDirection: "row", gap: 24, alignItems: "center" }}
            >
              <V2DotLoader size="s" />
              <V2DotLoader size="m" />
              <V2DotLoader size="l" />
            </View>
          </V2Card>
          <V2Card variant="outlined">
            <V2ErrorState
              title="건강 기록을 불러오지 못했어요"
              description="인터넷 연결을 확인한 뒤 다시 불러와 주세요."
              onRetry={() => {}}
              retryLabel="다시 불러오기"
            />
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
        subTitle="원하는 항목을 골라 주세요"
        primaryLabel="확인"
        onPrimary={() => setSheet(false)}
      >
        <View style={{ paddingVertical: 8 }}>
          <V2ListRow leadingIcon="camera" title="사진 촬영" />
          <V2ListRow leadingIcon="upload" title="앨범에서 선택" />
        </View>
      </V2BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
})
