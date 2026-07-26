import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays, subDays } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Plus, Trash2, Edit2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useNotes } from '@/hooks/use-queries'
import { useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/use-queries'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const PRIORITIES = [
  { value: 'high', label: 'Alta', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
  { value: 'low', label: 'Baixa', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
]

const CATEGORIES = [
  'Trabalho', 'Pessoal', 'Financeiro', 'Saúde', 'Família', 'Outro',
]

export function NotesPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newNote, setNewNote] = useState('')
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [newCategory, setNewCategory] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [editCategory, setEditCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const { data: notes = [] } = useNotes(selectedDate)
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const handleCreate = async () => {
    if (!newNote.trim()) return
    await createNote.mutateAsync({
      date: selectedDate,
      content: newNote,
      priority: newPriority,
      category: newCategory || undefined,
    })
    setNewNote('')
    setNewPriority('medium')
    setNewCategory('')
  }

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return
    await updateNote.mutateAsync({ id, content: editContent, priority: editPriority, category: editCategory || undefined })
    setEditingId(null)
    setEditContent('')
  }

  const handleDelete = async (id: string) => {
    await deleteNote.mutateAsync(id)
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate)
    const newDate = direction === 'prev' ? subDays(date, 1) : addDays(date, 1)
    setSelectedDate(format(newDate, 'yyyy-MM-dd'))
  }

  const getPriorityConfig = (priority: string) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[1]
  }

  const isToday = format(new Date(), 'yyyy-MM-dd') === selectedDate

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 lg:space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Notas</h1>
          <p className="text-sm md:text-base text-muted-foreground">Registre observações do dia</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowSearch(!showSearch)}>
          <Search className="w-4 h-4" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar notas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-8 rounded-md border border-input bg-background text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

            <div className="space-y-2">
              <Textarea
                placeholder="Escreva sua nota..."
                value={newNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex flex-wrap gap-2">
                <div className="flex gap-1">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setNewPriority(p.value as 'high' | 'medium' | 'low')}
                      className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
                        newPriority === p.value ? p.color : 'bg-muted text-muted-foreground border-transparent'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-7 px-2 rounded-md border border-input bg-background text-[11px] text-muted-foreground"
                >
                  <option value="">Sem categoria</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCreate} disabled={!newNote.trim()} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Nota
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="space-y-2">
        <AnimatePresence>
          {notes
            .filter(n => !searchQuery || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((note) => (
            <motion.div key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card>
                <CardContent className="p-4">
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex gap-1">
                          {PRIORITIES.map(p => (
                            <button
                              key={p.value}
                              onClick={() => setEditPriority(p.value as 'high' | 'medium' | 'low')}
                              className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
                                editPriority === p.value ? p.color : 'bg-muted text-muted-foreground border-transparent'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="h-7 px-2 rounded-md border border-input bg-background text-[11px] text-muted-foreground"
                        >
                          <option value="">Sem categoria</option>
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(note.id)}>Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-foreground text-sm">{note.content}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Badge variant="secondary" className={`text-[10px] ${getPriorityConfig(note.priority).color}`}>
                            {getPriorityConfig(note.priority).label}
                          </Badge>
                          {note.category && (
                            <Badge variant="outline" className="text-[10px]">{note.category}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => { setEditingId(note.id); setEditContent(note.content); setEditPriority(note.priority as 'high' | 'medium' | 'low'); setEditCategory(note.category || '') }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(note.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {notes.filter(n => !searchQuery || n.content.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              {searchQuery ? 'Nenhuma nota encontrada' : 'Nenhuma nota para este dia'}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  )
}
