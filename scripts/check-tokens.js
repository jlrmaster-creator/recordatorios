import admin from 'firebase-admin'

const sa = process.env.FIREBASE_SERVICE_ACCOUNT
if (!sa) {
  console.error('FIREBASE_SERVICE_ACCOUNT no definida')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) })

const db = admin.firestore()
const snap = await db.collection('users').get()

let found = 0
for (const doc of snap.docs) {
  const data = doc.data()
  if (data.fcmToken) {
    found++
    console.log(`Usuario ${doc.id} tiene token: ${data.fcmToken.substring(0, 15)}... actualizado el ${data.fcmTokenUpdatedAt}`)
  } else {
    console.log(`Usuario ${doc.id} NO tiene token FCM.`)
  }
}

console.log(`\nTotal con token: ${found} / ${snap.size}`)
process.exit(0)
