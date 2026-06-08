import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChange, getUserProfile } from '../services/authService'
import { getFCMToken, saveTokenToFirestore, removeTokenFromFirestore, unregisterFCMToken, listenForForegroundMessages } from '../services/notificationService'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let fgUnsub = null

    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const prof = await getUserProfile(firebaseUser.uid)
        setProfile(prof)

        // Registrar token FCM (no bloquea si falla)
        try {
          const token = await getFCMToken()
          if (token) await saveTokenToFirestore(firebaseUser.uid, token)
        } catch (err) {
          console.warn('Error registrando FCM token:', err)
        }

        // Escuchar push notifications en primer plano
        fgUnsub = listenForForegroundMessages((payload) => {
          const title = payload?.notification?.title || payload?.data?.title || 'Recordatorio'
          const body = payload?.notification?.body || payload?.data?.body || ''
          toast(body ? `${title}: ${body}` : title, {
            icon: '🔔',
            duration: 6000
          })
        })
      } else {
        if (user) {
          try { await removeTokenFromFirestore(user.uid) } catch {}
        }
        try { await unregisterFCMToken() } catch {}
        if (fgUnsub) { fgUnsub(); fgUnsub = null }
      }
      setLoading(false)
    })

    return () => {
      unsub()
      if (fgUnsub) fgUnsub()
    }
  }, [])

  const refreshProfile = async () => {
    if (user) {
      const prof = await getUserProfile(user.uid)
      setProfile(prof)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

