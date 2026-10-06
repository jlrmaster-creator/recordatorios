import { useState } from 'react'
import { generateTaskId } from '../../utils/tasksUtils'
import { PlusIcon, XIcon, CheckIcon } from '../shared/Icons'

export default function TaskList({ tasks = [], onChange, editable = true }) {
  const [newTask, setNewTask] = useState('')

  const toggleTask = (id) => {
    if (!editable) return
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    onChange(updated)
  }

  const removeTask = (id) => {
    if (!editable) return
    onChange(tasks.filter(t => t.id !== id))
  }

  const addTask = (e) => {
    e.preventDefault()
    const text = newTask.trim()
    if (!text) return
    const nt = { id: generateTaskId(), text, done: false }
    onChange([...tasks, nt])
    setNewTask('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTask(e)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.map(t => (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 10px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)', border: '1px solid var(--border-glass)'
              }}
            >
              <button
                type="button"
                onClick={() => toggleTask(t.id)}
                disabled={!editable}
                className={`complete-checkbox ${t.done ? 'checked' : ''}`}
                style={{ marginTop: 1, width: 20, height: 20 }}
                title={t.done ? 'Desmarcar' : 'Marcar hecho'}
              >
                {t.done && <CheckIcon />}
              </button>
              <div
                style={{
                  flex: 1, minWidth: 0, fontSize: '0.9rem',
                  textDecoration: t.done ? 'line-through' : 'none',
                  color: t.done ? 'var(--text-muted)' : 'var(--text-primary)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                }}
              >
                {t.text}
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => removeTask(t.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: 4 }}
                  title="Eliminar subtarea"
                >
                  <XIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <form onSubmit={addTask} style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            placeholder="Añadir subtarea..."
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={120}
          />
          <button type="submit" className="btn btn-secondary" disabled={!newTask.trim()}>
            <PlusIcon size={18} />
          </button>
        </form>
      )}
    </div>
  )
}