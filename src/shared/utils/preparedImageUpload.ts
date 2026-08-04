import {
  ImageManipulator,
  SaveFormat,
  type ImageManipulatorContext,
  type ImageRef,
} from "expo-image-manipulator"
import * as FileSystem from "expo-file-system/legacy"
import { Image } from "react-native"

export interface PreparedImageUpload {
  uri: string
  cleanup: () => Promise<void>
}

interface PrepareImageUploadOptions {
  width: number
  compress: number
  cachePrefix: string
}

const IMAGE_METADATA_TIMEOUT_MS = 5_000

/**
 * 업로드용 이미지를 축소하고, 중간 복사본과 변환본의 수명을 한 객체로 묶습니다.
 * 변환 실패 시 원본을 그대로 쓰되 원본은 절대 삭제하지 않습니다.
 */
export async function prepareImageUpload(
  uri: string,
  { width, compress, cachePrefix }: PrepareImageUploadOptions,
): Promise<PreparedImageUpload> {
  const temporaryUris = new Set<string>()
  let context: ImageManipulatorContext | null = null
  let rendered: ImageRef | null = null

  try {
    let sourceUri = uri
    if (uri.startsWith("file://") && FileSystem.cacheDirectory) {
      const destination = `${FileSystem.cacheDirectory}${cachePrefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      await FileSystem.copyAsync({ from: uri, to: destination })
      temporaryUris.add(destination)
      sourceUri = destination
    }

    context = ImageManipulator.manipulate(sourceUri)
    const sourceWidth = await readImageWidth(sourceUri)
    if (sourceWidth !== null && sourceWidth > width) {
      context.resize({ width })
    }
    rendered = await context.renderAsync()
    const result = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress,
    })
    if (result.uri !== uri) temporaryUris.add(result.uri)

    return {
      uri: result.uri,
      cleanup: () => removeTemporaryFiles(temporaryUris),
    }
  } catch {
    await removeTemporaryFiles(temporaryUris)
    return { uri, cleanup: async () => undefined }
  } finally {
    rendered?.release()
    context?.release()
  }
}

function readImageWidth(uri: string): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (width: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(width)
    }
    const timer = setTimeout(() => finish(null), IMAGE_METADATA_TIMEOUT_MS)
    Image.getSize(
      uri,
      (width) => finish(Number.isFinite(width) && width > 0 ? width : null),
      () => finish(null),
    )
  })
}

async function removeTemporaryFiles(uris: ReadonlySet<string>): Promise<void> {
  await Promise.all(
    [...uris].map((temporaryUri) =>
      FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(
        () => undefined,
      ),
    ),
  )
}
