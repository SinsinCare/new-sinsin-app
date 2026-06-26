import { useEffect, useRef, useState } from "react"
import { Animated, TextInput } from "react-native"
import { FoodCameraAnalyzeResult } from "@/src/types"
import { THUMB_SIZE, UNIT_OPTIONS, UnitOption } from "../data/foodEditConstants"
import { calcThumbPosition, getInitialEatenStep } from "../utils/foodEditUtils"
import { MealType } from "../types"

export function useFoodEdit(
  result: FoodCameraAnalyzeResult | null,
  mealType: MealType | null,
) {
  // --- state ---
  const [foods, setFoods] = useState(
    (result?.foods ?? []).map((f) => ({
      ...f,
      amount: String(f.servingSizeValue ?? ""),
      unit: f.servingSizeUnit,
    })),
  )
  const [mealName, setMealName] = useState(result?.title ?? "")
  const [isNameEdit, setIsNameEdit] = useState(false)
  const [editingName, setEditingName] = useState("")
  const [eatenStep, setEatenStep] = useState(
    getInitialEatenStep(result?.eatenPercentage),
  )
  const [trackWidth, setTrackWidth] = useState(0)
  const [addStep, setAddStep] = useState<"idle" | "name" | "amount">("idle")
  const [newMenuName, setNewMenuName] = useState("")
  const [newMenuAmount, setNewMenuAmount] = useState("")
  const [newMenuUnit, setNewMenuUnit] = useState<UnitOption>(UNIT_OPTIONS[0])

  // --- refs ---
  const nameEditInputRef = useRef<TextInput>(null)
  const nameInputRef = useRef<TextInput>(null)
  const amountInputRef = useRef<TextInput>(null)
  const thumbAnim = useRef(new Animated.Value(0)).current
  const draggingRef = useRef(false)

  // --- effects ---
  useEffect(() => {
    // 드래그 중에는 썸이 손가락을 직접 따라가므로 스냅 애니메이션을 걸지 않는다
    if (trackWidth === 0 || draggingRef.current) return
    Animated.spring(thumbAnim, {
      toValue: calcThumbPosition(eatenStep, trackWidth),
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start()
  }, [eatenStep, trackWidth, thumbAnim])

  // --- handlers ---
  const handleNameEdit = () => {
    setEditingName("")
    setIsNameEdit(true)
    setTimeout(() => nameEditInputRef.current?.focus(), 100)
  }

  const handleNameConfirm = () => {
    if (editingName.trim()) setMealName(editingName.trim())
    setIsNameEdit(false)
  }

  const handleAmountChange = (index: number, value: string) => {
    setFoods((prev) =>
      prev.map((f, i) => (i === index ? { ...f, amount: value } : f)),
    )
  }

  const handleFoodNameChange = (index: number, value: string) => {
    setFoods((prev) =>
      prev.map((f, i) => (i === index ? { ...f, name: value } : f)),
    )
  }

  const handleDelete = (index: number) => {
    setFoods((prev) => prev.filter((_, i) => i !== index))
  }

  const stepFromX = (locationX: number) => {
    const x = Math.max(0, Math.min(locationX, trackWidth))
    return Math.max(0, Math.min(3, Math.floor(x / (trackWidth / 4))))
  }

  // 드래그 중: 썸이 손가락을 그대로 따라오고, 라벨은 가까운 단계로 표시
  const handleTrackMove = (locationX: number) => {
    if (trackWidth === 0) return
    draggingRef.current = true
    const x = Math.max(0, Math.min(locationX, trackWidth))
    thumbAnim.setValue(x - THUMB_SIZE / 2)
    setEatenStep(stepFromX(locationX))
  }

  // 손을 뗐을 때: 가장 가까운 단계로 스냅
  const handleTrackRelease = (locationX: number) => {
    if (trackWidth === 0) return
    draggingRef.current = false
    const step = stepFromX(locationX)
    setEatenStep(step)
    Animated.spring(thumbAnim, {
      toValue: calcThumbPosition(step, trackWidth),
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start()
  }

  const handleAddMenu = () => {
    setAddStep("name")
    setNewMenuName("")
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }

  const handleNameSubmit = () => {
    if (!newMenuName.trim()) return
    setAddStep("amount")
    setNewMenuAmount("")
    setTimeout(() => amountInputRef.current?.focus(), 100)
  }

  const handleAmountSubmit = () => {
    setFoods((prev) => [
      {
        name: newMenuName.trim(),
        amount: newMenuAmount,
        unit: newMenuUnit,
        restrictionLevel: "",
        servingSizeValue: newMenuAmount ? Number(newMenuAmount) : null,
        servingSizeUnit: newMenuUnit,
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        sodium: 0,
        potassium: 0,
        phosphorus: 0,
        water: 0,
      },
      ...prev,
    ])
    setAddStep("idle")
    setNewMenuName("")
    setNewMenuAmount("")
  }

  return {
    // state
    foods,
    mealName,
    isNameEdit,
    editingName,
    setEditingName,
    setIsNameEdit,
    eatenStep,
    trackWidth,
    setTrackWidth,
    addStep,
    newMenuName,
    setNewMenuName,
    newMenuAmount,
    setNewMenuAmount,
    newMenuUnit,
    setNewMenuUnit,
    // refs
    nameEditInputRef,
    nameInputRef,
    amountInputRef,
    thumbAnim,
    // handlers
    handleNameEdit,
    handleNameConfirm,
    handleFoodNameChange,
    handleAmountChange,
    handleDelete,
    handleTrackMove,
    handleTrackRelease,
    handleAddMenu,
    handleNameSubmit,
    handleAmountSubmit,
  }
}
