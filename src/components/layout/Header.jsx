import { logoutUser } from '../../services/authService'
import { LogoutIcon } from '../shared/Icons'
import toast from 'react-hot-toast'

export default function Header({ title, left, right }) {
  const handleLogout = async () => {
    try { await logoutUser() }
    catch { toast.error('Error al cerrar sesión') }
  }

  return (
    <header className="app-header">
      <div style={{ width: 40, display: 'flex', alignItems: 'center' }}>
        {left}
      </div>
      <span className="header-title">{title}</span>
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {right ?? (
          <button
            onClick={handleLogout}
            className="header-action"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogoutIcon />
          </button>
        )}
      </div>
    </header>
  )
}
