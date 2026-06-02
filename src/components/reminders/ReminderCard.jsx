import { useState } from 'react'
import { formatDateTime, isOverdue } from '../../utils/dateUtils'
import { getCategoryById, getImportanceById, importanceBadgeClass } from '../../utils/colorUtils'
import Modal from '../shared/Modal'
import ReminderDetail from './ReminderDetail'

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

export default function ReminderCard({ reminder, onEdit, onDelete, onShare, showShareBtn }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const cat = getCategoryById(reminder.category)
  const imp = getImportanceById(reminder.importance)
  const overdue = isOverdue(reminder.dateTime) && reminder.status !== 'completed'
  const color = reminder.color || '#7C3AED'

  return (
    <>
      <div
        className="card clickable reminder-card anim-slide-up"
        onClick={() => setDetailOpen(true)}
        style={{ paddingLeft: '20px' }}
      >
        {/* Accent bar */}
        <div className="reminder-card-accent" style={{ background: color }} />

        <div className="reminder-card-inner">
          <div className="reminder-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              {reminder.isShared && (
                <div className="received-badge" style={{ marginBottom: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  De {reminder.sharedFromName || 'un contacto'}
                </div>
              )}
              <div className="reminder-title truncate">{reminder.title}</div>
              {reminder.description && (
                <div className="reminder-desc">{reminder.description}</div>
              )}
            </div>
            <span className={importanceBadgeClass(reminder.importance)} style={{ flexShrink: 0 }}>
              {imp.emoji}
            </span>
          </div>

          <div className="reminder-meta">
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
          </div>
        </div>
      </div>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)}>
        <ReminderDetail
          reminder={reminder}
          onEdit={() => { setDetailOpen(false); onEdit(reminder) }}
          onDelete={() => { setDetailOpen(false); onDelete(reminder.id) }}
          onShare={showShareBtn ? () => { setDetailOpen(false); onShare(reminder) } : null}
          onClose={() => setDetailOpen(false)}
        />
      </Modal>
    </>
  )
}
