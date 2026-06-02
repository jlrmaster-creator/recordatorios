import { useState } from 'react'

export default function GroupForm({ onSubmit, onJoin, onCancel, loading }) {
  const [tab, setTab] = useState('create') // 'create' | 'join'
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    await onSubmit(name.trim(), description.trim())
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError('')
    if (!code.trim()) { setError('Introduce el código'); return }
    try {
      await onJoin(code.trim())
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: 4, gap: 4 }}>
        {['create', 'join'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError('') }}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: tab === t ? 'var(--violet)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t === 'create' ? '✨ Crear grupo' : '🔗 Unirse'}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre del grupo *</label>
            <input
              className="form-input"
              placeholder="Mi familia, Trabajo, Amigos..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input
              className="form-input"
              placeholder="Opcional"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={100}
            />
          </div>
          {error && <span className="form-error">{error}</span>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Crear grupo'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Código de invitación</label>
            <input
              className="form-input"
              placeholder="Ej: AB12CD"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ letterSpacing: '0.15em', fontWeight: 700, textAlign: 'center', fontSize: '1.2rem' }}
              autoFocus
            />
          </div>
          {error && <span className="form-error">{error}</span>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-teal" style={{ flex: 2 }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Unirse'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
