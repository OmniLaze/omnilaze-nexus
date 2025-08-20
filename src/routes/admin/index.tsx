import { createFileRoute } from '@tanstack/react-router'
import { Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  component: () => <Navigate to='/admin/orders' />,
})
