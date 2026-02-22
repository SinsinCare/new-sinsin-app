import type { FoodCameraAnalyzeResult } from "../../types"
import { isMockMode } from "../../config/appConfig"
import { api } from "@/src/services"
import { isAxiosError } from "axios"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"

async function compressImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri)
  context.resize({ width: 1024 })
  const image = await context.renderAsync()
  const result = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.5,
  })
  context.release()
  image.release()
  return result.uri
}

export const foodCameraService = {
  async analyze(imageUri: string): Promise<FoodCameraAnalyzeResult> {
    let result: FoodCameraAnalyzeResult

    if (isMockMode()) {
      const { mockFoodCameraService } = require("./mock/mockFoodCameraService") // eslint-disable-line @typescript-eslint/no-require-imports
      result = await mockFoodCameraService.analyze()
    } else {
      const compressedUri = await compressImage(imageUri)

      const formData = new FormData()
      formData.append("image", {
        uri: compressedUri,
        name: `food_${Date.now()}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob)

      try {
        const response = await api.post("/food-camera/analyze", formData, {
          headers: { "Content-Type": undefined },
          transformRequest: (data) => data,
        })
        result = response.data.result as FoodCameraAnalyzeResult
      } catch (err) {
        if (isAxiosError(err) && err.response?.data?.message) {
          throw new Error(err.response.data.message)
        }
        throw err
      }
    }

    return result
  },
}
