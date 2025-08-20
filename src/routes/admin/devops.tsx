import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/devops')({
  component: DevOpsPage,
})

function DevOpsPage() {
  const [busy, setBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [lastRuns, setLastRuns] = useState<any[]>([])
  const triggerDeploy = async () => {
    try {
      setBusy(true)
      const res = await api.post('/admin/aws/deploy', { ref: 'main' })
      if (!res.data?.success) throw new Error(res.data?.message || '触发失败')
      toast.success('已触发部署')
    } catch (e: any) {
      toast.error(e?.message || '触发失败，请检查后端配置')
    } finally {
      setBusy(false)
    }
  }
  const fetchStatus = async () => {
    try {
      setStatusBusy(true)
      const res = await api.get('/admin/aws/status', { params: { per_page: 3 } })
      if (!res.data?.success) throw new Error(res.data?.message || '查询失败')
      setLastRuns(res.data?.data?.runs || [])
      toast.success('已获取部署状态')
    } catch (e: any) {
      toast.error(e?.message || '查询失败，请检查后端配置')
    } finally {
      setStatusBusy(false)
    }
  }
  return (
    <>
      <Header>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className='mb-2 flex items-center justify-between'>
          <h1 className='text-2xl font-bold tracking-tight'>DevOps 同步</h1>
        </div>
        <div className='rounded-md border p-6 text-sm'>
          <div className='flex items-center gap-3'>
            <button
              onClick={triggerDeploy}
              disabled={busy}
              className='rounded-md border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {busy ? '触发中…' : '一键部署（触发 GitHub Actions）'}
            </button>
            <span className='text-muted-foreground'>需要在后端配置 GITHUB_TOKEN/GITHUB_REPO/GITHUB_WORKFLOW_ID</span>
          </div>
          <div className='mt-4 flex items-center gap-3'>
            <button
              onClick={fetchStatus}
              disabled={statusBusy}
              className='rounded-md border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {statusBusy ? '查询中…' : '查询部署状态'}
            </button>
          </div>
          {lastRuns.length > 0 && (
            <div className='mt-4 overflow-auto rounded border'>
              <table className='w-full min-w-[700px] text-sm'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-3 py-2 text-left'>运行号</th>
                    <th className='px-3 py-2 text-left'>状态</th>
                    <th className='px-3 py-2 text-left'>结论</th>
                    <th className='px-3 py-2 text-left'>分支</th>
                    <th className='px-3 py-2 text-left'>开始</th>
                    <th className='px-3 py-2 text-left'>链接</th>
                  </tr>
                </thead>
                <tbody>
                  {lastRuns.map((r) => (
                    <tr key={r.id} className='border-t'>
                      <td className='px-3 py-2'>{r.run_number}</td>
                      <td className='px-3 py-2'>{r.status}</td>
                      <td className='px-3 py-2'>{r.conclusion || '-'}</td>
                      <td className='px-3 py-2'>{r.head_branch}</td>
                      <td className='px-3 py-2'>{new Date(r.created_at).toLocaleString()}</td>
                      <td className='px-3 py-2'>
                        <a href={r.html_url} target='_blank' rel='noreferrer' className='text-blue-600 underline'>查看</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Main>
    </>
  )
}
