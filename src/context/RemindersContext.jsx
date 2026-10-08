import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  subscribeToMyReminders, subscribeToMySentShares,
  purgeCompletedShares, cleanupOrphanShares
} from '../services/remindersService'
import * as localNotif from '../services/localNotifications'

const RemindersContext = createContext(null)

export const RemindersProvider = ({ children }) => {
  const { user } = useAuth()
  const [reminders, setReminders] = useState([])
  const [sentShares, setSentShares] = useState([])
  const initRef = useRef(false)

  useEffect(() => {
    if (!user) return
    const unsub1 = subscribeToMyReminders(user.uid, setReminders)
    const unsub2 = subscribeToMySentShares(user.uid, setSentShares)
    return () => { unsub1(); unsub2() }
  }, [user])

  // Al iniciar sesión: purgar compartidos que ya eliminaron todos los
  // participantes y limpiar restos huérfanos de versiones anteriores
  useEffect(() => {
    if (!user) return
    purgeCompletedShares().catch(() => {})
    cleanupOrphanShares().catch(() => {})
  }, [user])

  // Programar notificaciones locales cada vez que cambian los reminders
  useEffect(() => {
    if (!user || reminders.length === 0) return

    // Pedir permiso la primera vez
    if (!initRef.current) {
      initRef.current = true
      localNotif.requestPermission()
    }

    localNotif.init(reminders)

    return () => {
      localNotif.cleanup()
    }
  }, [user, reminders])

  // Badge en el icono vía notificación (Android): enviamos también el
  // título y un extracto de la descripción de cada recordatorio
  // permanente para que la notificación sea informativa al expandirla.
  useEffect(() => {
    const permanents = reminders.filter(r => r.isPermanent)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_PERMANENT_BADGE',
        count: permanents.length,
        items: permanents.slice(0, 8).map(r => ({
          title: String(r.title || 'Recordatorio').slice(0, 60),
          description: String(r.description || '').replace(/\s+/g, ' ').slice(0, 80)
        }))
      })
    }
  }, [reminders])

  const pendingCount = reminders.filter(r => r.isShared && r.status === 'pending').length

  return (
    <RemindersContext.Provider value={{ reminders, sentShares, pendingCount }}>
      {children}
    </RemindersContext.Provider>
  )
}

export const useReminders = () => {
  const ctx = useContext(RemindersContext)
  if (!ctx) throw new Error('useReminders must be used within RemindersProvider')
  return ctx
}

