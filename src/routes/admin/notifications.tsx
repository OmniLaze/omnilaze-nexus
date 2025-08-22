import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import NotificationsConfigForm from '@/features/notifications-config/NotificationsConfigForm'

function AdminNotificationsPage() {
  return (
    <>
      <Header>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
        </div>
      </Header>
      <Main>
        <div className='mb-2 flex items-center justify-between'>
          <h1 className='text-2xl font-bold tracking-tight'>通知管理</h1>
        </div>
        <p className='text-sm text-muted-foreground mb-4'>订单支付成功后，按配置通知伙伴。支持“所有人”或“按排班”模式；排班支持星期与时间段；没人值班时可回退到所有人。</p>
        <NotificationsConfigForm />
      </Main>
    </>
  )
}

export const Route = createFileRoute('/admin/notifications')({
  component: AdminNotificationsPage,
})

