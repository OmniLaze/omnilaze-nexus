import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { api } from '@/lib/api'
import RefundDialog from '@/components/refund-dialog'
import { toast } from 'sonner'

type AdminOrder = {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  deliveryAddress: string
  budgetAmount: number
  arrivalImageUrl?: string | null
  phoneNumber?: string
  userSequence?: number | null
  deliveryTime?: string | null
  dietaryRestrictions?: string | null
  foodPreferences?: string | null
  paymentStatus?: string | null
  paidAt?: string | null
}

type AdminOrderDetail = AdminOrder & {
  userId?: string
  phoneNumber?: string
  submittedAt?: string | null
  deliveryTime?: string | null
  dietaryRestrictions?: string | null
  foodPreferences?: string | null
  budgetCurrency?: string | null
  metadata?: any
  updatedAt?: string | null
  paymentStatus?: string | null
  paidAt?: string | null
  paymentId?: string | null
  arrivalImageSource?: string | null
  arrivalImageTakenAt?: string | null
  arrivalImageImportedAt?: string | null
  payments?: Array<{
    id: string
    provider: string
    status: string
    amount: number
    currency: string
    outTradeNo: string
    transactionId?: string | null
    qrCode?: string | null
    createdAt: string
    updatedAt: string
    paidAt?: string | null
  }>
  feedbacks?: Array<{
    id: string
    rating: number
    comment?: string | null
    createdAt: string
  }>
}

export const Route = createFileRoute('/admin/orders')({
  component: OrdersPage,
})

function OrdersPage() {
  const [items, setItems] = useState<AdminOrder[]>([])
  const [status, setStatus] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [paidOnly, setPaidOnly] = useState(false)
  const [since, setSince] = useState<string>('')
  const timerRef = useRef<number | null>(null)
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const fetchOnce = async (incremental = false) => {
    try {
      const params: any = { limit: 50 }
      if (status) params.status = status
      if (incremental && since) params.since = since
      const res = await api.get('/admin/orders', { params })
      if (!res.data?.success) throw new Error(res.data?.message || '加载失败')
      const list: AdminOrder[] = res.data.data?.items || []
      const nextSince: string | null = res.data.data?.next_since || null
      if (incremental) {
        if (list.length > 0) {
          // 合并去重（按 id）
          const map = new Map(items.map((i) => [i.id, i]))
          for (const it of list) map.set(it.id, it)
          const merged = Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          setItems(merged)
        }
      } else {
        setItems(list)
      }
      if (nextSince) setSince(nextSince)
    } catch (e: any) {
      toast.error(e?.message || '加载失败')
    }
  }

  useEffect(() => {
    // 初次加载
    fetchOnce(false)
    // 清理定时器
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 状态切换后重新加载
    setSince('')
    fetchOnce(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = window.setInterval(() => fetchOnce(true), 60 * 1000)
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current)
      }
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [autoRefresh, since, status, items])

  const latestTime = useMemo(() => (items[0]?.createdAt ? new Date(items[0].createdAt).toLocaleString() : '-'), [items])

  const exportCsv = () => {
    const header = ['订单号','状态','时间','地址','金额','到达图URL']
    const rows = items.map(o => [
      o.orderNumber,
      o.status,
      new Date(o.createdAt).toLocaleString(),
      (o.deliveryAddress || '').replace(/\n|\r/g, ' '),
      typeof o.budgetAmount === 'number' ? o.budgetAmount.toFixed(2) : '',
      o.arrivalImageUrl || ''
    ])
    const csv = [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyText = async (label: string, text?: string | null) => {
    try {
      if (!text) throw new Error('无内容')
      await navigator.clipboard.writeText(String(text))
      toast.success(`${label} 已复制`)
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = String(text || '')
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        toast.success(`${label} 已复制`)
      } catch {
        toast.error('复制失败')
      }
    }
  }

  const isFinished = (o: AdminOrder) => o.status === 'completed' || o.status === 'cancelled' || !!o.arrivalImageUrl

  const updateStatus = async (o: AdminOrder, next: string) => {
    try {
      const res = await api.post(`/admin/orders/${o.id}/status`, { status: next })
      if (!res.data?.success) throw new Error(res.data?.message || '更新失败')
      setItems(prev => prev.map(it => (it.id === o.id ? { ...it, status: next } : it)))
      toast.success('状态已更新')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  const Field = ({ label, value, onCopy }: { label: string; value?: string | null; onCopy: () => void }) => (
    <div className='flex items-start gap-2'>
      <div className='shrink-0 w-16 text-xs text-gray-500'>{label}</div>
      <div className='flex-1 break-words'>{value || '—'}</div>
      <button className='shrink-0 rounded border px-2 py-0.5 text-xs hover:bg-gray-50' onClick={onCopy}>复制</button>
    </div>
  )

  const bindArrivalImage = async (order: AdminOrder) => {
    const url = window.prompt(`为订单 ${order.orderNumber} 绑定到达图片 URL：`, '')
    if (!url) return
    try {
      const res = await api.post(`/admin/orders/${order.id}/arrival-image/import`, { image_url: url })
      if (!res.data?.success) throw new Error(res.data?.message || '导入失败')
      toast.success('导入成功')
      // 更新该行
      setItems((prev) => prev.map((it) => (it.id === order.id ? { ...it, arrivalImageUrl: url } : it)))
    } catch (e: any) {
      toast.error(e?.message || '导入失败')
    }
  }

  const openDetail = (o: AdminOrder) => {
    setSelected(o)
    setShowDetail(true)
    // 拉取详情
    ;(async () => {
      try {
        setLoadingDetail(true)
        const res = await api.get(`/admin/orders/${o.id}`)
        if (res.data?.success) {
          const d: AdminOrderDetail = res.data.data
          // 解析 JSON 字段（如果是字符串）
          try {
            if (typeof d.metadata === 'string') d.metadata = JSON.parse(d.metadata)
          } catch {}
          setDetail(d)
        } else {
          setDetail(null)
        }
      } catch {
        setDetail(null)
      } finally {
        setLoadingDetail(false)
      }
    })()
  }
  const uploadArrivalImageFile = async (order: AdminOrder, file: File) => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post(`/admin/orders/${order.id}/arrival-image/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (!res.data?.success) throw new Error(res.data?.message || '上传失败')
      toast.success('上传成功')
      setItems((prev) => prev.map((it) => (it.id === order.id ? { ...it, arrivalImageUrl: res.data?.data?.arrival_image_url || it.arrivalImageUrl } : it)))
      // 刷新详情
      setDetail((d) => (d ? { ...d, arrivalImageUrl: res.data?.data?.arrival_image_url || d.arrivalImageUrl } as any : d))
    } catch (e: any) {
      toast.error(e?.message || '上传失败')
    }
  }

  const [showRefund, setShowRefund] = useState(false)
  const openRefund = () => {
    if (!detail || !detail.payments || detail.payments.length === 0) {
      toast.error('无可退款的支付记录')
      return
    }
    setShowRefund(true)
  }
  const closeDetail = () => setShowDetail(false)

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
          <h1 className='text-2xl font-bold tracking-tight'>订单管理</h1>
          <div className='flex items-center gap-2'>
            <label className='flex items-center gap-2 text-sm'>
              <input type='checkbox' checked={paidOnly} onChange={(e) => setPaidOnly(e.target.checked)} />
              只显示已付款
            </label>
            <button onClick={() => setViewMode(v => (v === 'table' ? 'card' : 'table'))} className='h-9 rounded-md border bg-white px-3 text-sm hover:bg-gray-50'>
              {viewMode === 'table' ? '卡片视图' : '表格视图'}
            </button>
          </div>
        </div>

        <div className='mb-3 flex flex-wrap items-center gap-3'>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className='h-9 rounded-md border px-3 text-sm'
          >
            <option value=''>全部状态</option>
            <option value='draft'>草稿</option>
            <option value='submitted'>已提交</option>
            <option value='processing'>处理中</option>
            <option value='delivering'>配送中</option>
            <option value='completed'>已完成</option>
            <option value='cancelled'>已取消</option>
          </select>
          <label className='flex items-center gap-2 text-sm'>
            <input type='checkbox' checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自动刷新(1m)
          </label>
          <button
            onClick={() => fetchOnce(false)}
            className='h-9 rounded-md border bg-white px-3 text-sm hover:bg-gray-50'
          >
            手动刷新
          </button>
          <button
            onClick={exportCsv}
            className='h-9 rounded-md border bg-white px-3 text-sm hover:bg-gray-50'
          >
            导出CSV
          </button>
          <div className='text-xs text-muted-foreground'>最新时间：{latestTime}</div>
        </div>

        {viewMode === 'table' ? (
        <div className='overflow-auto rounded-md border'>
          <table className='min-w-[1300px] w-full text-sm'>
            <thead className='bg-gray-50 text-left'>
              <tr>
                <th className='px-3 py-2'>订单号</th>
                <th className='px-3 py-2'>状态</th>
                <th className='px-3 py-2'>时间</th>
                <th className='px-3 py-2'>用户序号</th>
                <th className='px-3 py-2'>手机号</th>
                <th className='px-3 py-2'>用餐时间</th>
                <th className='px-3 py-2'>口味</th>
                <th className='px-3 py-2'>忌口</th>
                <th className='px-3 py-2'>地址</th>
                <th className='px-3 py-2'>金额</th>
                <th className='px-3 py-2'>到达图</th>
                <th className='px-3 py-2'>操作</th>
              </tr>
            </thead>
            <tbody>
              {(paidOnly ? items.filter(i => i.paidAt || i.paymentStatus === 'paid') : items).map((o) => (
                <tr key={o.id} className='border-t hover:bg-gray-50 cursor-pointer' onClick={() => openDetail(o)}>
                  <td className='px-3 py-2 font-mono'>{o.orderNumber}</td>
                  <td className='px-3 py-2'>{o.status}</td>
                  <td className='px-3 py-2'>{new Date(o.createdAt).toLocaleString()}</td>
                  <td className='px-3 py-2'>{o.userSequence ?? '—'}</td>
                  <td className='px-3 py-2'>{o.phoneNumber || '—'}</td>
                  <td className='px-3 py-2'>{o.deliveryTime || '—'}</td>
                  <td className='px-3 py-2 max-w-[220px] truncate' title={(() => { try { const a = o.foodPreferences ? JSON.parse(o.foodPreferences) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.foodPreferences || ''}})()}>
                    {(() => { try { const a = o.foodPreferences ? JSON.parse(o.foodPreferences) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.foodPreferences || '—'}})()}
                  </td>
                  <td className='px-3 py-2 max-w-[220px] truncate' title={(() => { try { const a = o.dietaryRestrictions ? JSON.parse(o.dietaryRestrictions) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.dietaryRestrictions || ''}})()}>
                    {(() => { try { const a = o.dietaryRestrictions ? JSON.parse(o.dietaryRestrictions) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.dietaryRestrictions || '—'}})()}
                  </td>
                  <td className='px-3 py-2 max-w-[320px] truncate' title={o.deliveryAddress}>
                    {o.deliveryAddress}
                  </td>
                  <td className='px-3 py-2'>{o.budgetAmount?.toFixed?.(2) ?? '-'}</td>
                  <td className='px-3 py-2'>{o.arrivalImageUrl ? '✅' : '—'}</td>
                  <td className='px-3 py-2'>
                    <button
                      className='rounded-md border bg-white px-2 py-1 text-xs hover:bg-gray-50'
                      onClick={() => bindArrivalImage(o)}
                    >
                      绑定到达图
                    </button>
                    {o.arrivalImageUrl && (
                      <a
                        href={o.arrivalImageUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='ml-2 text-xs text-blue-600 underline'
                      >
                        预览
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <div>
              <div className='mb-2 text-sm font-semibold'>未结束</div>
              <div className='flex flex-col gap-3'>
                {(paidOnly ? items.filter(i => i.paidAt || i.paymentStatus === 'paid') : items).filter(o => !isFinished(o)).map((o) => (
                  <div key={o.id} className='rounded-lg border p-3 shadow-sm bg-white dark:bg-slate-900'>
                    <div className='flex items-center justify-between'>
                      <div className='font-mono text-xs text-gray-500'>#{o.orderNumber}</div>
                      <select value={o.status} onChange={(e) => updateStatus(o, e.target.value)} className='h-8 rounded-md border px-2 text-xs'>
                        <option value='draft'>草稿</option>
                        <option value='submitted'>已提交</option>
                        <option value='processing'>处理中</option>
                        <option value='delivering'>配送中</option>
                        <option value='completed'>已完成</option>
                        <option value='cancelled'>已取消</option>
                      </select>
                    </div>
                    <div className='mt-2 grid grid-cols-1 gap-2 text-sm'>
                      <Field label='地址' value={o.deliveryAddress} onCopy={() => copyText('地址', o.deliveryAddress)} />
                      <Field label='电话' value={o.phoneNumber || ''} onCopy={() => copyText('电话', o.phoneNumber || '')} />
                      <Field label='忌口' value={(() => { try { const a = o.dietaryRestrictions ? JSON.parse(o.dietaryRestrictions) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.dietaryRestrictions || ''}})()} onCopy={() => copyText('忌口', (() => { try { const a = o.dietaryRestrictions ? JSON.parse(o.dietaryRestrictions) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.dietaryRestrictions || ''}})())} />
                      <Field label='口味' value={(() => { try { const a = o.foodPreferences ? JSON.parse(o.foodPreferences) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.foodPreferences || ''}})()} onCopy={() => copyText('口味', (() => { try { const a = o.foodPreferences ? JSON.parse(o.foodPreferences) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.foodPreferences || ''}})())} />
                      <Field label='金额' value={typeof o.budgetAmount === 'number' ? o.budgetAmount.toFixed(2) : ''} onCopy={() => copyText('金额', typeof o.budgetAmount === 'number' ? o.budgetAmount.toFixed(2) : '')} />
                      <Field label='预约时间' value={o.deliveryTime || ''} onCopy={() => copyText('预约时间', o.deliveryTime || '')} />
                    </div>
                    <div className='mt-2 flex items-center gap-2'>
                      <button className='rounded-md border bg-white px-2 py-1 text-xs hover:bg-gray-50' onClick={() => bindArrivalImage(o)}>绑定到达图</button>
                      {o.arrivalImageUrl && <a href={o.arrivalImageUrl} target='_blank' rel='noreferrer' className='text-xs text-blue-600 underline'>预览</a>}
                      {(o.paidAt || o.paymentStatus === 'paid') && <span className='ml-auto rounded bg-green-100 px-2 py-0.5 text-xs text-green-700'>已付款</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className='mb-2 text-sm font-semibold'>已结束</div>
              <div className='flex flex-col gap-3'>
                {(paidOnly ? items.filter(i => i.paidAt || i.paymentStatus === 'paid') : items).filter(o => isFinished(o)).map((o) => (
                  <div key={o.id} className='rounded-lg border p-3 shadow-sm bg-white dark:bg-slate-900'>
                    <div className='flex items-center justify-between'>
                      <div className='font-mono text-xs text-gray-500'>#{o.orderNumber}</div>
                      <select value={o.status} onChange={(e) => updateStatus(o, e.target.value)} className='h-8 rounded-md border px-2 text-xs'>
                        <option value='draft'>草稿</option>
                        <option value='submitted'>已提交</option>
                        <option value='processing'>处理中</option>
                        <option value='delivering'>配送中</option>
                        <option value='completed'>已完成</option>
                        <option value='cancelled'>已取消</option>
                      </select>
                    </div>
                    <div className='mt-2 grid grid-cols-1 gap-2 text-sm'>
                      <Field label='地址' value={o.deliveryAddress} onCopy={() => copyText('地址', o.deliveryAddress)} />
                      <Field label='电话' value={o.phoneNumber || ''} onCopy={() => copyText('电话', o.phoneNumber || '')} />
                      <Field label='忌口' value={(() => { try { const a = o.dietaryRestrictions ? JSON.parse(o.dietaryRestrictions) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.dietaryRestrictions || ''}})()} onCopy={() => copyText('忌口', (() => { try { const a = o.dietaryRestrictions ? JSON.parse(o.dietaryRestrictions) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.dietaryRestrictions || ''}})())} />
                      <Field label='口味' value={(() => { try { const a = o.foodPreferences ? JSON.parse(o.foodPreferences) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.foodPreferences || ''}})()} onCopy={() => copyText('口味', (() => { try { const a = o.foodPreferences ? JSON.parse(o.foodPreferences) : []; return Array.isArray(a)? a.join('、') : String(a);} catch {return o.foodPreferences || ''}})())} />
                      <Field label='金额' value={typeof o.budgetAmount === 'number' ? o.budgetAmount.toFixed(2) : ''} onCopy={() => copyText('金额', typeof o.budgetAmount === 'number' ? o.budgetAmount.toFixed(2) : '')} />
                      <Field label='预约时间' value={o.deliveryTime || ''} onCopy={() => copyText('预约时间', o.deliveryTime || '')} />
                    </div>
                    <div className='mt-2 flex items-center gap-2'>
                      {o.arrivalImageUrl && <a href={o.arrivalImageUrl} target='_blank' rel='noreferrer' className='text-xs text-blue-600 underline'>预览</a>}
                      {(o.paidAt || o.paymentStatus === 'paid') && <span className='ml-auto rounded bg-green-100 px-2 py-0.5 text-xs text-green-700'>已付款</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 详情侧栏 */}
        {showDetail && selected && (
          <div className='fixed inset-0 z-50 flex justify-end bg-black/20' onClick={closeDetail}>
            <div
              className='h-full w-full max-w-[460px] bg-white shadow-xl'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center justify-between border-b p-4'>
                <div className='text-base font-semibold'>订单详情</div>
                <button className='rounded-md border px-2 py-1 text-sm' onClick={closeDetail}>关闭</button>
              </div>
              <div className='space-y-4 p-4 text-sm'>
                <div>
                  <div className='text-xs text-gray-500'>订单号</div>
                  <div className='font-mono'>{selected.orderNumber}</div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <div className='text-xs text-gray-500'>状态</div>
                    <div>{selected.status}</div>
                  </div>
                  <div>
                    <div className='text-xs text-gray-500'>时间</div>
                    <div>{new Date(selected.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div>
                  <div className='text-xs text-gray-500'>配送地址</div>
                  <div className='break-words'>{selected.deliveryAddress}</div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <div className='text-xs text-gray-500'>金额</div>
                    <div>{typeof selected.budgetAmount === 'number' ? selected.budgetAmount.toFixed(2) : '-'}</div>
                  </div>
                  <div>
                    <div className='text-xs text-gray-500'>到达图片</div>
                    <div>{selected.arrivalImageUrl ? '已绑定' : '未绑定'}</div>
                  </div>
                </div>
                {/* 加载中提示 */}
                {loadingDetail && <div className='text-xs text-gray-500'>详情加载中…</div>}

                {/* 详情字段渲染 */}
                {detail && (
                  <>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <div className='text-xs text-gray-500'>用户ID</div>
                        <div className='font-mono break-all'>{detail.userId || '-'}</div>
                      </div>
                      <div>
                        <div className='text-xs text-gray-500'>手机号</div>
                        <div>{detail.phoneNumber || '-'}</div>
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <div className='text-xs text-gray-500'>提交时间</div>
                        <div>{detail.submittedAt ? new Date(detail.submittedAt).toLocaleString() : '-'}</div>
                      </div>
                      <div>
                        <div className='text-xs text-gray-500'>用餐时间</div>
                        <div>{detail.deliveryTime || '-'}</div>
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <div className='text-xs text-gray-500'>币种</div>
                        <div>{detail.budgetCurrency || 'CNY'}</div>
                      </div>
                      <div>
                        <div className='text-xs text-gray-500'>支付状态</div>
                        <div>{detail.paymentStatus || '-'}</div>
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <div className='text-xs text-gray-500'>支付时间</div>
                        <div>{detail.paidAt ? new Date(detail.paidAt).toLocaleString() : '-'}</div>
                      </div>
                      <div>
                        <div className='text-xs text-gray-500'>支付ID</div>
                        <div className='font-mono break-all'>{detail.paymentId || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <div className='text-xs text-gray-500'>食物类型（metadata）</div>
                      <div className='break-words'>
                        {Array.isArray(detail.metadata?.foodType) ? detail.metadata.foodType.join('、') : JSON.stringify(detail.metadata || {})}
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <div className='text-xs text-gray-500'>忌口</div>
                        <div className='break-words'>
                          {(() => {
                            try {
                              const arr = detail.dietaryRestrictions ? JSON.parse(detail.dietaryRestrictions) : []
                              return Array.isArray(arr) ? arr.join('、') : String(arr)
                            } catch { return detail.dietaryRestrictions || '-' }
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className='text-xs text-gray-500'>口味偏好</div>
                        <div className='break-words'>
                          {(() => {
                            try {
                              const arr = detail.foodPreferences ? JSON.parse(detail.foodPreferences) : []
                              return Array.isArray(arr) ? arr.join('、') : String(arr)
                            } catch { return detail.foodPreferences || '-' }
                          })()}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className='text-xs text-gray-500'>到达图元信息</div>
                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <div className='text-xs text-gray-500'>来源</div>
                          <div>{detail.arrivalImageSource || '-'}</div>
                        </div>
                        <div>
                          <div className='text-xs text-gray-500'>拍摄时间</div>
                          <div>{detail.arrivalImageTakenAt ? new Date(detail.arrivalImageTakenAt).toLocaleString() : '-'}</div>
                        </div>
                      </div>
                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <div className='text-xs text-gray-500'>导入时间</div>
                          <div>{detail.arrivalImageImportedAt ? new Date(detail.arrivalImageImportedAt).toLocaleString() : '-'}</div>
                        </div>
                        <div>
                          <div className='text-xs text-gray-500'>图片地址</div>
                          <div className='break-all text-xs'>{selected.arrivalImageUrl || '-'}</div>
                        </div>
                      </div>
                    </div>
                    {/* 支付记录 */}
                    {detail.payments && detail.payments.length > 0 && (
                      <div>
                        <div className='text-sm font-medium'>支付记录</div>
                        <div className='mt-2 overflow-auto rounded border'>
                          <table className='w-full text-xs'>
                            <thead className='bg-gray-50'>
                              <tr>
                                <th className='px-2 py-1 text-left'>时间</th>
                                <th className='px-2 py-1 text-left'>状态</th>
                                <th className='px-2 py-1 text-left'>金额</th>
                                <th className='px-2 py-1 text-left'>渠道</th>
                                <th className='px-2 py-1 text-left'>交易号</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.payments.map((p) => (
                                <tr key={p.id} className='border-t'>
                                  <td className='px-2 py-1'>{new Date(p.createdAt).toLocaleString()}</td>
                                  <td className='px-2 py-1'>{p.status}</td>
                                  <td className='px-2 py-1'>{p.amount?.toFixed?.(2)} {p.currency}</td>
                                  <td className='px-2 py-1'>{p.provider}</td>
                                  <td className='px-2 py-1 break-all'>{p.transactionId || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className='mt-2'>
                          <button
                            className='rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50'
                            onClick={openRefund}
                          >
                            申请退款（默认最近一笔）
                          </button>
                        </div>
                      </div>
                    )}
                    {/* 文本反馈 */}
                    {detail.feedbacks && detail.feedbacks.length > 0 && (
                      <div>
                        <div className='text-sm font-medium'>用户反馈</div>
                        <ul className='mt-2 space-y-2'>
                          {detail.feedbacks.map((f) => (
                            <li key={f.id} className='rounded border p-2'>
                              <div>评分：{f.rating}</div>
                              {f.comment && <div className='text-xs text-gray-600 mt-1'>“{f.comment}”</div>}
                              <div className='text-xs text-gray-500 mt-1'>{new Date(f.createdAt).toLocaleString()}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {selected.arrivalImageUrl && (
                  <div>
                    <div className='text-xs text-gray-500 mb-1'>图片预览</div>
                    <img src={selected.arrivalImageUrl} alt='arrival' className='max-h-60 w-full rounded border object-contain' />
                  </div>
                )}
                <div className='pt-2'>
                  <button
                    className='rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50'
                    onClick={() => bindArrivalImage(selected)}
                  >
                    绑定到达图
                  </button>
                  <label className='ml-3 inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer'>
                    <input
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploadArrivalImageFile(selected, f)
                        e.currentTarget.value = ''
                      }}
                    />
                    本地上传
                  </label>
                  {selected.arrivalImageUrl && (
                    <a
                      href={selected.arrivalImageUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='ml-3 text-sm text-blue-600 underline'
                    >
                      在新窗口查看
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Main>
      {/* 退款对话框 */}
      {showRefund && selected && (
        <RefundDialog
          open={showRefund}
          orderId={selected.id}
          initialPayments={detail?.payments as any}
          onClose={() => setShowRefund(false)}
          onSuccess={() => {
            // 刷新详情以反映退款结果
            if (selected) openDetail(selected)
          }}
        />
      )}
    </>
  )
}
