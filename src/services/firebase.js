import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAf2f62bOfQ8WmbahHd-ejgn2C0V-ZKPS0",
  authDomain: "recordatorios-61c1e.firebaseapp.com",
  projectId: "recordatorios-61c1e",
  storageBucket: "recordatorios-61c1e.firebasestorage.app",
  messagingSenderId: "1019988873207",
  appId: "1:1019988873207:web:50b0446cc8b33361d428f2"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
