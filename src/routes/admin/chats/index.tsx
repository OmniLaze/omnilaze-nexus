import { createFileRoute } from '@tanstack/react-router'
import Chats from '@/features/chats'

export const Route = createFileRoute('/admin/chats/')({
  component: Chats,
})
