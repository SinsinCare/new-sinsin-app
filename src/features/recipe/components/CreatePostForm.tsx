import { useState } from "react"
import { YStack, XStack, Text, Input, TextArea, Spinner } from "tamagui"
import {
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { tokens } from "@/src/theme/tokens"
import { pickImageFromGallery } from "../services/imagePickerService"

interface CreatePostFormProps {
  onClose: () => void
  onSubmit: (post: {
    authorName: string
    authorRole: string
    imageUri: string | null
    title: string
    description: string
  }) => void
  isSubmitting: boolean
}

export function CreatePostForm({
  onClose,
  onSubmit,
  isSubmitting,
}: CreatePostFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)

  const handlePickImage = async () => {
    const uri = await pickImageFromGallery()
    if (uri) setImageUri(uri)
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("알림", "제목을 입력해주세요.")
      return
    }
    onSubmit({
      authorName: "나",
      authorRole: "홈셰프",
      imageUri,
      title: title.trim(),
      description: description.trim(),
    })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        justifyContent="space-between"
      >
        <Pressable onPress={onClose}>
          <Text fontSize="$5" color="$color">
            취소
          </Text>
        </Pressable>

        <Text fontSize="$5" fontWeight="700" color="$color">
          새 게시물
        </Text>

        <Pressable onPress={handleSubmit} disabled={isSubmitting}>
          <XStack
            backgroundColor="$sub7"
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius={20}
            alignItems="center"
            justifyContent="center"
            opacity={isSubmitting ? 0.6 : 1}
            minWidth={56}
          >
            {isSubmitting ? (
              <Spinner size="small" color="white" />
            ) : (
              <Text fontSize="$4" fontWeight="600" color="white">
                등록
              </Text>
            )}
          </XStack>
        </Pressable>
      </XStack>

      {/* Divider */}
      <YStack height={1} backgroundColor="$borderColor" />

      {/* Scrollable content area below fixed header */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Text input area */}
        <YStack flex={1}>
          <Input
            placeholder="제목을 입력하세요"
            value={title}
            onChangeText={setTitle}
            fontSize="$6"
            fontWeight="600"
            borderWidth={0}
            backgroundColor="transparent"
            paddingHorizontal="$4"
            paddingVertical="$3"
          />

          {/* Divider between title and description */}
          <YStack height={1} backgroundColor="$borderColor" />

          <TextArea
            placeholder="신장에 좋은 레시피를 공유해보세요..."
            value={description}
            onChangeText={setDescription}
            fontSize="$4"
            borderWidth={0}
            backgroundColor="transparent"
            paddingHorizontal="$4"
            paddingVertical="$3"
            flex={1}
            textAlignVertical="top"
          />
        </YStack>

        {/* Divider */}
        <YStack height={1} backgroundColor="$borderColor" />

        {/* Photo section */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
          }}
        >
          {/* Add photo button - always visible */}
          <Pressable onPress={handlePickImage}>
            <YStack
              width={100}
              height={100}
              borderWidth={1.5}
              borderColor="$borderColor"
              borderRadius="$4"
              borderStyle="dashed"
              alignItems="center"
              justifyContent="center"
              gap="$1"
            >
              <Ionicons
                name="camera-outline"
                size={28}
                color={tokens.color.grey5.val}
              />
              <Text fontSize="$3" color="$colorSubtle">
                사진 추가
              </Text>
            </YStack>
          </Pressable>

          {/* Selected photo thumbnail */}
          {imageUri && (
            <YStack
              width={100}
              height={100}
              borderRadius="$4"
              overflow="hidden"
            >
              <Pressable onPress={() => setPreviewVisible(true)}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: 100, height: 100 }}
                  contentFit="cover"
                />
              </Pressable>
              <Pressable
                onPress={() => setImageUri(null)}
                style={{ position: "absolute", top: 4, right: 4 }}
              >
                <YStack
                  backgroundColor="rgba(0,0,0,0.6)"
                  borderRadius={12}
                  width={24}
                  height={24}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="close" size={14} color="white" />
                </YStack>
              </Pressable>
            </YStack>
          )}
        </ScrollView>

        {/* Bottom divider */}
        <YStack height={1} backgroundColor="$borderColor" />
      </KeyboardAvoidingView>

      {/* Image preview modal */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          onPress={() => setPreviewVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Close button */}
          <Pressable
            onPress={() => setPreviewVisible(false)}
            style={{ position: "absolute", top: 60, right: 20, zIndex: 1 }}
          >
            <YStack
              backgroundColor="rgba(255,255,255,0.2)"
              borderRadius={20}
              width={40}
              height={40}
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name="close" size={24} color="white" />
            </YStack>
          </Pressable>

          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "90%", height: "70%" }}
              contentFit="contain"
            />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
