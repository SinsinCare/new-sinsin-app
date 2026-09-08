/**
 * 대표 사진. 고른 즉시 올려서 `objectPath` 를 받아 둔다(계약 §3.6 `imageObjectPaths`).
 *
 * ## 왜 등록할 때 몰아서 올리지 않는가
 * v1 은 등록을 누른 뒤에 사진을 올렸다. 사진 5장이면 등록 버튼을 누르고 몇 초 동안
 * 아무 일도 안 일어난 것처럼 보이고, 그 사이에 실패하면 **글까지 안 올라간다.**
 * 고른 즉시 올리면 실패한 사진만 다시 시도할 수 있고 등록은 즉시 끝난다.
 *
 * 실패한 사진은 지우지 않고 "못 올렸어요 / 다시 올리기" 로 남긴다 — 조용히 사라지면
 * 사용자는 등록된 레시피에서 사진이 빠진 것을 나중에 발견한다.
 */

import { Image, StyleSheet, View, Pressable } from "react-native"
import { Text } from "@/src/shared/components/AppText"
import Ionicons from "@expo/vector-icons/Ionicons"

import { semanticLight } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { LAYOUT, TYPE } from "@/src/theme/surface"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import type { PhotoRow } from "./writeFormState"

/**
 * 사진 위에 얹는 글자·글리프. **모드를 따라가지 않는다** — 바닥이 사용자의 사진이라
 * 라이트/다크 어느 쪽에서도 같은 흰색이어야 읽힌다. 그래서 `s.textStrong` 이 아니라
 * v2 의 `static.white` 다(`static` 이 "모드와 무관" 이라는 뜻이다).
 */
const OVERLAY_INK = semanticLight.static.white

interface PhotoPickerRowProps {
  label: string
  photos: PhotoRow[]
  onAdd: () => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  copy: {
    add: string
    uploading: string
    failed: string
    retry: string
    remove: string
    limitReached: string
    optionalMark: string
  }
}

export function PhotoPickerRow({
  label,
  photos,
  onAdd,
  onRemove,
  onRetry,
  copy,
}: PhotoPickerRowProps) {
  const s = useSurface()
  const atLimit = photos.length >= RECIPE_WRITE_LIMITS.imageMax

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: s.textStrong }]}>{label}</Text>
        <Text style={[styles.optional, { color: s.textWeak }]}>
          {copy.optionalMark}
        </Text>
      </View>
      <View style={styles.row}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.thumbWrap}>
            <Image source={{ uri: photo.localUri }} style={styles.thumb} />
            {photo.status !== "ready" ? (
              <Pressable
                onPress={() =>
                  photo.status === "failed" ? onRetry(photo.id) : undefined
                }
                accessibilityRole={
                  photo.status === "failed" ? "button" : "image"
                }
                accessibilityLabel={
                  photo.status === "failed" ? copy.retry : copy.uploading
                }
                style={styles.overlay}
              >
                <Text style={styles.overlayText}>
                  {photo.status === "failed" ? copy.failed : copy.uploading}
                </Text>
                {photo.status === "failed" ? (
                  <Text style={styles.overlayAction}>{copy.retry}</Text>
                ) : null}
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => onRemove(photo.id)}
              accessibilityRole="button"
              accessibilityLabel={copy.remove}
              hitSlop={6}
              style={styles.removeButton}
            >
              <Ionicons name="close" size={14} color={OVERLAY_INK} />
            </Pressable>
          </View>
        ))}
        {atLimit ? null : (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={copy.add}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: s.surfaceSunken },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="add" size={22} color={s.textMuted} />
          </Pressable>
        )}
      </View>
      {atLimit ? (
        <Text style={[styles.limit, { color: s.textMuted }]}>
          {copy.limitReached}
        </Text>
      ) : null}
    </View>
  )
}

const THUMB = 76

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  // 다른 쓰기 폼 라벨과 같은 급(`WriteTextField`·`WriteChipRail`).
  label: { ...TYPE.cardTitle, fontWeight: "700" },
  optional: { ...TYPE.cardSub },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: LAYOUT.field.radius,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: LAYOUT.field.radius,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  overlayText: { ...TYPE.caption, fontSize: 11, color: OVERLAY_INK },
  overlayAction: {
    ...TYPE.caption,
    fontSize: 11,
    fontWeight: "700",
    color: OVERLAY_INK,
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: THUMB,
    height: THUMB,
    borderRadius: LAYOUT.field.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  limit: { ...TYPE.cardSub },
})
