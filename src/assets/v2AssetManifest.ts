// Design System v2 — replaceable sample asset manifest.
// New v2 consumers import a semantic role from here instead of referring to a
// filename. When the approved asset arrives, replace only the manifest source.

import type { ImageSourcePropType } from "react-native"

export type V2SampleAsset = {
  source: ImageSourcePropType
  kind: "sample"
  replacementStatus: "pending"
  intendedRole: string
}

// Keep the one temporary source centralized. It is project-owned and is not a
// medical status, account identity, or brand-logo substitute.
const sampleImage = require("@/assets/images/SIn_2.png")

export const v2AssetManifest = {
  genericCard: {
    source: sampleImage,
    kind: "sample",
    replacementStatus: "pending",
    intendedRole: "Temporary neutral artwork for a generic content card.",
  },
  emptyMedia: {
    source: sampleImage,
    kind: "sample",
    replacementStatus: "pending",
    intendedRole: "Temporary neutral artwork where optional media is absent.",
  },
  fallbackThumbnail: {
    source: sampleImage,
    kind: "sample",
    replacementStatus: "pending",
    intendedRole:
      "Temporary neutral thumbnail while a domain image is pending.",
  },
} as const satisfies Record<string, V2SampleAsset>

export type V2AssetRole = keyof typeof v2AssetManifest
