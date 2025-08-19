import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { api } from '@/lib/api'
import { toast } from 'sonner'

type AdminUser = {
  id: string
  phoneNumber: string
  role: string
  createdAt: string
  inviteCode?: string | null
  userInviteCode?: string | null
  userSequence?: number | null
}

export const Route = createFileRoute('/_authenticated/users')({
  component: UsersPage,
})

function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  const fetchUsers = async () => {
    try {
      const res = await api.get('/v1/admin/users', { params: { q, page, limit } })
      if (!res.data?.success) throw new Error(res.data?.message || '加载失败')
      setItems(res.data.data?.items || [])
      setTotal(res.data.data?.total || 0)
    } catch (e: any) {
      toast.error(e?.message || '加载失败')
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page])

  const pages = Math.max(1, Math.ceil(total / limit))

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
          <h1 className='text-2xl font-bold tracking-tight'>用户管理</h1>
        </div>
        <div className='mb-3 flex items-center gap-2'>
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value) }}
            placeholder='搜索：手机号/ID/我的邀请码'
            className='h-9 w-72 rounded-md border px-3 text-sm'
          />
          <button onClick={fetchUsers} className='h-9 rounded-md border bg-white px-3 text-sm hover:bg-gray-50'>刷新</button>
          <div className='text-xs text-muted-foreground'>共 {total} 个用户</div>
        </div>
        <div className='overflow-auto rounded-md border'>
          <table className='min-w-[900px] w-full text-sm'>
            <thead className='bg-gray-50 text-left'>
              <tr>
                <th className='px-3 py-2'>用户ID</th>
                <th className='px-3 py-2'>手机号</th>
                <th className='px-3 py-2'>角色</th>
                <th className='px-3 py-2'>邀请码</th>
                <th className='px-3 py-2'>我的邀请码</th>
                <th className='px-3 py-2'>注册序号</th>
                <th className='px-3 py-2'>注册时间</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className='border-t'>
                  <td className='px-3 py-2 font-mono'>{u.id}</td>
                  <td className='px-3 py-2'>{u.phoneNumber}</td>
                  <td className='px-3 py-2'>{u.role}</td>
                  <td className='px-3 py-2'>{u.inviteCode || '—'}</td>
                  <td className='px-3 py-2'>{u.userInviteCode || '—'}</td>
                  <td className='px-3 py-2'>{u.userSequence ?? '—'}</td>
                  <td className='px-3 py-2'>{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className='mt-3 flex items-center gap-2'>
          <button disabled={page<=1} onClick={() => setPage((p) => Math.max(1, p-1))} className='h-8 rounded-md border bg-white px-2 text-sm disabled:opacity-50'>上一页</button>
          <span className='text-xs text-muted-foreground'>第 {page} / {pages} 页</span>
          <button disabled={page>=pages} onClick={() => setPage((p) => Math.min(pages, p+1))} className='h-8 rounded-md border bg-white px-2 text-sm disabled:opacity-50'>下一页</button>
        </div>
      </Main>
    </>
  )
}
