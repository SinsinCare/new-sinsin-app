import { TextInput } from "@/src/design-system-v2/primitives/NativeText"
import { useRef, useState } from "react"
import { Keyboard } from "react-native"
import { FoodCameraAnalyzeResult } from "@/src/types"
import { UNIT_OPTIONS, UnitOption } from "../data/foodEditConstants"
import {
  getInitialEatenStep,
  validateMenuAmount,
  validateMenuName,
} from "../utils/foodEditUtils"
import { MealType } from "../types"
import { useTranslation } from "react-i18next"

export function useFoodEdit(
  result: FoodCameraAnalyzeResult | null,
  mealType: MealType | null,
) {
  const { t } = useTranslation()
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
  const [newMenuNameError, setNewMenuNameError] = useState("")
  const [newMenuAmountError, setNewMenuAmountError] = useState("")

  // --- refs ---
  const nameEditInputRef = useRef<TextInput>(null)

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
    setNewMenuAmount("")
    setNewMenuNameError("")
    setNewMenuAmountError("")
  }

  const handleNameSubmit = () => {
    const validation = validateMenuName(
      newMenuName,
      t("foodEdit.enterFoodName"),
    )
    setNewMenuNameError(validation.message)
    if (!validation.isValid) return
    setAddStep("amount")
    setNewMenuAmount("")
    setNewMenuAmountError("")
  }

  const handleAmountSubmit = () => {
    const validation = validateMenuAmount(newMenuAmount, {
      required: t("foodEdit.enterAmount"),
      positive: t("foodEdit.amountPositive"),
    })
    setNewMenuAmountError(validation.message)
    if (!validation.isValid) return
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
    setNewMenuNameError("")
    setNewMenuAmountError("")
    Keyboard.dismiss()
  }

  const handleNewMenuNameChange = (value: string) => {
    setNewMenuName(value)
    if (newMenuNameError) setNewMenuNameError("")
  }

  const handleNewMenuAmountChange = (value: string) => {
    setNewMenuAmount(value)
    if (newMenuAmountError) setNewMenuAmountError("")
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
    newMenuNameError,
    newMenuAmount,
    newMenuAmountError,
    newMenuUnit,
    setNewMenuUnit,
    // refs
    nameEditInputRef,
    // handlers
    handleNameEdit,
    handleNameConfirm,
    handleFoodNameChange,
    handleAmountChange,
    handleDelete,
    handleAddMenu,
    handleNewMenuNameChange,
    handleNewMenuAmountChange,
    handleNameSubmit,
    handleAmountSubmit,
  }
}
