/**
 * 사진/영상 피커 (목업 -28 / -29).
 *
 * ## ⚠️ 앨범을 직접 훑지 못한다 — 그래서 그리드의 의미가 다르다
 *
 * 목업의 3열 그리드는 "기기 앨범 전체"를 그린 것이다. 그런데 이 앱에 설치된 것은
 * `expo-image-picker` 뿐이고(`expo-media-library` 는 의존성에 **없다**), image-picker 는
 * 앨범을 열거할 API 를 주지 않는다 — OS 시트를 띄우고 **고른 결과만** 돌려준다.
 *
 * 없는 능력을 있는 것처럼 그리지 않는다. 그래서 이 그리드는
 * **"OS 시트에서 가져온 후보 풀"** 이다. 흐름은 이렇게 된다.
 *
 *   열림 → OS 멀티선택 시트 → 돌아온 항목들이 그리드를 채움(전부 선택 상태)
 *        → 그리드에서 순번을 다시 짜거나 빼기 → `앨범에서 고르기` 로 더 추가
 *        → 카메라 타일로 즉석 촬영 추가 → `등록`
 *
 * 목업이 요구하는 것(3열·gap 2·카메라 타일·주황 순번 배지·상단 앨범 드롭다운·하단 등록)은
 * 전부 남는다. 달라지는 것은 타일의 출처 하나다.
 *
 * `즐겨찾기` 항목은 **빼 두었다.** image-picker 의 `mediaTypes` 로는 표현할 수 없고,
 * 눌러도 아무 일이 없는 메뉴를 그리는 것이 프로토타입의 죽은 버튼과 같은 실수다.
 * (`최근 항목` = 사진+영상, `비디오` = 영상만 — 둘은 `mediaTypes` 로 정직하게 구현된다.)
 *
 * ## 되돌리지 말 것
 *
 * - 한도를 넘겼을 때 **앞의 선택을 밀어내지 않는다**(`toggleSelection`). 조용히 사라지는
 *   사진은 사용자가 원인을 알 수 없다. 한도 안내 문구를 띄우고 선택은 그대로 둔다.
 * - 순번은 `indexOf` 가 아니라 `selectionOrderMap` 으로 한 번에 만든다. 타일 100개에서
 *   매 렌더 O(N·M) 이 되면 스크롤이 눈에 보이게 끊긴다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FlatList,
  type ListRenderItemInfo,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  useWindowDimensions,
} from "react-native"
import { AppModal } from "@/src/shared/components/AppModal"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTranslation } from "react-i18next"

import {
  V2Button,
  V2EmptyState,
  V2Icon,
  elevation,
  iconSize,
  radius,
  spacing,
  typography,
  useV2Theme,
} from "@/src/design-system-v2"
import { remoteImageSource } from "@/src/shared/images/remoteImageSource"

import {
  REVIEW_MAX_PHOTOS,
  selectionOrderMap,
  toggleSelection,
} from "../utils/reviewDraft"
import { ModalOverlayHost } from "@/src/shared/components"

import { showConfirm } from "@/src/lib/dialog"

/** 그리드 여백. 목업의 타일 사이는 2px 다 — 사진이 면으로 붙어 보이는 것이 의도다. */
const GRID_GAP = 2
const GRID_COLUMNS = 3
/** 선택 원. 44 를 못 채우므로 타일 전체가 탭 영역이고 원은 표시만 한다. */
const MARK_SIZE = 26

/**
 * 앨범 드롭다운 항목. `mediaTypes` 로 표현되는 것만 남긴다(위 헤더 주석 참고).
 *
 * **영상은 고를 수 없다.** 업로드 엔드포인트가 jpeg/png 만 받고(매직 바이트로 판정한다),
 * 저장 경로에도 영상 자리가 없다(`restaurant_photo.is_video` 는 등록 시 false 로 고정된다).
 * 그런데도 `비디오` 앨범이 있어서, 영상을 고른 사용자는 `등록` 을 누를 때마다 반드시
 * 실패했고 문구는 원인을 말해 주지 않았다("후기를 등록하지 못했어요"). 이 파일 머리말이
 * `즐겨찾기` 를 뺀 이유와 정확히 같다 — **없는 능력을 고르게 하지 않는다.**
 * 영상 업로드가 실제로 생기면 앨범과 `videos` 를 함께 되돌린다.
 */
const ALBUMS = [
  { key: "recent", labelKey: "restaurant.mediaPicker.recent" },
] as const

type AlbumKey = (typeof ALBUMS)[number]["key"]

const MEDIA_TYPES: Record<AlbumKey, ImagePicker.MediaType[]> = {
  recent: ["images"],
}

interface PoolItem {
  uri: string
  isVideo: boolean
}

/**
 * `initialSelection` 의 기본값. 모듈 상수여야 한다 —
 * 기본 매개변수에 `[]` 를 쓰면 렌더마다 새 배열이라 이펙트 의존성이 매번 달라진다.
 */
const EMPTY_SELECTION: readonly string[] = []

export interface MediaPickerProps {
  visible: boolean
  onClose: () => void
  /** 다시 열었을 때 이전 선택과 순번을 유지한다. */
  initialSelection?: readonly string[]
  maxSelection?: number
  /** `등록`. 고른 순서 그대로 로컬 uri 를 돌려준다. */
  onConfirm: (uris: string[]) => void
  style?: ViewStyle
}

export function MediaPicker({
  visible,
  onClose,
  initialSelection = EMPTY_SELECTION,
  maxSelection = REVIEW_MAX_PHOTOS,
  onConfirm,
  style,
}: MediaPickerProps) {
  const { t } = useTranslation("common")
  const { colors } = useV2Theme()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()

  const [album, setAlbum] = useState<AlbumKey>("recent")
  const [albumOpen, setAlbumOpen] = useState(false)
  const [pool, setPool] = useState<PoolItem[]>([])
  const [selected, setSelected] = useState<readonly string[]>(initialSelection)
  const [limitHit, setLimitHit] = useState(false)

  /**
   * 최신 값을 **의존성 배열에 넣지 않고** 읽기 위한 거울.
   *
   * `initialSelection` 을 이펙트 deps 에 넣으면, 호출부가 배열 리터럴을 인라인으로
   * 넘기는 순간(또는 기본값을 쓰는 순간) 매 렌더 새 배열이라 이펙트가 다시 돌고
   * `setSelected` → 리렌더 → 이펙트 → … **무한 루프**가 된다.
   * `selected` 쪽 거울은 `setState` 업데이터 안에서 다른 `setState` 를 부르지 않기 위한 것이다
   * (업데이터는 순수해야 하고 StrictMode 는 두 번 부른다).
   */
  const initialRef = useRef(initialSelection)
  initialRef.current = initialSelection
  const selectedRef = useRef<readonly string[]>(selected)
  selectedRef.current = selected

  /**
   * 열릴 때마다 초안의 선택을 다시 심는다.
   * `useState(initialSelection)` 초기값만 믿으면 두 번째 열기에서 **첫 번째 선택이 남는다** —
   * 프로토타입의 필터 시트가 정확히 그 버그였다(Modal 이 마운트된 채 남아 initializer 가
   * 다시 돌지 않는다).
   */
  useEffect(() => {
    if (!visible) return
    setSelected(initialRef.current)
    setLimitHit(false)
    setAlbumOpen(false)
  }, [visible])

  /** 처음 열렸을 때 한 번만 OS 시트를 띄운다. 빈 그리드로 시작하면 할 수 있는 일이 없다. */
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (!visible) {
      autoOpenedRef.current = false
    }
  }, [visible])

  const tileSize = useMemo(
    () => Math.floor((width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS),
    [width],
  )

  const orderMap = useMemo(() => selectionOrderMap(selected), [selected])

  const warnMediaPermission = useCallback(async () => {
    const confirmed = await showConfirm({
      title: t("restaurant.mediaPicker.permissionTitle"),
      description: t("restaurant.mediaPicker.permissionBody"),
      confirmLabel: t("restaurant.mediaPicker.openSettings"),
      cancelLabel: t("restaurant.mediaPicker.later"),
    })
    if (confirmed) void Linking.openSettings()
  }, [t])

  /** OS 시트에서 가져온 항목을 풀 뒤에 붙이고, 한도 안에서 자동 선택한다. */
  const mergeIntoPool = useCallback(
    (assets: ImagePicker.ImagePickerAsset[]) => {
      if (assets.length === 0) return
      setPool((current) => {
        const known = new Set(current.map((item) => item.uri))
        const added = assets
          .filter((asset) => !known.has(asset.uri))
          .map((asset) => ({
            uri: asset.uri,
            isVideo: asset.type === "video",
          }))
        return added.length > 0 ? [...current, ...added] : current
      })
      const base = selectedRef.current
      const next = [...base]
      let wanted = 0
      for (const asset of assets) {
        if (base.includes(asset.uri)) continue
        wanted += 1
        if (next.length >= maxSelection) continue
        next.push(asset.uri)
      }
      selectedRef.current = next
      setSelected(next)
      // 고르려 한 것보다 적게 담겼다 = 한도에 걸렸다.
      setLimitHit(next.length - base.length < wanted)
    },
    [maxSelection],
  )

  const openLibrary = useCallback(
    async (target: AlbumKey) => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (permission.status !== "granted") {
        warnMediaPermission()
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: MEDIA_TYPES[target],
        allowsMultipleSelection: true,
        selectionLimit: maxSelection,
        quality: 0.8,
      })
      if (result.canceled) return
      mergeIntoPool(result.assets)
    },
    [maxSelection, mergeIntoPool, warnMediaPermission],
  )

  /*
    자동 열기는 visible 이펙트가 아니라 Modal 의 onShow 에서 한다. 이펙트에서
    열면 이 Modal 의 present 와 사진 피커(네이티브 VC)의 present 가 같은 틱에
    겹친다 — iOS 프리징 계열(appModalGate 머리말). onShow 는 present 전환이
    끝난 뒤에 오므로 겹칠 수 없다.
  */
  const handleShown = () => {
    if (autoOpenedRef.current) return
    autoOpenedRef.current = true
    // 최초 1회만. `album` 변경은 아래 `selectAlbum` 이 직접 처리한다.
    void openLibrary(album)
  }

  const selectAlbum = useCallback(
    (target: AlbumKey) => {
      setAlbum(target)
      setAlbumOpen(false)
      void openLibrary(target)
    },
    [openLibrary],
  )

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (permission.status !== "granted") {
      const confirmed = await showConfirm({
        title: t("restaurant.mediaPicker.cameraPermissionTitle"),
        description: t("restaurant.mediaPicker.cameraPermissionBody"),
        confirmLabel: t("restaurant.mediaPicker.openSettings"),
        cancelLabel: t("restaurant.mediaPicker.later"),
      })
      if (confirmed) void Linking.openSettings()
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (result.canceled) return
    mergeIntoPool(result.assets)
  }, [mergeIntoPool, t])

  const toggle = useCallback(
    (uri: string) => {
      const current = selectedRef.current
      const next = toggleSelection(current, uri, maxSelection)
      selectedRef.current = next
      setSelected(next)
      // 바뀌지 않았고 원래 없던 uri 였다면, 막힌 이유는 한도뿐이다.
      setLimitHit(next === current && !current.includes(uri))
    },
    [maxSelection],
  )

  const data = useMemo<(PoolItem | null)[]>(() => [null, ...pool], [pool])

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PoolItem | null>) => {
      const tile: ViewStyle = { width: tileSize, height: tileSize }
      if (item === null) {
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.mediaPicker.camera")}
            onPress={() => void takePhoto()}
            style={({ pressed }) => [
              tile,
              styles.cameraTile,
              { backgroundColor: colors.fill.background },
              pressed && styles.pressedTile,
            ]}
          >
            <V2Icon name="camera" size="lg" color={colors.label.alternative} />
            <Text
              style={[
                typography.caption.small,
                styles.cameraLabel,
                { color: colors.label.neutral },
              ]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {t("restaurant.review.form.mediaPick")}
            </Text>
          </Pressable>
        )
      }

      const order = orderMap.get(item.uri)
      const isSelected = order !== undefined
      return (
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={
            isSelected
              ? t("restaurant.mediaPicker.selected", { current: order })
              : t("restaurant.mediaPicker.select")
          }
          accessibilityHint={
            isSelected ? t("restaurant.mediaPicker.deselect") : undefined
          }
          onPress={() => toggle(item.uri)}
          style={({ pressed }) => [tile, pressed && styles.pressedTile]}
        >
          <Image
            source={remoteImageSource(item.uri)}
            style={styles.tileImage}
            contentFit="cover"
            transition={120}
          />
          {item.isVideo ? (
            <View style={styles.videoBadge}>
              <V2Icon name="playCircle" size="sm" color={colors.static.white} />
            </View>
          ) : null}
          <View
            style={[
              styles.mark,
              isSelected
                ? {
                    backgroundColor: colors.primary.primary,
                    borderColor: colors.primary.primary,
                  }
                : {
                    backgroundColor: "transparent",
                    borderColor: colors.static.white,
                  },
            ]}
          >
            {isSelected ? (
              <Text
                style={[
                  typography.caption.small,
                  styles.markText,
                  { color: colors.static.white },
                ]}
              >
                {order}
              </Text>
            ) : null}
          </View>
        </Pressable>
      )
    },
    [colors, orderMap, t, takePhoto, tileSize, toggle],
  )

  const albumLabelKey = ALBUMS.find((item) => item.key === album)?.labelKey
  const selectedList = useMemo(() => [...selected], [selected])

  return (
    <AppModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShown}
      statusBarTranslucent
    >
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background.default,
            paddingTop: insets.top,
          },
          style,
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.mediaPicker.close")}
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.headerBack,
              pressed && styles.pressedRow,
            ]}
          >
            <V2Icon name="chevronLeft" size="md" color={colors.label.normal} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("restaurant.mediaPicker.albumLabel")}
            accessibilityState={{ expanded: albumOpen }}
            onPress={() => setAlbumOpen((open) => !open)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.albumButton,
              pressed && styles.pressedRow,
            ]}
          >
            <Text
              style={[typography.label.medium, { color: colors.label.normal }]}
            >
              {albumLabelKey ? t(albumLabelKey) : ""}
            </Text>
            <V2Icon name="chevronDown" size="sm" color={colors.label.neutral} />
          </Pressable>
        </View>

        {albumOpen ? (
          <View
            style={[
              styles.dropdown,
              elevation[2],
              {
                top: insets.top + 48,
                backgroundColor: colors.background.floated,
              },
            ]}
          >
            {ALBUMS.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: item.key === album }}
                onPress={() => selectAlbum(item.key)}
                style={({ pressed }) => [
                  styles.dropdownRow,
                  pressed && styles.pressedRow,
                ]}
              >
                <Text
                  style={[
                    typography.body.mediumWeak,
                    {
                      color:
                        item.key === album
                          ? colors.label.normal
                          : colors.label.neutral,
                    },
                  ]}
                >
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/*
          `data` 의 첫 칸은 늘 카메라 타일이라 FlatList 는 절대 비지 않는다 —
          그래서 빈 안내는 `ListEmptyComponent` 가 아니라 푸터 슬롯에 둔다.
          카메라 타일을 지운 채 안내만 띄우면 즉석 촬영 경로가 사라진다.
        */}
        <FlatList
          data={data}
          keyExtractor={(item, index) => item?.uri ?? `camera-${index}`}
          numColumns={GRID_COLUMNS}
          renderItem={renderItem}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.grid}
          style={styles.list}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            pool.length === 0 ? (
              <V2EmptyState
                surface="restaurant_media_picker"
                icon="gallery"
                title={t("restaurant.mediaPicker.emptyTitle")}
                description={t("restaurant.mediaPicker.emptyBody")}
                actionLabel={t("restaurant.mediaPicker.pickFromAlbum")}
                onAction={() => void openLibrary(album)}
                style={styles.empty}
              />
            ) : null
          }
        />

        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background.default,
              paddingBottom: insets.bottom + spacing[12],
            },
          ]}
        >
          {limitHit ? (
            <Text
              style={[
                typography.subtext.medium,
                styles.limitText,
                { color: colors.status.negative },
              ]}
              lineBreakStrategyIOS="hangul-word"
              textBreakStrategy="balanced"
            >
              {t("restaurant.mediaPicker.limit", { count: maxSelection })}
            </Text>
          ) : null}
          <V2Button
            size="xl"
            color="brand"
            variant="fill"
            fullWidth
            onPress={() => onConfirm(selectedList)}
          >
            {t("restaurant.mediaPicker.submit")}
          </V2Button>
        </View>
      </View>

      {/* 이 모달이 루트 다이얼로그를 덮으므로 안쪽에도 호스트를 둔다 (권한 안내가 여기서 뜬다) */}
      <ModalOverlayHost />
    </AppModal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[16],
  },
  headerBack: { position: "absolute", left: spacing[16] },
  albumButton: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  dropdown: {
    position: "absolute",
    alignSelf: "center",
    minWidth: 200,
    borderRadius: radius.lg,
    paddingVertical: spacing[8],
    zIndex: 2,
  },
  dropdownRow: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing[24],
  },
  list: { flex: 1 },
  grid: { paddingBottom: spacing[16] },
  column: { gap: GRID_GAP, marginBottom: GRID_GAP },
  cameraTile: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[6],
  },
  cameraLabel: { textAlign: "center" },
  tileImage: { width: "100%", height: "100%" },
  pressedTile: { opacity: 0.9 },
  pressedRow: { opacity: 0.6 },
  mark: {
    position: "absolute",
    top: spacing[6],
    right: spacing[6],
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { textAlign: "center" },
  videoBadge: {
    position: "absolute",
    left: spacing[6],
    bottom: spacing[6],
    width: iconSize.sm,
    height: iconSize.sm,
  },
  empty: { paddingTop: spacing[32] },
  footer: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[12],
    gap: spacing[8],
  },
  limitText: { textAlign: "center" },
})
