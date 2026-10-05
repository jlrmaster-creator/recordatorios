import { useEffect, useState } from 'react'
import { DownloadIcon } from './Icons'

const DISMISS_KEY = 'pwa_install_dismissed_at'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 días

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Comprobar si ya está instalada (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = window.navigator.standalone === true

    if (isStandalone || isIOSStandalone) {
      return
    }

    // Comprobar si se descartó recientemente (7 días)
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt)
      if (elapsed < DISMISS_DURATION) {
        return
      }
    }

    const handleBeforeInstallPrompt = (e) => {
      // Evitar que el navegador muestre el prompt nativo
      e.preventDefault()
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    const handleAppInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
      localStorage.removeItem(DISMISS_KEY)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)

    try {
      await deferredPrompt.prompt()

      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setIsVisible(false)
      }
    } catch (err) {
      console.warn('Error al mostrar install prompt:', err)
    } finally {
      setDeferredPrompt(null)
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setIsVisible(false)
    setDeferredPrompt(null)
  }

  if (!isVisible || !deferredPrompt) return null

  return (
    <div className="install-prompt anim-slide-up">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">
          <DownloadIcon />
        </div>
        <div className="install-prompt-text">
          <div className="install-prompt-title">Instalar Recordatorios</div>
          <div className="install-prompt-subtitle">
            Accede más rápido desde tu pantalla de inicio
          </div>
        </div>
        <div className="install-prompt-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDismiss}
            disabled={isInstalling}
          >
            Ahora no
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <span className="spinner" style={{ width: 14, height: 14 }} />
            ) : (
              'Instalar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}