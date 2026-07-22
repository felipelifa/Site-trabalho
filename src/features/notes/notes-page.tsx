import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useNotes } from '@/hooks/use-queries'
import { useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/use-queries'

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

export function NotesPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const { data: notes = [] } = useNotes(selectedDate)
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const handleCreate = async () => {
    if (!newNote.trim()) return
    await createNote.mutateAsync({
      date: selectedDate,
      content: newNote,
      priority: 'medium',
    })
    setNewNote('')
  }

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return
    await updateNote.mutateAsync({ id, content: editContent })
    setEditingId(null)
    setEditContent('')
  }

  const handleDelete = async (id: string) => {
    await deleteNote.mutateAsync(id)
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

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-foreground">Notas</h1>
        <p className="text-muted-foreground">Registre observações do dia</p>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: pt })}
            </CardTitle>
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
              <Textarea
                placeholder="Escreva sua nota..."
                value={newNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={!newNote.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardContent className="p-4">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(note.id)}>
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-foreground">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className={getPriorityColor(note.priority)}>
                        {note.priority}
                      </Badge>
                      {note.category && (
                        <Badge variant="outline">{note.category}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(note.id)
                        setEditContent(note.content)
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {notes.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhuma nota para este dia
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  )
}
