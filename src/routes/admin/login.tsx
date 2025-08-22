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
      <div className="max-w-md w-full p-5">
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
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/admin/login')({
  component: AdminLoginPage,
})
