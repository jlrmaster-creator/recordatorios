import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { subscribeToUserGroups, getGroupMembers } from '../../services/groupsService'
import { shareReminder } from '../../services/remindersService'
import Modal from '../shared/Modal'
import toast from 'react-hot-toast'

export default function ShareModal({ reminder, onClose, userId, userDisplayName }) {
  const { profile } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [members, setMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    return subscribeToUserGroups(userId, setGroups)
  }, [userId])

  useEffect(() => {
    if (!selectedGroupId) { setMembers([]); setSelectedMemberId(''); return }
    const group = groups.find(g => g.id === selectedGroupId)
    if (!group) return
    getGroupMembers(group.members).then(m => {
      setMembers(m.filter(mem => mem.id !== userId))
    })
  }, [selectedGroupId, groups, userId])

  const handleShare = async () => {
    if (!selectedGroupId) { toast.error('Selecciona un grupo'); return }
    if (!selectedMemberId) { toast.error('Selecciona un destinatario'); return }
    setLoading(true)
    try {
      const member = members.find(m => m.id === selectedMemberId)
      await shareReminder(
        { ...reminder, sharedFromName: profile?.displayName || userDisplayName || 'Tú' },
        userId,
        selectedMemberId,
        selectedGroupId,
        member?.displayName
      )
      toast.success(`Enviado a ${member?.displayName || 'el usuario'} ✓`)
      onClose()
    } catch (err) {
      toast.error('Error al compartir')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Compartir "${reminder?.title}"`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="form-group">
          <label className="form-label">Selecciona un grupo</label>
          <select
            className="form-select"
            value={selectedGroupId}
            onChange={e => { setSelectedGroupId(e.target.value); setSelectedMemberId('') }}
          >
            <option value="">-- Elige un grupo --</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.members?.length || 0} miembros)</option>
            ))}
          </select>
          {groups.length === 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No perteneces a ningún grupo. Crea o únete a uno primero.
            </span>
          )}
        </div>

        {members.length > 0 && (
          <div className="form-group">
            <label className="form-label">Enviar a</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMemberId(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${selectedMemberId === m.id ? 'var(--violet)' : 'var(--border-glass)'}`,
                    background: selectedMemberId === m.id ? 'var(--violet-glow)' : 'var(--bg-card)',
                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                  }}
                >
                  <div className="avatar" style={{ width: 36, height: 36 }}>
                    {m.photoURL
                      ? <img src={m.photoURL} alt={m.displayName} />
                      : (m.displayName?.[0] || '?').toUpperCase()
                    }
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{m.displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                  {selectedMemberId === m.id && (
                    <span style={{ marginLeft: 'auto', color: 'var(--violet-light)', fontSize: '1.2rem' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedGroupId && members.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '12px 0' }}>
            No hay otros miembros en este grupo
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleShare}
            disabled={loading || !selectedMemberId}
          >
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : null}
            Compartir
          </button>
        </div>
      </div>
    </Modal>
  )
}
