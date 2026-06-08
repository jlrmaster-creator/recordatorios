import { getToken, onMessage, deleteToken as fbDeleteToken } from 'firebase/messaging'
import { doc, setDoc, deleteField } from 'firebase/firestore'
import { messaging, db } from './firebase'

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'denied'
  const permission = await Notification.requestPermission()
  return permission
}

export const getFCMToken = async () => {
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') return null

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('VITE_FIREBASE_VAPID_KEY no está configurada')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
    return currentToken
  } catch (err) {
    console.error('Error al obtener token FCM:', err)
    return null
  }
}

export const saveTokenToFirestore = async (userId, token) => {
  if (!userId || !token) return
  const userRef = doc(db, 'users', userId)
  await setDoc(userRef, {
    fcmToken: token,
    fcmTokenUpdatedAt: new Date().toISOString()
  }, { merge: true })
}

export const removeTokenFromFirestore = async (userId) => {
  if (!userId) return
  const userRef = doc(db, 'users', userId)
  await setDoc(userRef, {
    fcmToken: deleteField(),
    fcmTokenUpdatedAt: deleteField()
  }, { merge: true })
}

export const unregisterFCMToken = async () => {
  try {
    await fbDeleteToken(messaging)
  } catch (err) {
    console.error('Error al eliminar token FCM:', err)
  }
}

let onMessageUnsub = null

export const listenForForegroundMessages = (callback) => {
  if (onMessageUnsub) onMessageUnsub()
  onMessageUnsub = onMessage(messaging, (payload) => {
    callback(payload)
  })
  return () => {
    if (onMessageUnsub) {
      onMessageUnsub()
      onMessageUnsub = null
    }
  }
}
