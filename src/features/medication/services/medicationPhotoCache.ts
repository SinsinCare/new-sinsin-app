import { File, Paths } from "expo-file-system"
export function discardMedicationPhotos(photos: { uri: string }[]) {
  for (const photo of photos) {
    if (!photo?.uri?.startsWith(Paths.cache.uri)) continue
    try {
      new File(photo.uri).delete()
    } catch {
      /* OS may already have reclaimed cache. */
    }
  }
}
