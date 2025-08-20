import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconTicket, IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { useState } from 'react'

const formSchema = z.object({
  code: z.string().min(1, '邀请码不能为空').max(50, '邀请码长度不能超过50个字符'),
  max_uses: z.number().min(1, '最大使用次数至少为1').max(10000, '最大使用次数不能超过10000'),
  description: z.string().optional(),
})
type CreateInviteCodeForm = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateInviteCodeDialog({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  
  const form = useForm<CreateInviteCodeForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      code: '', 
      max_uses: 10, 
      description: '' 
    },
  })

  const onSubmit = async (values: CreateInviteCodeForm) => {
    try {
      setLoading(true)
      const res = await api.post('/v1/admin/create-invite-code', values)
      
      if (!res.data?.success) {
        throw new Error(res.data?.message || '创建失败')
      }
      
      toast.success(`邀请码 "${values.code}" 创建成功！`)
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || '创建邀请码失败')
    } finally {
      setLoading(false)
    }
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    form.setValue('code', result)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!loading) {
          form.reset()
          onOpenChange(state)
        }
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='flex items-center gap-2'>
            <IconTicket /> 创建邀请码
          </DialogTitle>
          <DialogDescription>
            创建新的邀请码供用户注册使用。邀请码一旦创建不可修改，请仔细填写。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='create-invite-code-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邀请码</FormLabel>
                  <div className='flex gap-2'>
                    <FormControl>
                      <Input
                        placeholder='例如: WELCOME2024'
                        {...field}
                        className='font-mono'
                      />
                    </FormControl>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={generateRandomCode}
                      disabled={loading}
                    >
                      随机生成
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='max_uses'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>最大使用次数</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      max={10000}
                      placeholder='10'
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述 (可选)</FormLabel>
                  <FormControl>
                    <Textarea
                      className='resize-none'
                      placeholder='为这个邀请码添加描述信息 (可选)'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className='gap-y-2'>
          <DialogClose asChild>
            <Button variant='outline' disabled={loading}>
              取消
            </Button>
          </DialogClose>
          <Button 
            type='submit' 
            form='create-invite-code-form'
            disabled={loading}
          >
            {loading ? '创建中...' : '创建邀请码'} <IconPlus />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}