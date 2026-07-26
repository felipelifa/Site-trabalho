import { useState, useMemo, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isPast, isToday, differenceInDays } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Plus, Trash2, Bell, Check, AlertTriangle, Clock, ChevronDown, ChevronUp, Edit2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReminders } from '@/hooks/use-queries'
import { useCreateReminder, useUpdateReminder, useDeleteReminder } from '@/hooks/use-queries'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function RemindersPage() {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [showCompleted, setShowCompleted] = useState(false)

  const { data: reminders = [] } = useReminders()
  const createReminder = useCreateReminder()
  const updateReminder = useUpdateReminder()
  const deleteReminder = useDeleteReminder()

  const handleCreate = async () => {
    if (!title.trim()) return
    await createReminder.mutateAsync({
      title,
      description,
      due_date: dueDate,
      priority,
      completed: false,
    })
    setTitle('')
    setDescription('')
    setDueDate(format(new Date(), 'yyyy-MM-dd'))
    setPriority('medium')
    setShowForm(false)
  }

  const handleToggle = async (id: string, completed: boolean) => {
    await updateReminder.mutateAsync({ id, completed: !completed })
  }

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) return
    await updateReminder.mutateAsync({
      id,
      title: editTitle,
      description: editDescription,
      due_date: editDueDate,
      priority: editPriority,
    })
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteReminder.mutateAsync(id)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
      case 'low': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return priority
    }
  }

  const getDueDateInfo = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    if (isToday(date)) return { label: 'Hoje', color: 'text-blue-600 dark:text-blue-400', urgent: true }
    if (isPast(date)) {
      const days = differenceInDays(new Date(), date)
      return { label: `Atrasado ${days}d`, color: 'text-red-600 dark:text-red-400', urgent: true }
    }
    const days = differenceInDays(date, new Date())
    if (days <= 3) return { label: `Daqui a ${days}d`, color: 'text-orange-600 dark:text-orange-400', urgent: true }
    return { label: format(date, "d 'de' MMM", { locale: pt }), color: 'text-muted-foreground', urgent: false }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 }

  const pendingReminders = useMemo(() => {
    const pending = reminders.filter(r => !r.completed)
    return pending.sort((a, b) => {
      if (sortBy === 'priority') {
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
      }
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }, [reminders, sortBy])

  const completedReminders = useMemo(() => {
    return reminders.filter(r => r.completed).sort((a, b) =>
      new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
    )
  }, [reminders])

  const overdueCount = pendingReminders.filter(r => isPast(new Date(r.due_date + 'T00:00:00')) && !isToday(new Date(r.due_date + 'T00:00:00'))).length

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 lg:space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Lembretes</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie seus lembretes</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lembrete
        </Button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card>
              <CardContent className="p-4 space-y-3">
                <Input placeholder="Título do lembrete" value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
                <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} className="min-h-[60px]" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data</label>
                    <Input type="date" value={dueDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Prioridade</label>
                    <Select value={priority} onValueChange={(v) => { if (v) setPriority(v as 'low' | 'medium' | 'high') }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} disabled={!title.trim()} className="flex-1 sm:flex-none">Criar</Button>
                  <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 sm:flex-none">Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={item} className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Ordenar:</span>
        <button onClick={() => setSortBy('date')} className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${sortBy === 'date' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <Clock className="w-3 h-3 inline mr-1" />Data
        </button>
        <button onClick={() => setSortBy('priority')} className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${sortBy === 'priority' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <AlertTriangle className="w-3 h-3 inline mr-1" />Prioridade
        </button>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Pendentes ({pendingReminders.length})</h3>
              {overdueCount > 0 && (
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px]">
                  {overdueCount} atrasado{overdueCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <AnimatePresence>
              {pendingReminders.map((reminder) => {
                const dueInfo = getDueDateInfo(reminder.due_date)
                return (
                  <motion.div key={reminder.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {editingId === reminder.id ? (
                      <Card className="mb-2">
                        <CardContent className="p-3 space-y-2">
                          <Input value={editTitle} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)} placeholder="Título" />
                          <Textarea value={editDescription} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditDescription(e.target.value)} placeholder="Descrição" className="min-h-[50px]" />
                          <div className="grid grid-cols-2 gap-2">
                            <Input type="date" value={editDueDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditDueDate(e.target.value)} />
                            <Select value={editPriority} onValueChange={(v) => { if (v) setEditPriority(v as 'low' | 'medium' | 'high') }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Média</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdate(reminder.id)} className="flex-1">Salvar</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="flex-1">Cancelar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className={`flex items-start gap-3 p-3 rounded-xl transition-all ${dueInfo.urgent && !isToday(new Date(reminder.due_date + 'T00:00:00')) ? 'bg-red-500/5 border border-red-500/10' : 'bg-muted/50'}`}>
                        <Button size="icon" variant="ghost" className="shrink-0 mt-0.5" onClick={() => handleToggle(reminder.id, reminder.completed)}>
                          <Bell className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">{reminder.title}</p>
                          {reminder.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reminder.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className={`text-[10px] font-medium ${dueInfo.color}`}>{dueInfo.label}</span>
                            <Badge variant="secondary" className={`text-[10px] ${getPriorityColor(reminder.priority)}`}>
                              {getPriorityLabel(reminder.priority)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setEditingId(reminder.id); setEditTitle(reminder.title); setEditDescription(reminder.description || ''); setEditDueDate(reminder.due_date); setEditPriority(reminder.priority as 'low' | 'medium' | 'high') }}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(reminder.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {pendingReminders.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">Nenhum lembrete pendente</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {completedReminders.length > 0 && (
        <motion.div variants={item}>
          <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Concluídos ({completedReminders.length})
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-2">
                {completedReminders.map((reminder) => (
                  <Card key={reminder.id} className="opacity-60">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Button size="icon" variant="ghost" className="shrink-0" onClick={() => handleToggle(reminder.id, reminder.completed)}>
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground line-through text-sm">{reminder.title}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(reminder.due_date + 'T00:00:00'), "d 'de' MMM", { locale: pt })}
                          </span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleDelete(reminder.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  )
}
