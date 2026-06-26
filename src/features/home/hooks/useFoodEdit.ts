import { useRef, useState } from "react"
import { TextInput } from "react-native"
import { FoodCameraAnalyzeResult } from "@/src/types"
import { UNIT_OPTIONS, UnitOption } from "../data/foodEditConstants"
import { getInitialEatenStep } from "../utils/foodEditUtils"
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
  const [addStep, setAddStep] = useState<"idle" | "name" | "amount">("idle")
  const [newMenuName, setNewMenuName] = useState("")
  const [newMenuAmount, setNewMenuAmount] = useState("")
  const [newMenuUnit, setNewMenuUnit] = useState<UnitOption>(UNIT_OPTIONS[0])

  // --- refs ---
  const nameEditInputRef = useRef<TextInput>(null)
  const nameInputRef = useRef<TextInput>(null)
  const amountInputRef = useRef<TextInput>(null)

  // --- handlers ---
  const handleNameEdit = () => {
    setEditingName(mealName)
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
    setEatenStep,
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
    // handlers
    handleNameEdit,
    handleNameConfirm,
    handleFoodNameChange,
    handleAmountChange,
    handleDelete,
    handleAddMenu,
    handleNameSubmit,
    handleAmountSubmit,
  }
}
