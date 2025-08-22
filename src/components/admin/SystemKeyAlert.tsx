import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ShieldAlert } from 'lucide-react'

export function SystemKeyAlert() {
  const hasEnvKey = !!import.meta.env.VITE_SYSTEM_API_KEY
  const hint = hasEnvKey
    ? '已检测到构建时配置了 VITE_SYSTEM_API_KEY，但仍返回 401，请确认后端 SYSTEM_API_KEY 与前端一致并已重新部署。'
    : '未检测到构建时的 VITE_SYSTEM_API_KEY。可临时在浏览器控制台设置 localStorage 后刷新页面。'

  return (
    <Alert className='mb-3'>
      <ShieldAlert />
      <AlertTitle>401 未授权：可能缺少系统密钥</AlertTitle>
      <AlertDescription>
        <p className='mb-1'>{hint}</p>
        <div className='rounded bg-muted px-2 py-1 font-mono text-xs'>
          localStorage.setItem('system_api_key', 'YOUR_SYSTEM_KEY')
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>执行后刷新页面重试。如果需要长期生效，请在构建环境中设置 VITE_SYSTEM_API_KEY 并重新部署。</p>
      </AlertDescription>
    </Alert>
  )
}
