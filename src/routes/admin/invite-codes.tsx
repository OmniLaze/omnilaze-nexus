import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { SystemKeyAlert } from '@/components/admin/SystemKeyAlert'
import { CreateInviteCodeDialog } from '@/features/invite-codes/components/create-invite-code-dialog'

type InviteCodeRow = {
  code: string
  max_uses: number
  current_uses: number
  remaining_uses: number
  created_at: string
  used_by?: string | null
  used_at?: string | null
}

type InvitationRow = {
  id: string
  inviterUserId: string
  inviteeUserId?: string | null
  inviteCode: string
  inviteePhone: string
  invitedAt: string
}

export const Route = createFileRoute('/admin/invite-codes')({
  component: InviteCodesPage,
})

function InviteCodesPage() {
  const [tab, setTab] = useState<'codes'|'invitations'>('codes')
  const [codes, setCodes] = useState<InviteCodeRow[]>([])
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const fetchCodes = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/invite-codes')
      if (!res.data?.success) throw new Error(res.data?.message || '加载失败')
      setCodes(res.data.data || [])
      setAuthError(false)
    } catch (e: any) {
      if (e?.response?.status === 401) {
        setAuthError(true)
        toast.error('未授权：可能缺少系统密钥')
      } else {
        setAuthError(false)
        toast.error(e?.message || '加载失败')
      }
    } finally {
      setLoading(false)
    }
  }
  const fetchInvitations = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/invitations', { params: { limit: 100 } })
      if (!res.data?.success) throw new Error(res.data?.message || '加载失败')
      setInvitations(res.data.data?.items || [])
      setAuthError(false)
    } catch (e: any) {
      if (e?.response?.status === 401) {
        setAuthError(true)
        toast.error('未授权：可能缺少系统密钥')
      } else {
        setAuthError(false)
        toast.error(e?.message || '加载失败')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'codes') fetchCodes()
    else fetchInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <>
      <Header>
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
        </div>
      </Header>
      <Main>
        {authError && <SystemKeyAlert />}
        <div className='mb-2 flex items-center justify-between'>
          <h1 className='text-2xl font-bold tracking-tight'>邀请管理</h1>
          {tab === 'codes' && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <IconPlus className='mr-2' size={16} />
              创建邀请码
            </Button>
          )}
        </div>
        <div className='mb-3 flex items-center gap-2'>
          <button
            onClick={() => setTab('codes')}
            className={`h-9 rounded-md border px-3 text-sm ${tab==='codes'?'bg-gray-100':''}`}
          >邀请码</button>
          <button
            onClick={() => setTab('invitations')}
            className={`h-9 rounded-md border px-3 text-sm ${tab==='invitations'?'bg-gray-100':''}`}
          >邀请记录</button>
          <button onClick={() => (tab==='codes'?fetchCodes():fetchInvitations())} className='h-9 rounded-md border bg-white px-3 text-sm hover:bg-gray-50'>刷新</button>
          {loading && <span className='text-xs text-muted-foreground'>加载中…</span>}
        </div>

        {tab === 'codes' ? (
          <div className='overflow-auto rounded-md border'>
            <table className='min-w-[900px] w-full text-sm'>
              <thead className='bg-gray-50 text-left'>
                <tr>
                  <th className='px-3 py-2'>邀请码</th>
                  <th className='px-3 py-2'>最大次数</th>
                  <th className='px-3 py-2'>已使用</th>
                  <th className='px-3 py-2'>剩余</th>
                  <th className='px-3 py-2'>创建时间</th>
                  <th className='px-3 py-2'>最后使用者/时间</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.code} className='border-t'>
                    <td className='px-3 py-2 font-mono'>{c.code}</td>
                    <td className='px-3 py-2'>{c.max_uses}</td>
                    <td className='px-3 py-2'>{c.current_uses}</td>
                    <td className='px-3 py-2'>{c.remaining_uses}</td>
                    <td className='px-3 py-2'>{c.created_at ? new Date(c.created_at).toLocaleString() : '-'}</td>
                    <td className='px-3 py-2'>
                      {(c.used_by || c.used_at) ? `${c.used_by || ''} ${c.used_at ? new Date(c.used_at).toLocaleString() : ''}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className='overflow-auto rounded-md border'>
            <table className='min-w-[900px] w-full text-sm'>
              <thead className='bg-gray-50 text-left'>
                <tr>
                  <th className='px-3 py-2'>邀请人ID</th>
                  <th className='px-3 py-2'>被邀人ID</th>
                  <th className='px-3 py-2'>被邀手机号</th>
                  <th className='px-3 py-2'>邀请码</th>
                  <th className='px-3 py-2'>邀请时间</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((i) => (
                  <tr key={i.id} className='border-t'>
                    <td className='px-3 py-2 font-mono'>{i.inviterUserId}</td>
                    <td className='px-3 py-2 font-mono'>{i.inviteeUserId || '—'}</td>
                    <td className='px-3 py-2'>{i.inviteePhone}</td>
                    <td className='px-3 py-2 font-mono'>{i.inviteCode}</td>
                    <td className='px-3 py-2'>{new Date(i.invitedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Main>
      
      <CreateInviteCodeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          if (tab === 'codes') {
            fetchCodes()
          }
        }}
      />
    </>
  )
}
