import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

const formSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type LoginForm = z.infer<typeof formSchema>

function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.auth.setAccessToken)

  const form = useForm<LoginForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  async function onSubmit(data: LoginForm) {
    try {
      setIsLoading(true)
      const res = await api.post('/admin/auth/login', {
        username: data.username,
        password: data.password,
      })
      
      if (!res.data?.success) {
        throw new Error(res.data?.message || '登录失败')
      }
      
      const token = res.data?.data?.access_token
      if (!token) {
        throw new Error('登录返回无token')
      }
      
      setToken(token)
      toast.success('登录成功')
      navigate({ to: '/admin/orders' })
    } catch (error: any) {
      console.error('登录错误:', error)
      const errorMessage = error?.response?.data?.message || error?.message || '登录失败'
      toast.error(errorMessage)
      form.setError('password', { message: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            OmniLaze Nexus
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            管理员登录
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入用户名"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="请输入密码"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? '登录中...' : '登录'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            OmniLaze Universal 管理系统
          </div>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/login')({
  component: AdminLoginPage,
})