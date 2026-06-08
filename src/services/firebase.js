import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAf2f62bOfQ8WmbahHd-ejgn2C0V-ZKPS0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'recordatorios-61c1e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'recordatorios-61c1e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'recordatorios-61c1e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1019988873207',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1019988873207:web:50b0446cc8b33361d428f2'
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// messaging puede fallar en navegadores sin soporte (Safari antiguo, Firefox privado, etc.)
let _messaging = null
try {
  _messaging = getMessaging(app)
} catch (err) {
  console.warn('Firebase Messaging no soportado en este navegador:', err.message)
}
export const messaging = _messaging
export default app
