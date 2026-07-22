import { useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Plus, Trash2, Bell, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
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

  const handleDelete = async (id: string) => {
    await deleteReminder.mutateAsync(id)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-600 dark:text-red-400'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
      case 'low':
        return 'bg-green-500/10 text-green-600 dark:text-green-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const pendingReminders = reminders.filter(r => !r.completed)
  const completedReminders = reminders.filter(r => r.completed)

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lembretes</h1>
          <p className="text-muted-foreground">Gerencie seus lembretes</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Lembrete
        </Button>
      </motion.div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Novo Lembrete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Título do lembrete"
                value={title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Descrição (opcional)"
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Data</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Prioridade</label>
                  <Select value={priority} onValueChange={(v) => { if (v) setPriority(v as 'low' | 'medium' | 'high') }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!title.trim()}>
                  Criar
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pendentes ({pendingReminders.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleToggle(reminder.id, reminder.completed)}
                >
                  <Bell className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{reminder.title}</p>
                  {reminder.description && (
                    <p className="text-sm text-muted-foreground">{reminder.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reminder.due_date), "d 'de' MMMM", { locale: pt })}
                    </span>
                    <Badge variant="secondary" className={getPriorityColor(reminder.priority)}>
                      {reminder.priority}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(reminder.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {pendingReminders.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum lembrete pendente
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {completedReminders.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Concluídos ({completedReminders.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl opacity-60">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleToggle(reminder.id, reminder.completed)}
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </Button>
                  <div className="flex-1">
                    <p className="font-medium text-foreground line-through">{reminder.title}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(reminder.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
