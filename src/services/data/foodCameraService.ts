import type { FoodCameraAnalyzeResult } from "../../types"
import { isMockMode } from "../../config/appConfig"
import { api } from "@/src/services"
import { isAxiosError } from "axios"

export const foodCameraService = {
  async analyze(imageUri: string): Promise<FoodCameraAnalyzeResult> {
    let result: FoodCameraAnalyzeResult

    if (isMockMode()) {
      const { mockFoodCameraService } = require("./mock/mockFoodCameraService") // eslint-disable-line @typescript-eslint/no-require-imports
      result = await mockFoodCameraService.analyze()
    } else {
      const formData = new FormData()
      formData.append("image", {
        uri: imageUri,
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
