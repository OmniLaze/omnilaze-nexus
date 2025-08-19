import axios from 'axios'
import { ENV } from '@/config/env'
import { useAuthStore } from '@/stores/authStore'

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().auth.accessToken
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  // Optional: system key for admin endpoints
  const systemKey = (import.meta as any).env?.VITE_SYSTEM_API_KEY as string | undefined
  if (systemKey) {
    config.headers = config.headers || {}
    ;(config.headers as any)['X-System-Key'] = systemKey
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Bubble up for global handlers in QueryClient
    return Promise.reject(err)
  },
)

// Admin Payments APIs
export type AdminPayment = {
  id: string
  provider: string
  status: string
  amount: number
  currency: string
  outTradeNo: string
  transactionId?: string | null
  refundedAmount?: number | null
  refundedAt?: string | null
  metadata?: any
  createdAt: string
  updatedAt: string
}

export async function listPaymentsByOrder(orderId: string) {
  const res = await api.get(`/v1/admin/payments/order/${orderId}`)
  if (!res.data?.success) throw new Error(res.data?.message || '获取支付记录失败')
  return res.data.data as AdminPayment[]
}

export async function refundPaymentAdmin(paymentId: string, params: { amount?: number; reason?: string }) {
  const res = await api.post(`/v1/admin/payments/${paymentId}/refund`, params)
  if (!res.data?.success) throw new Error(res.data?.message || '退款失败')
  return res.data
}

export async function getRefundStatus(paymentId: string) {
  const res = await api.get(`/v1/admin/payments/${paymentId}/refund-status`)
  if (!res.data?.success) throw new Error(res.data?.message || '查询退款状态失败')
  return res.data.data as {
    paymentId: string
    status: string
    originalAmount: number
    refundedAmount?: number
    refundedAt?: string | null
    isFullyRefunded: boolean
    isPartiallyRefunded: boolean
    refundInfo?: any
  }
}

export async function syncPaymentStatus(paymentId: string) {
  const res = await api.post(`/v1/admin/payments/${paymentId}/sync-status`)
  if (!res.data?.success) throw new Error(res.data?.message || '同步失败')
  return res.data
}
