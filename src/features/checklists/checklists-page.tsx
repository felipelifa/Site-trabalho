import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useChecklist } from '@/hooks/use-queries'
import { useCreateChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem } from '@/hooks/use-queries'

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

export function ChecklistsPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newItem, setNewItem] = useState('')

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

  const handleDelete = async (id: string) => {
    await deleteItem.mutateAsync(id)
  }

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-foreground">Checklists</h1>
        <p className="text-muted-foreground">Organize suas tarefas diárias</p>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: pt })}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {completedCount}/{totalCount} concluídas
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Nova tarefa..."
                value={newItem}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={!newItem.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className={`transition-all ${item.completed ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => handleToggle(item.id, item.completed)}
                />
                <span className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.item}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhuma tarefa para este dia
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  )
}
