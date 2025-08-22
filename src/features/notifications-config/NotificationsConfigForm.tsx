import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { toast } from 'sonner'

type Channel = { type: 'webhook'; url: string; secret?: string }
type Recipient = { id: string; name: string; active?: boolean; channels: Channel[] }
type Schedule = { id: string; label?: string; daysOfWeek: number[]; start: string; end: string; recipientIds: string[] }
type Config = { mode: 'all' | 'scheduled'; timezone?: string; fallbackAll?: boolean; recipients: Recipient[]; schedules: Schedule[] }

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export default function NotificationsConfigForm() {
  const [loading, setLoading] = useState(false)
  const [cfg, setCfg] = useState<Config>({ mode: 'all', timezone: 'Asia/Shanghai', fallbackAll: true, recipients: [], schedules: [] })
  const [showRecipient, setShowRecipient] = useState(false)
  const [newRecipient, setNewRecipient] = useState<Recipient>({ id: '', name: '', active: true, channels: [{ type: 'webhook', url: '' }] })
  const [showSchedule, setShowSchedule] = useState(false)
  const [newSchedule, setNewSchedule] = useState<Schedule>({ id: '', label: '', daysOfWeek: [1,2,3,4,5], start: '09:00', end: '18:00', recipientIds: [] })

  async function load() {
    try {
      setLoading(true)
      const res = await api.get('/admin/notifications/config')
      if (!res.data?.success) throw new Error(res.data?.message || '加载失败')
      setCfg(res.data.data || cfg)
    } catch (e: any) {
      toast.error(e?.message || '加载失败')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function save() {
    try {
      setLoading(true)
      const res = await api.put('/admin/notifications/config', { config: cfg })
      if (!res.data?.success) throw new Error(res.data?.message || '保存失败')
      toast.success('已保存通知配置')
    } catch (e: any) {
      toast.error(e?.message || '保存失败')
    } finally { setLoading(false) }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <label className='text-sm'>模式：</label>
        <select
          className='border rounded px-2 py-1 text-sm'
          value={cfg.mode}
          onChange={(e) => setCfg({ ...cfg, mode: e.target.value as any })}
        >
          <option value='all'>所有人</option>
          <option value='scheduled'>按排班</option>
        </select>
        <label className='ml-4 text-sm'>时区：</label>
        <Input className='w-48' value={cfg.timezone || ''} onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })} />
        <div className='flex items-center gap-2 ml-4'>
          <Checkbox checked={cfg.fallbackAll !== false} onCheckedChange={(v) => setCfg({ ...cfg, fallbackAll: !!v })} />
          <span className='text-sm text-muted-foreground'>没人值班时通知所有人</span>
        </div>
        <Button className='ml-auto' disabled={loading} onClick={save}>保存</Button>
      </div>

      <div className='rounded border p-3'>
        <div className='flex items-center justify-between mb-2'>
          <h3 className='font-medium'>接收人</h3>
          <Button size='sm' variant='outline' onClick={() => { setNewRecipient({ id: '', name: '', active: true, channels: [{ type: 'webhook', url: '' }] }); setShowRecipient(true) }}>新增接收人</Button>
        </div>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 text-left'>
            <tr>
              <th className='px-2 py-1'>姓名</th>
              <th className='px-2 py-1'>状态</th>
              <th className='px-2 py-1'>Webhook URL</th>
              <th className='px-2 py-1'>操作</th>
            </tr>
          </thead>
          <tbody>
            {cfg.recipients.map((r) => (
              <tr key={r.id} className='border-t'>
                <td className='px-2 py-1'>{r.name}</td>
                <td className='px-2 py-1'>{r.active === false ? '禁用' : '启用'}</td>
                <td className='px-2 py-1'>{r.channels?.[0]?.type === 'webhook' ? r.channels?.[0]?.url : ''}</td>
                <td className='px-2 py-1'>
                  <Button size='sm' variant='outline' onClick={() => {
                    const idx = cfg.recipients.findIndex(x => x.id === r.id)
                    if (idx >= 0) {
                      setNewRecipient({ ...cfg.recipients[idx] })
                      setShowRecipient(true)
                    }
                  }}>编辑</Button>
                  <Button size='sm' variant='ghost' className='text-red-600' onClick={() => setCfg({ ...cfg, recipients: cfg.recipients.filter(x => x.id !== r.id) })}>删除</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className='rounded border p-3'>
        <div className='flex items-center justify-between mb-2'>
          <h3 className='font-medium'>排班</h3>
          <Button size='sm' variant='outline' onClick={() => { setNewSchedule({ id: '', label: '', daysOfWeek: [1,2,3,4,5], start: '09:00', end: '18:00', recipientIds: [] }); setShowSchedule(true) }}>新增排班</Button>
        </div>
        <table className='w-full text-sm'>
          <thead className='bg-gray-50 text-left'>
            <tr>
              <th className='px-2 py-1'>名称</th>
              <th className='px-2 py-1'>星期</th>
              <th className='px-2 py-1'>时间段</th>
              <th className='px-2 py-1'>接收人</th>
              <th className='px-2 py-1'>操作</th>
            </tr>
          </thead>
          <tbody>
            {cfg.schedules.map((s) => (
              <tr key={s.id} className='border-t'>
                <td className='px-2 py-1'>{s.label || '-'}</td>
                <td className='px-2 py-1'>{s.daysOfWeek.join(',')}</td>
                <td className='px-2 py-1'>{s.start} - {s.end}</td>
                <td className='px-2 py-1'>{s.recipientIds.map(id => cfg.recipients.find(r => r.id === id)?.name || id).join(', ')}</td>
                <td className='px-2 py-1'>
                  <Button size='sm' variant='outline' onClick={() => { setNewSchedule({ ...s }); setShowSchedule(true) }}>编辑</Button>
                  <Button size='sm' variant='ghost' className='text-red-600' onClick={() => setCfg({ ...cfg, schedules: cfg.schedules.filter(x => x.id !== s.id) })}>删除</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showRecipient} onOpenChange={setShowRecipient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newRecipient.id ? '编辑接收人' : '新增接收人'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <label className='w-20 text-sm'>姓名</label>
              <Input value={newRecipient.name} onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })} />
            </div>
            <div className='flex items-center gap-2'>
              <label className='w-20 text-sm'>启用</label>
              <Checkbox checked={newRecipient.active !== false} onCheckedChange={(v) => setNewRecipient({ ...newRecipient, active: !!v })} />
            </div>
            <div className='flex items-center gap-2'>
              <label className='w-20 text-sm'>Webhook</label>
              <Input value={newRecipient.channels?.[0]?.url || ''} onChange={(e) => setNewRecipient({ ...newRecipient, channels: [{ type: 'webhook', url: e.target.value }] })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowRecipient(false)}>取消</Button>
            <Button onClick={() => {
              const r = { ...newRecipient }
              if (!r.id) r.id = uid()
              const exist = cfg.recipients.findIndex(x => x.id === r.id)
              const recipients = [...cfg.recipients]
              if (exist >= 0) recipients[exist] = r; else recipients.push(r)
              setCfg({ ...cfg, recipients })
              setShowRecipient(false)
            }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newSchedule.id ? '编辑排班' : '新增排班'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <label className='w-24 text-sm'>名称</label>
              <Input value={newSchedule.label || ''} onChange={(e) => setNewSchedule({ ...newSchedule, label: e.target.value })} />
            </div>
            <div className='flex items-center gap-2'>
              <label className='w-24 text-sm'>星期(0-6)</label>
              <Input value={newSchedule.daysOfWeek.join(',')} onChange={(e) => {
                const arr = e.target.value.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n))
                setNewSchedule({ ...newSchedule, daysOfWeek: arr })
              }} />
            </div>
            <div className='flex items-center gap-2'>
              <label className='w-24 text-sm'>开始</label>
              <Input className='w-28' value={newSchedule.start} onChange={(e) => setNewSchedule({ ...newSchedule, start: e.target.value })} />
              <label className='w-16 text-sm'>结束</label>
              <Input className='w-28' value={newSchedule.end} onChange={(e) => setNewSchedule({ ...newSchedule, end: e.target.value })} />
            </div>
            <div className='flex items-center gap-2'>
              <label className='w-24 text-sm'>接收人ID</label>
              <Input value={newSchedule.recipientIds.join(',')} onChange={(e) => setNewSchedule({ ...newSchedule, recipientIds: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowSchedule(false)}>取消</Button>
            <Button onClick={() => {
              const s = { ...newSchedule }
              if (!s.id) s.id = uid()
              const idx = cfg.schedules.findIndex(x => x.id === s.id)
              const schedules = [...cfg.schedules]
              if (idx >= 0) schedules[idx] = s; else schedules.push(s)
              setCfg({ ...cfg, schedules })
              setShowSchedule(false)
            }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

