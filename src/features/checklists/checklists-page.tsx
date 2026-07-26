import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays, subDays } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Edit2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useChecklist } from '@/hooks/use-queries'
import { useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem } from '@/hooks/use-queries'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function ChecklistsPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newItem, setNewItem] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  const { data: items = [] } = useChecklist(selectedDate)
  const createItem = useCreateChecklistItem()
  const updateItem = useUpdateChecklistItem()
  const deleteItem = useDeleteChecklistItem()

  const handleCreate = async () => {
    if (!newItem.trim()) return
    await createItem.mutateAsync({
      date: selectedDate,
      item: newItem,
      completed: false,
    })
    setNewItem('')
  }

  const handleToggle = async (id: string, completed: boolean) => {
    await updateItem.mutateAsync({ id, completed: !completed })
  }

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return
    await updateItem.mutateAsync({ id, item: editText })
    setEditingId(null)
    setEditText('')
  }

  const handleDelete = async (id: string) => {
    await deleteItem.mutateAsync(id)
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate)
    const newDate = direction === 'prev' ? subDays(date, 1) : addDays(date, 1)
    setSelectedDate(format(newDate, 'yyyy-MM-dd'))
  }

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const isToday = format(new Date(), 'yyyy-MM-dd') === selectedDate

  const filteredItems = items.filter(i => {
    if (filter === 'pending') return !i.completed
    if (filter === 'done') return i.completed
    return true
  })

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 lg:space-y-6">
      <motion.div variants={item}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Checklists</h1>
        <p className="text-sm md:text-base text-muted-foreground">Organize suas tarefas diárias</p>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateDay('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center flex-1">
                <p className="text-sm font-medium text-foreground capitalize">
                  {format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: pt })}
                </p>
                {isToday && <Badge variant="secondary" className="mt-1 text-[10px]">Hoje</Badge>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigateDay('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />

            {totalCount > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{completedCount}/{totalCount} concluídas</span>
                  <span className="text-xs font-medium text-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Nova tarefa..."
                value={newItem}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCreate()}
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={!newItem.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {totalCount > 0 && (
        <motion.div variants={item} className="flex gap-1">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Concluídos'}
            </button>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-2">
        <AnimatePresence>
          {filteredItems.map((listItem) => (
            <motion.div key={listItem.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className={`transition-all ${listItem.completed ? 'opacity-60' : ''}`}>
                <CardContent className="p-3">
                  {editingId === listItem.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditText(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleUpdate(listItem.id)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleUpdate(listItem.id)}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={listItem.completed}
                        onCheckedChange={() => handleToggle(listItem.id, listItem.completed)}
                      />
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => { setEditingId(listItem.id); setEditText(listItem.item) }}
                      >
                        <span className={`text-sm ${listItem.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {listItem.item}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => { setEditingId(listItem.id); setEditText(listItem.item) }}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(listItem.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              {totalCount === 0 ? 'Nenhuma tarefa para este dia' :
               filter === 'pending' ? 'Todas as tarefas concluídas!' : 'Nenhuma tarefa concluída'}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {completedCount > 0 && totalCount > 0 && (
        <motion.div variants={item}>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                {completedCount} de {totalCount} tarefas concluídas
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
