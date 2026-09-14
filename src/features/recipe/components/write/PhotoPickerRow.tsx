/**
 * 대표 사진 타일 줄. 라벨·간격은 `recordPageSpec`, 타일은 키트 텍스트 면과 같은
 * 모서리(`FIELD.radius`)·바탕(`s.surfaceSunken`)이다.
 *
 * 사진 위 스크림(`rgba` 반투명)은 면이 아니라 사진을 덮는 칠이라 사다리 밖이다
 * (`tests/surfaceLadderGuard` §L4 가 알고 남긴 예외). 글자는 v2 `static.white`.
 */

import { Image, StyleSheet, View, Pressable } from "react-native"
import Ionicons from "@expo/vector-icons/Ionicons"
import { V2Text, useV2Theme } from "@/src/design-system-v2"
import { useSurface } from "@/src/hooks/useSurface"
import { RECIPE_WRITE_LIMITS } from "@/src/features/recipe/types/recipeWrite"
import {
  FIELD,
  FORM,
  S,
} from "@/src/features/home/components/record/pages/recordPageSpec"
import type { PhotoRow } from "./writeFormState"

const THUMB = FIELD.height - S[3]
const PHOTO_SCRIM = "rgba(0,0,0,0.55)"
const REMOVE_SCRIM = "rgba(0,0,0,0.7)"

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
  const { colors } = useV2Theme()
  const overlayInk = colors.static.white
  const atLimit = photos.length >= RECIPE_WRITE_LIMITS.imageMax
  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <V2Text style={styles.label} color={s.textStrong}>
          {label}
        </V2Text>
        <V2Text style={styles.hint} color={s.text}>
          {copy.optionalMark}
        </V2Text>
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
                <V2Text style={styles.overlayText} color={overlayInk}>
                  {photo.status === "failed" ? copy.failed : copy.uploading}
                </V2Text>
                {photo.status === "failed" ? (
                  <V2Text style={styles.overlayAction} color={overlayInk}>
                    {copy.retry}
                  </V2Text>
                ) : null}
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => onRemove(photo.id)}
              accessibilityRole="button"
              accessibilityLabel={copy.remove}
              hitSlop={S[2]}
              style={styles.removeButton}
            >
              <Ionicons name="close" size={14} color={overlayInk} />
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
              {
                backgroundColor: pressed ? s.surfacePressed : s.surfaceSunken,
              },
            ]}
          >
            <Ionicons name="add" size={22} color={s.text} />
          </Pressable>
        )}
      </View>
      {atLimit ? (
        <V2Text style={styles.hint} color={s.text}>
          {copy.limitReached}
        </V2Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: FORM.labelGap },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: S[2] },
  label: FORM.label,
  hint: FORM.hint,
  row: { flexDirection: "row", flexWrap: "wrap", gap: S[2] },
  thumbWrap: { width: THUMB, height: THUMB },
  thumb: { width: THUMB, height: THUMB, borderRadius: FIELD.radius },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: FIELD.radius,
    backgroundColor: PHOTO_SCRIM,
    alignItems: "center",
    justifyContent: "center",
    gap: S[1],
  },
  overlayText: FORM.hint,
  overlayAction: FORM.option,
  removeButton: {
    position: "absolute",
    top: -S[2],
    right: -S[2],
    width: S[6],
    height: S[6],
    borderRadius: S[3],
    backgroundColor: REMOVE_SCRIM,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: THUMB,
    height: THUMB,
    borderRadius: FIELD.radius,
    alignItems: "center",
    justifyContent: "center",
  },
})
