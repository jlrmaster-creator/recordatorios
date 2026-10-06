import { useState } from 'react'
import { formatDateTime, isOverdue } from '../../utils/dateUtils'
import { getCategoryById, getImportanceById, importanceBadgeClass } from '../../utils/colorUtils'
import { ClockIcon, CheckIcon, XIcon } from '../shared/Icons'
import Modal from '../shared/Modal'
import ReminderDetail from './ReminderDetail'
import { computeProgress } from '../../utils/tasksUtils'
import { snoozeReminder, clearSnooze } from '../../services/remindersService'
import toast from 'react-hot-toast'

export default function ReminderCard({ reminder, onEdit, onDelete, onShare, showShareBtn, sentShares = [], onToggleComplete, onToggleFavorite, onDuplicate }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const cat = getCategoryById(reminder.category)
  const imp = getImportanceById(reminder.importance)
  const overdue = isOverdue(reminder.dateTime) && !reminder.isCompleted && reminder.status !== 'completed'
  const color = reminder.color || '#7C3AED'
  const completed = !!reminder.isCompleted
  const prog = computeProgress(reminder.tasks || [])
  const hasSnooze = reminder.snoozeUntil
  const isFav = !!reminder.isFavorite

  const handleToggleComplete = (e) => {
    e.stopPropagation()
    if (onToggleComplete) onToggleComplete(reminder.id, !completed)
  }

  const handleToggleFav = (e) => {
    e.stopPropagation()
    if (onToggleFavorite) onToggleFavorite(reminder.id, !isFav)
  }

  const handleSnooze = async (e, mins) => {
    e.stopPropagation()
    try {
      await snoozeReminder(reminder.id, mins)
      toast.success(`Pospuesto ${mins} min`)
    } catch { toast.error('Error al posponer') }
  }

  const handleClearSnooze = async (e) => {
    e.stopPropagation()
    try {
      await clearSnooze(reminder.id)
      toast.success('Posposición quitada')
    } catch { toast.error('Error') }
  }

  return (
    <>
      <div
        className={`card clickable reminder-card anim-slide-up ${completed ? 'completed' : ''}`}
        onClick={() => setDetailOpen(true)}
        style={{ paddingLeft: '20px', opacity: completed ? 0.55 : 1 }}
      >
        {/* Accent bar */}
        <div className="reminder-card-accent" style={{ background: color }} />

        <div className="reminder-card-inner">
          <div className="reminder-header">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
              {!reminder.isShared && onToggleComplete && (
                <button
                  className={`complete-checkbox ${completed ? 'checked' : ''}`}
                  onClick={handleToggleComplete}
                  title={completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                  aria-label={completed ? 'Descompletar' : 'Completar'}
                >
                  {completed && <CheckIcon />}
                </button>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                {reminder.isPermanent && (
                  <div className="permanent-badge" style={{ marginBottom: 2 }}>♾️ Permanente</div>
                )}
                {reminder.calendarEventId && (
                  <div className="permanent-badge" style={{ marginBottom: 2, color: '#4285F4' }}>📅 Calendar</div>
                )}
                {reminder.isShared && (
                  <div className="received-badge" style={{ marginBottom: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    De {reminder.sharedFromName || 'un contacto'}
                  </div>
                )}
                <div className={`reminder-title truncate ${completed ? 'completed-title' : ''}`}>{reminder.title}</div>
                {reminder.description && (
                  <div className="reminder-desc">{reminder.description}</div>
                )}
                {/* Sent shares status (for owners) */}
                {!reminder.isShared && sentShares && sentShares.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(() => {
                      const accepted = sentShares.filter(s => s.status === 'accepted').length
                      const rejected = sentShares.filter(s => s.status === 'rejected').length
                      const pending = sentShares.filter(s => s.status === 'pending').length
                      return (
                        <>
                          {accepted > 0 && <span className="badge" style={{ background: 'rgba(6,214,160,0.08)', color: 'var(--teal)' }}>✓ {accepted}</span>}
                          {rejected > 0 && <span className="badge" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--red)' }}>✗ {rejected}</span>}
                          {pending > 0 && <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}>⏳ {pending}</span>}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span className={importanceBadgeClass(reminder.importance)} style={{ flexShrink: 0 }}>
                {imp.emoji}
              </span>
              {!reminder.isShared && onToggleFavorite && (
                <button
                  onClick={handleToggleFav}
                  title={isFav ? 'Quitar favorito' : 'Marcar favorito'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: isFav ? 'var(--yellow)' : 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
              )}
            </div>
          </div>

          <div className="reminder-meta" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="reminder-date" style={{ color: overdue ? 'var(--red)' : 'var(--text-muted)' }}>
                <ClockIcon />
                {formatDateTime(reminder.dateTime)}
                {overdue && ' · Vencido'}
              </span>
              {cat && (
                <span className="badge badge-category">
                  {cat.emoji} {cat.label}
                </span>
              )}
              {completed && (
                <span className="badge" style={{ background: 'rgba(6,214,160,0.15)', color: 'var(--teal)' }}>
                  ✓ Completado
                </span>
              )}
              {isFav && (
                <span className="badge" style={{ background: 'rgba(255,183,3,0.15)', color: 'var(--yellow)' }}>
                  ★ Favorito
                </span>
              )}
              {hasSnooze && !reminder.isPermanent && (
                <span className="badge" style={{ background: 'rgba(159,103,255,0.15)', color: 'var(--violet-light)' }}>
                  ⏰ Pospuesto
                </span>
              )}
              {reminder.recurrence && !reminder.isShared && (
                <span className="badge" style={{ background: 'rgba(6,214,160,0.12)', color: 'var(--teal)' }}>
                  🔁 Recurrente
                </span>
              )}
            </div>

            {prog.total > 0 && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Subtareas</span><span>{prog.done}/{prog.total} · {prog.pct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${prog.pct}%`, background: 'linear-gradient(90deg,var(--teal),var(--violet))', transition: 'width .25s ease' }} />
                </div>
              </div>
            )}

            {(reminder.tags && reminder.tags.length > 0) && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {reminder.tags.slice(0, 4).map((t, i) => (
                  <span key={`${t}-${i}`} style={{ fontSize: '0.7rem', color: 'var(--violet-light)', background: 'rgba(124,58,237,0.15)', padding: '2px 6px', borderRadius: 999 }}>#{t}</span>
                ))}
                {reminder.tags.length > 4 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{reminder.tags.length - 4}</span>}
              </div>
            )}

            {/* Quick actions (los permanentes no tienen hora, posponer no aplica) */}
            {!reminder.isShared && !reminder.isPermanent && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }} onClick={(e) => e.stopPropagation()}>
                {!hasSnooze ? (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => handleSnooze(e, 5)}>+5m</button>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => handleSnooze(e, 10)}>+10m</button>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => handleSnooze(e, 30)}>+30m</button>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => handleSnooze(e, 60)}>+1h</button>
                  </>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={handleClearSnooze}>Quitar pospuesto</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}>
        <ReminderDetail
          reminder={reminder}
          onEdit={() => { setDetailOpen(false); onEdit(reminder) }}
          onDelete={() => { setDetailOpen(false); onDelete(reminder.id) }}
          onShare={showShareBtn ? () => { setDetailOpen(false); onShare(reminder) } : null}
          onDuplicate={onDuplicate ? () => { setDetailOpen(false); onDuplicate(reminder) } : null}
          onClose={() => setDetailOpen(false)}
        />
      </Modal>
    </>
  )
}
