import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChange, getUserProfile } from '../services/authService'
import { getFCMToken, saveTokenToFirestore, removeTokenFromFirestore, unregisterFCMToken } from '../services/notificationService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const prof = await getUserProfile(firebaseUser.uid)
        setProfile(prof)
        const token = await getFCMToken()
        if (token) await saveTokenToFirestore(firebaseUser.uid, token)
      } else {
        if (user) {
          await removeTokenFromFirestore(user.uid)
        }
        await unregisterFCMToken()
      }
      setLoading(false)
    })
    return unsub
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
