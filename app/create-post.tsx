import { useRouter } from "expo-router"
import { useCommunityPosts } from "@/src/features/recipe/hooks/useCommunityPosts"
import { CreatePostForm } from "@/src/features/recipe/components/CreatePostForm"

export default function CreatePostScreen() {
  const router = useRouter()
  const { createPost, isCreating } = useCommunityPosts()

  const handleSubmit = (post: {
    authorName: string
    authorRole: string
    imageUri: string | null
    title: string
    description: string
  }) => {
    createPost(post, {
      onSuccess: () => router.back(),
    })
  }

  return (
    <CreatePostForm
      onClose={() => router.back()}
      onSubmit={handleSubmit}
      isSubmitting={isCreating}
    />
  )
}
