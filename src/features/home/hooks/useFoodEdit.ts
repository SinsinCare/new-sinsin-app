import { useEffect, useRef, useState } from "react"
import { Animated, TextInput } from "react-native"
import { FoodCameraAnalyzeResult } from "@/src/types"
import { UNIT_OPTIONS, UnitOption } from "../data/foodEditConstants"
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

  // --- effects ---
  useEffect(() => {
    if (trackWidth === 0) return
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

  const handleTrackTouch = (locationX: number) => {
    if (trackWidth === 0) return
    setEatenStep(Math.min(3, Math.floor(locationX / (trackWidth / 4))))
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
    handleTrackTouch,
    handleAddMenu,
    handleNameSubmit,
    handleAmountSubmit,
  }
}
