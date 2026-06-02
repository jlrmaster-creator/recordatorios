import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { subscribeToMySentShares } from '../../services/remindersService'
import { formatDate, formatTime, isOverdue } from '../../utils/dateUtils'
import { getCategoryById, getImportanceById, importanceBadgeClass } from '../../utils/colorUtils'

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
)
const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
)

export default function ReminderDetail({ reminder, onEdit, onDelete, onShare, onClose }) {
  const { user } = useAuth()
  const [shares, setShares] = useState([])
  const cat = getCategoryById(reminder.category)
  const imp = getImportanceById(reminder.importance)
  const overdue = isOverdue(reminder.dateTime)
  const color = reminder.color || '#7C3AED'

  useEffect(() => {
    if (!user || reminder.isShared) return
    return subscribeToMySentShares(user.uid, (allShares) => {
      const related = allShares.filter(s => s.originalReminderId === reminder.id)
      setShares(related)
    })
  }, [user, reminder.id, reminder.isShared])

  const handleDelete = () => {
    if (window.confirm('¿Eliminar este recordatorio?')) onDelete()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Color + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: color, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem'
        }}>
          {cat?.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>{reminder.title}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={importanceBadgeClass(reminder.importance)}>
              {imp?.emoji} {imp?.label}
            </span>
            {cat && <span className="badge badge-category">{cat.label}</span>}
            {reminder.isShared && <span className="badge badge-shared">Recibido</span>}
          </div>
        </div>
      </div>

      {/* Description */}
      {reminder.description && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            {reminder.description}
          </p>
        </div>
      )}

      {/* Date / time */}
      <div className="card" style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="form-label">Fecha</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{formatDate(reminder.dateTime)}</div>
        </div>
        <div>
          <div className="form-label">Hora</div>
          <div style={{ fontWeight: 600, marginTop: 4, color: overdue ? 'var(--red)' : 'inherit' }}>
            {formatTime(reminder.dateTime)}
            {overdue && ' · Vencido'}
          </div>
        </div>
      </div>

      {/* Shared info (received) */}
      {reminder.isShared && (
        <div style={{ background: 'rgba(247,37,133,0.08)', border: '1px solid rgba(247,37,133,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--pink)' }}>
            📨 Enviado por <strong>{reminder.sharedFromName || 'un contacto'}</strong>
          </p>
        </div>
      )}

      {/* Shared info (sent) */}
      {shares.length > 0 && (
        <div className="card" style={{ padding: '12px 14px', marginTop: '-8px' }}>
          <div className="form-label" style={{ marginBottom: 10 }}>Historial de envíos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shares.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.toUserName || 'Usuario'}</span>
                <span style={{ 
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: s.status === 'accepted' ? 'rgba(6,214,160,0.1)' : 
                              s.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                  color: s.status === 'accepted' ? 'var(--teal)' : 
                         s.status === 'rejected' ? 'var(--red)' : 'var(--text-muted)' 
                }}>
                  {s.status === 'accepted' ? '✓ Aceptado' : 
                   s.status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!reminder.isShared && (
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onEdit}>
            <EditIcon /> Editar
          </button>
        )}
        {onShare && (
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onShare}>
            <ShareIcon /> Compartir
          </button>
        )}
        <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleDelete}>
          <DeleteIcon /> Eliminar
        </button>
      </div>
    </div>
  )
}
