import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useAuth } from './AuthContext'
import { subscribeToMyReminders, subscribeToMySentShares } from '../services/remindersService'
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

  // Badge en el icono de la app con el nº de recordatorios permanentes
  useEffect(() => {
    const count = reminders.filter(r => r.isPermanent).length
    if ('setAppBadge' in navigator) {
      if (count > 0) navigator.setAppBadge(count)
      else navigator.clearAppBadge()
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

