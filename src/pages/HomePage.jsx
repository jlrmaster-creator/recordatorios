import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToMyReminders,
  createReminder, updateReminder, deleteReminder
} from '../services/remindersService'
import ReminderCard from '../components/reminders/ReminderCard'
import ReminderForm from '../components/reminders/ReminderForm'
import Modal from '../components/shared/Modal'
import Header from '../components/layout/Header'
import ShareModal from '../components/reminders/ShareModal'
import toast from 'react-hot-toast'
import { CATEGORIES, IMPORTANCE } from '../utils/colorUtils'

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

export default function HomePage() {
  const { user } = useAuth()
  const [reminders, setReminders] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [shareTarget, setShareTarget] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterImportance, setFilterImportance] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToMyReminders(user.uid, setReminders)
    return unsub
  }, [user])

  const handleCreate = async (data) => {
    setLoading(true)
    try {
      await createReminder(user.uid, data)
      toast.success('Recordatorio creado ✓')
      setFormOpen(false)
    } catch { toast.error('Error al crear') } finally { setLoading(false) }
  }

  const handleEdit = async (data) => {
    setLoading(true)
    try {
      await updateReminder(editTarget.id, data)
      toast.success('Actualizado ✓')
      setEditTarget(null)
    } catch { toast.error('Error al actualizar') } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id)
      toast.success('Eliminado')
    } catch { toast.error('Error al eliminar') }
  }

  // Filters
  const filtered = reminders.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase())
    const matchImp = filterImportance === 'all' || r.importance === filterImportance
    const matchCat = filterCategory === 'all' || r.category === filterCategory
    return matchSearch && matchImp && matchCat
  })

  // Sort: pending first, then by dateTime
  const sorted = [...filtered].sort((a, b) => {
    const ta = a.dateTime?.toDate?.() || new Date(a.dateTime || 0)
    const tb = b.dateTime?.toDate?.() || new Date(b.dateTime || 0)
    return ta - tb
  })

  const ownReminders = sorted.filter(r => !r.isShared)
  const sharedAccepted = sorted.filter(r => r.isShared && r.status === 'accepted')

  return (
    <>
      <Header
        title="Mis Recordatorios"
        right={
          <button className="header-action" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
            <PlusIcon />
          </button>
        }
      />

      <div className="page-content">
        <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Search */}
          <div className="search-bar">
            <span className="search-icon"><SearchIcon /></span>
            <input
              className="search-input"
              placeholder="Buscar recordatorios..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="filter-bar">
              <button className={`filter-chip${filterImportance === 'all' ? ' active' : ''}`} onClick={() => setFilterImportance('all')}>Todos</button>
              {IMPORTANCE.map(i => (
                <button key={i.id} className={`filter-chip${filterImportance === i.id ? ' active' : ''}`} onClick={() => setFilterImportance(i.id)}>
                  {i.emoji} {i.label}
                </button>
              ))}
            </div>
            <div className="filter-bar">
              <button className={`filter-chip${filterCategory === 'all' ? ' active' : ''}`} onClick={() => setFilterCategory('all')}>Todas</button>
              {CATEGORIES.map(c => (
                <button key={c.id} className={`filter-chip${filterCategory === c.id ? ' active' : ''}`} onClick={() => setFilterCategory(c.id)}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Own reminders */}
          {ownReminders.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title">📌 Mis notas</span></div>
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ownReminders.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onEdit={setEditTarget}
                    onDelete={handleDelete}
                    onShare={setShareTarget}
                    showShareBtn
                  />
                ))}
              </div>
            </div>
          )}

          {/* Shared accepted */}
          {sharedAccepted.length > 0 && (
            <div>
              <div className="section-header"><span className="section-title">📨 Recibidos</span></div>
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sharedAccepted.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onEdit={setEditTarget}
                    onDelete={handleDelete}
                    showShareBtn={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty */}
          {sorted.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="2"/>
                </svg>
              </div>
              <div className="empty-state-title">Sin recordatorios</div>
              <p className="empty-state-text">Toca el botón + para crear tu primer recordatorio</p>
              <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
                <PlusIcon /> Crear recordatorio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
        <PlusIcon />
      </button>

      {/* Create/Edit Modal */}
      <Modal
        open={formOpen || !!editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        title={editTarget ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      >
        <ReminderForm
          initial={editTarget}
          onSubmit={editTarget ? handleEdit : handleCreate}
          onCancel={() => { setFormOpen(false); setEditTarget(null) }}
          loading={loading}
        />
      </Modal>

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          reminder={shareTarget}
          onClose={() => setShareTarget(null)}
          userId={user.uid}
          userDisplayName={user.displayName}
        />
      )}
    </>
  )
}
