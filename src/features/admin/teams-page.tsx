import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users2,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Car,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useTeams,
  useEmployees,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useSetTeamMembers,
} from '@/hooks/use-admin-queries'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const TEAM_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
]

interface TeamFormData {
  name: string
  color: string
  notes: string
}

const DEFAULT_FORM: TeamFormData = {
  name: '',
  color: TEAM_COLORS[0],
  notes: '',
}

export function TeamsPage() {
  const { data: teams = [], isLoading } = useTeams()
  const { data: employees = [] } = useEmployees()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()
  const setMembers = useSetTeamMembers()

  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [formData, setFormData] = useState<TeamFormData>(DEFAULT_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [showMemberDialog, setShowMemberDialog] = useState<string | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const handleOpenForm = (team?: typeof teams[0]) => {
    if (team) {
      setEditingTeam(team.id)
      setFormData({
        name: team.name,
        color: team.color || TEAM_COLORS[0],
        notes: team.notes || '',
      })
    } else {
      setEditingTeam(null)
      setFormData(DEFAULT_FORM)
    }
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return

    if (editingTeam) {
      await updateTeam.mutateAsync({ id: editingTeam, ...formData })
    } else {
      await createTeam.mutateAsync(formData)
    }
    setShowForm(false)
    setFormData(DEFAULT_FORM)
    setEditingTeam(null)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    await deleteTeam.mutateAsync(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  const handleOpenMembers = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    const currentMembers = (team?.members as Array<{ employee: { id: string } }>) || []
    setSelectedMembers(currentMembers.map(m => m.employee?.id).filter(Boolean))
    setShowMemberDialog(teamId)
  }

  const handleSaveMembers = async () => {
    if (!showMemberDialog) return
    await setMembers.mutateAsync({ teamId: showMemberDialog, employeeIds: selectedMembers })
    setShowMemberDialog(null)
  }

  const toggleMember = (employeeId: string) => {
    setSelectedMembers(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const getTeamMembers = (team: typeof teams[0]) => {
    const members = team.members as Array<{ employee: { id: string; full_name: string; role: string; photo_url?: string } }> | null
    return members?.map(m => m.employee).filter(Boolean) || []
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-4"
    >
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users2 className="w-6 h-6" />
            Equipes
          </h1>
          <p className="text-sm text-muted-foreground">
            {teams.length} equipe(s) criada(s)
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Equipe
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-8 text-center">
              <Users2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma equipe criada.</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="space-y-3">
          {teams.map((team) => {
            const members = getTeamMembers(team)
            const isExpanded = expandedTeam === team.id
            const leader = team.leader as { full_name: string } | null

            return (
              <Card key={team.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {members.length} membro(s)
                          {leader && ` · Responsável: ${leader.full_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleOpenForm(team) }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(team.id) }}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-3">
                      {team.vehicle && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Car className="w-4 h-4" />
                          <span>{(team.vehicle as { name: string }).name}</span>
                        </div>
                      )}
                      {team.notes && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4 mt-0.5" />
                          <span>{team.notes}</span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-foreground">Membros</p>
                          <Button variant="outline" size="sm" onClick={() => handleOpenMembers(team.id)}>
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            Gerir
                          </Button>
                        </div>
                        {members.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhum membro adicionado.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {members.map((member) => (
                              <Badge key={member.id} variant="secondary" className="gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-[10px] font-bold text-primary">
                                    {member.full_name.charAt(0)}
                                  </span>
                                </div>
                                {member.full_name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Equipe Norte"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Cor</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Observações</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas sobre a equipe..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
              {editingTeam ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showMemberDialog} onOpenChange={() => setShowMemberDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerir Membros da Equipe</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {employees.filter(e => e.status === 'active').map((employee) => (
              <div
                key={employee.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedMembers.includes(employee.id)
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleMember(employee.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">
                      {employee.full_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{employee.full_name}</p>
                    <p className="text-xs text-muted-foreground">{employee.role}</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedMembers.includes(employee.id)
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground'
                }`}>
                  {selectedMembers.includes(employee.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
            {employees.filter(e => e.status === 'active').length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum funcionário ativo disponível.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemberDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveMembers}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja eliminar esta equipe? Os membros não serão eliminados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
