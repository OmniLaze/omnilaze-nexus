import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AdminPayment,
  listPaymentsByOrder,
  refundPaymentAdmin,
  getRefundStatus,
  syncPaymentStatus,
} from '@/lib/api'

type RefundDialogProps = {
  open: boolean
  orderId: string
  onClose: () => void
  onSuccess?: () => void
  initialPayments?: AdminPayment[]
  presetAmount?: number
}

export function RefundDialog({ open, orderId, onClose, onSuccess, initialPayments, presetAmount }: RefundDialogProps) {
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState<AdminPayment[]>(initialPayments || [])
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const selectedPayment = useMemo(() => payments.find((p) => p.id === selectedPaymentId) || null, [payments, selectedPaymentId])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const load = async () => {
      try {
        const list = initialPayments && initialPayments.length > 0 ? initialPayments : await listPaymentsByOrder(orderId)
        // 排序（时间倒序）
        const ordered = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        setPayments(ordered)
        const defaultId = ordered[0]?.id
        if (defaultId) setSelectedPaymentId(defaultId)
      } catch (e: any) {
        toast.error(e?.message || '加载支付记录失败')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId])

  const remaining = useMemo(() => {
    if (!selectedPayment) return 0
    const refunded = (selectedPayment.refundedAmount || 0) || Number((selectedPayment.metadata || {})?.refundTotal || 0)
    return Math.max(0, (selectedPayment.amount || 0) - refunded)
  }, [selectedPayment])

  useEffect(() => {
    // 默认退款金额填充：优先使用外部 presetAmount（限额 <= 剩余可退），否则退可退全额
    if (open && selectedPayment) {
      if (typeof presetAmount === 'number' && !Number.isNaN(presetAmount)) {
        const preset = Math.max(0, Math.min(presetAmount, remaining))
        setAmount(preset > 0 ? preset.toFixed(2) : '')
      } else {
        setAmount(remaining > 0 ? remaining.toFixed(2) : '')
      }
    }
  }, [open, selectedPayment, remaining, presetAmount])

  const submit = async () => {
    if (!selectedPayment) {
      toast.error('请选择需要退款的支付记录')
      return
    }
    const amt = amount.trim() ? parseFloat(amount.trim()) : undefined
    if (amt !== undefined) {
      if (isNaN(amt) || amt <= 0) {
        toast.error('退款金额无效')
        return
      }
      if (amt > remaining) {
        toast.error(`退款金额不能超过剩余可退金额（¥${remaining.toFixed(2)}）`)
        return
      }
    }
    setLoading(true)
    try {
      const res = await refundPaymentAdmin(selectedPayment.id, {
        amount: amt,
        reason: reason.trim() || undefined,
      })
      toast.success(res?.message || '退款成功')
      onClose()
      onSuccess?.()
    } catch (e: any) {
      toast.error(e?.message || '退款失败')
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    if (!selectedPayment) return
    try {
      const data = await getRefundStatus(selectedPayment.id)
      toast.info(
        `状态：${data.status}，已退：¥${(data.refundedAmount || 0).toFixed(2)} / ¥${(data.originalAmount || 0).toFixed(2)}`,
      )
    } catch (e: any) {
      toast.error(e?.message || '查询失败')
    }
  }

  const syncStatusNow = async () => {
    if (!selectedPayment) return
    try {
      await syncPaymentStatus(selectedPayment.id)
      toast.success('已触发同步')
    } catch (e: any) {
      toast.error(e?.message || '同步失败')
    }
  }

  if (!open) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30' onClick={onClose}>
      <div className='w-[480px] max-w-full rounded-md border bg-white shadow-xl' onClick={(e) => e.stopPropagation()}>
        <div className='flex items-center justify-between border-b px-4 py-3'>
          <div className='text-base font-semibold'>申请退款</div>
          <button className='rounded-md border px-2 py-1 text-sm' onClick={onClose} disabled={loading}>
            关闭
          </button>
        </div>
        <div className='space-y-3 p-4 text-sm'>
          <div>
            <div className='mb-1 text-xs text-gray-500'>选择支付记录</div>
            <select
              className='w-full rounded-md border px-3 py-2'
              value={selectedPaymentId}
              onChange={(e) => setSelectedPaymentId(e.target.value)}
              disabled={loading || payments.length === 0}
            >
              {payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {new Date(p.createdAt).toLocaleString()} · {p.provider} · ¥{p.amount?.toFixed?.(2)} · {p.status}
                </option>
              ))}
            </select>
            {selectedPayment && (
              <div className='mt-1 text-xs text-gray-500'>
                可退：¥{remaining.toFixed(2)} / 总额：¥{selectedPayment.amount.toFixed(2)}
                {selectedPayment.refundedAmount ? `（已退 ¥${(selectedPayment.refundedAmount || 0).toFixed(2)}）` : ''}
              </div>
            )}
          </div>

          <div>
            <div className='mb-1 text-xs text-gray-500'>退款金额（留空默认退可退全额）</div>
            <input
              type='number'
              inputMode='decimal'
              step='0.01'
              min='0'
              className='w-full rounded-md border px-3 py-2'
              placeholder={remaining > 0 ? `最多 ¥${remaining.toFixed(2)}` : '不可退款'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading || remaining <= 0}
            />
          </div>

          <div>
            <div className='mb-1 text-xs text-gray-500'>退款原因（可选）</div>
            <input
              type='text'
              className='w-full rounded-md border px-3 py-2'
              placeholder='例如：用户取消、异常重复支付等'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className='flex items-center gap-2 pt-2'>
            <button
              className='rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60'
              onClick={submit}
              disabled={loading || !selectedPayment || remaining <= 0}
            >
              {loading ? '提交中…' : '确认退款'}
            </button>
            <button
              className='rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50'
              onClick={checkStatus}
              disabled={loading || !selectedPayment}
            >
              查询退款状态
            </button>
            <button
              className='rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50'
              onClick={syncStatusNow}
              disabled={loading || !selectedPayment}
            >
              同步支付状态
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RefundDialog
