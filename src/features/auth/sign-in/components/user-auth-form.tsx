import { HTMLAttributes, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { IconBrandFacebook, IconBrandGithub } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
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
import { useNavigate } from '@tanstack/react-router'

type UserAuthFormProps = HTMLAttributes<HTMLFormElement>

const formSchema = z.object({
  email: z.string().min(1, 'Please enter your username'),
  password: z.string().min(1, 'Please enter your password'),
})

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.auth.setAccessToken)

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      console.log('Login attempt:', { username: data.email, password: '***' })
      const res = await api.post('/admin/auth/login', {
        username: data.email,
        password: data.password,
      })
      if (!res.data?.success) throw new Error(res.data?.message || '登录失败')
      const token = res.data?.data?.access_token
      if (!token) throw new Error('登录返回无token')
      
      console.log('Login success - Token received:', token ? `${token.substring(0, 20)}...` : 'No token')
      setToken(token)
      
      // Verify token was stored
      const storedToken = useAuthStore.getState().auth.accessToken
      console.log('Token stored in Zustand:', storedToken ? `${storedToken.substring(0, 20)}...` : 'Not stored')
      
      navigate({ to: '/admin/orders' })
    } catch (e: any) {
      console.error('Login error:', e)
      const errorMessage = e?.response?.data?.message || e?.message || '登录失败'
      form.setError('password', { message: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder='admin' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='text-muted-foreground absolute -top-0.5 right-0 text-sm font-medium hover:opacity-75'
              >
                Forgot password?
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          Login
        </Button>

        <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background text-muted-foreground px-2'>
              Or continue with
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconBrandGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button variant='outline' type='button' disabled={isLoading}>
            <IconBrandFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div>
      </form>
    </Form>
  )
}
