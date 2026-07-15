import type {
  DateAnalysisResponse,
  DiaryAnalysisResult,
  FoodCameraAnalyzeResult,
} from "../src/types"
import {
  ensureMealDiary,
  type MealDiaryPersistenceDependencies,
} from "../src/features/food-analysis/services/mealDiaryPersistence"
import {
  createMealConsultController,
  createSavedMealDeleteController,
  type FoodConsultNavigation,
} from "../src/features/food-analysis/services/mealPersistenceController"

function result(
  overrides: Partial<FoodCameraAnalyzeResult> = {},
): FoodCameraAnalyzeResult {
  return {
    foodAnalysisResultId: 41,
    analysisId: "analysis-41",
    title: "비빔밥",
    servings: 1,
    total: {
      calories: 500,
      carbohydrates: 80,
      protein: 20,
      fat: 12,
      sodium: 700,
      potassium: 500,
      phosphorus: 250,
      water: 100,
    },
    evaluation: { comment: "한줄평", cautionFoods: [] },
    foods: [],
    ...overrides,
  } as FoodCameraAnalyzeResult
}

function dateAnalysis(
  diets: DateAnalysisResponse["result"]["diets"],
): DateAnalysisResponse {
  return {
    isSuccess: true,
    code: "SUCCESS",
    message: "ok",
    timestamp: "2026-07-15T00:00:00Z",
    result: {
      analysis: null,
      diets,
      bodyRecords: { today: null, previous: null },
      bloodPressure: null,
      bloodGlucose: [],
    },
  }
}

function diaryResult(foodAnalysisResultId = 41): DiaryAnalysisResult {
  return {
    ...result({ foodAnalysisResultId }),
    imageUrl: "https://example.test/meal.jpg",
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe("meal consultation persistence", () => {
  test("rapid taps share one save, one refresh, and one navigation", async () => {
    const save = deferred<{
      diaryId: number
      foodAnalysisResultId: number
      analysisId: string
      wasCreated: boolean
    }>()
    const ensureDiary = jest.fn(() => save.promise)
    const events: string[] = []
    const refreshHome = jest.fn(async () => {
      events.push("refresh")
    })
    const navigate = jest.fn((_navigation: FoodConsultNavigation) => {
      events.push("navigate")
    })
    const controller = createMealConsultController({
      ensureDiary,
      refreshHome,
      navigate,
      createRequestId: () => "request-1",
    })
    const input = {
      result: result(),
      mealType: "LUNCH",
      recordDate: "2026-07-15",
    }

    const first = controller.start(input)
    const second = controller.start(input)

    expect(first).toBe(second)
    expect(ensureDiary).toHaveBeenCalledTimes(1)
    save.resolve({
      diaryId: 77,
      foodAnalysisResultId: 41,
      analysisId: "analysis-41",
      wasCreated: true,
    })
    await Promise.all([first, second])

    expect(refreshHome).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(events).toEqual(["refresh", "navigate"])
    const navigation = navigate.mock.calls[0][0]
    const context = JSON.parse(navigation.params.foodConsultContext)
    expect(context).toMatchObject({
      diaryId: 77,
      analysisId: "analysis-41",
      foodAnalysisResultId: 41,
      mealType: "LUNCH",
    })
  })

  test("save failure keeps navigation closed and a later retry can succeed", async () => {
    const ensureDiary = jest
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        diaryId: 88,
        foodAnalysisResultId: 41,
        analysisId: "analysis-41",
        wasCreated: true,
      })
    const navigate = jest.fn()
    const refreshHome = jest.fn(async () => undefined)
    const controller = createMealConsultController({
      ensureDiary,
      refreshHome,
      navigate,
    })
    const input = {
      result: result(),
      mealType: "DINNER",
      recordDate: "2026-07-15",
    }

    await expect(controller.start(input)).rejects.toThrow("offline")
    expect(navigate).not.toHaveBeenCalled()
    expect(refreshHome).not.toHaveBeenCalled()

    await expect(controller.start(input)).resolves.toMatchObject({
      diaryId: 88,
    })
    expect(ensureDiary).toHaveBeenCalledTimes(2)
    expect(refreshHome).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  test("an already-saved analysis skips lookup and registration", async () => {
    const dependencies: MealDiaryPersistenceDependencies = {
      registerDiary: jest.fn(),
      fetchDateAnalysis: jest.fn(),
      fetchDiaryResult: jest.fn(),
    }

    await expect(
      ensureMealDiary(dependencies, {
        result: result(),
        mealType: "LUNCH",
        diaryId: 99,
      }),
    ).resolves.toEqual({
      diaryId: 99,
      foodAnalysisResultId: 41,
      analysisId: "analysis-41",
      wasCreated: false,
    })
    expect(dependencies.registerDiary).not.toHaveBeenCalled()
    expect(dependencies.fetchDateAnalysis).not.toHaveBeenCalled()
    expect(dependencies.fetchDiaryResult).not.toHaveBeenCalled()
  })

  test("a retry discovers the previously saved analysis before writing again", async () => {
    const registerDiary = jest.fn()
    const dependencies: MealDiaryPersistenceDependencies = {
      registerDiary,
      fetchDateAnalysis: jest.fn().mockResolvedValue(
        dateAnalysis([
          {
            diaryId: 111,
            mealType: "DINNER",
            createdAt: "2026-07-15T09:00:00",
            imageUrl: null,
          },
        ]),
      ),
      fetchDiaryResult: jest.fn().mockResolvedValue(diaryResult()),
    }

    await expect(
      ensureMealDiary(dependencies, {
        result: result(),
        mealType: "DINNER",
        recordDate: "2026-07-15",
      }),
    ).resolves.toMatchObject({ diaryId: 111, wasCreated: false })
    expect(registerDiary).not.toHaveBeenCalled()
  })

  test("reconciliation checks every diary with the same meal type", async () => {
    const registerDiary = jest.fn()
    const fetchDiaryResult = jest
      .fn()
      .mockResolvedValueOnce(diaryResult(999))
      .mockResolvedValueOnce(diaryResult(41))
    const dependencies: MealDiaryPersistenceDependencies = {
      registerDiary,
      fetchDateAnalysis: jest.fn().mockResolvedValue(
        dateAnalysis([
          {
            diaryId: 140,
            mealType: "LUNCH",
            createdAt: "2026-07-15T03:00:00",
            imageUrl: null,
          },
          {
            diaryId: 141,
            mealType: "LUNCH",
            createdAt: "2026-07-15T04:00:00",
            imageUrl: null,
          },
        ]),
      ),
      fetchDiaryResult,
    }

    await expect(
      ensureMealDiary(dependencies, {
        result: result(),
        mealType: "LUNCH",
        recordDate: "2026-07-15",
      }),
    ).resolves.toMatchObject({ diaryId: 141, wasCreated: false })
    expect(fetchDiaryResult).toHaveBeenCalledTimes(2)
    expect(fetchDiaryResult).toHaveBeenNthCalledWith(1, 140)
    expect(fetchDiaryResult).toHaveBeenNthCalledWith(2, 141)
    expect(registerDiary).not.toHaveBeenCalled()
  })

  test("a lost save response reconciles the persisted diary without a second write", async () => {
    const fetchDateAnalysis = jest
      .fn()
      .mockResolvedValueOnce(dateAnalysis([]))
      .mockResolvedValueOnce(
        dateAnalysis([
          {
            diaryId: 123,
            mealType: "LUNCH",
            createdAt: "2026-07-15T03:00:00",
            imageUrl: null,
          },
        ]),
      )
    const registerDiary = jest.fn().mockRejectedValue(new Error("timeout"))
    const dependencies: MealDiaryPersistenceDependencies = {
      registerDiary,
      fetchDateAnalysis,
      fetchDiaryResult: jest.fn().mockResolvedValue(diaryResult()),
    }

    await expect(
      ensureMealDiary(dependencies, {
        result: result(),
        mealType: "LUNCH",
        recordDate: "2026-07-15",
      }),
    ).resolves.toMatchObject({ diaryId: 123, wasCreated: true })
    expect(registerDiary).toHaveBeenCalledTimes(1)
  })
})

describe("saved meal deletion", () => {
  test("cancel preserves the saved meal and does not refresh home", async () => {
    const deleteDiary = jest.fn()
    const refreshHome = jest.fn()
    const controller = createSavedMealDeleteController({
      confirmDelete: jest.fn().mockResolvedValue(false),
      deleteDiary,
      refreshHome,
    })

    await expect(controller.remove(77)).resolves.toBe(false)
    expect(deleteDiary).not.toHaveBeenCalled()
    expect(refreshHome).not.toHaveBeenCalled()
  })

  test("confirmed deletion refreshes home after the mutation", async () => {
    const events: string[] = []
    const deleteDiary = jest.fn(async () => {
      events.push("delete")
    })
    const refreshHome = jest.fn(async () => {
      events.push("refresh")
    })
    const controller = createSavedMealDeleteController({
      confirmDelete: jest.fn().mockResolvedValue(true),
      deleteDiary,
      refreshHome,
    })

    await expect(controller.remove(77)).resolves.toBe(true)
    expect(deleteDiary).toHaveBeenCalledWith(77)
    expect(refreshHome).toHaveBeenCalledTimes(1)
    expect(events).toEqual(["delete", "refresh"])
  })
})
