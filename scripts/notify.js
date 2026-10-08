import admin from 'firebase-admin'

const sa = process.env.FIREBASE_SERVICE_ACCOUNT
if (!sa) {
  console.error('FIREBASE_SERVICE_ACCOUNT no definida')
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) })

const db = admin.firestore()
const now = admin.firestore.Timestamp.now()
const inOneHour = new admin.firestore.Timestamp(now.seconds + 3600, now.nanoseconds)
const oneHourAgo = new admin.firestore.Timestamp(now.seconds - 3600, now.nanoseconds)

const snap = await db.collection('reminders')
  .where('dateTime', '>=', oneHourAgo)
  .where('dateTime', '<=', inOneHour)
  .get()

let sent = 0

for (const doc of snap.docs) {
  const reminder = doc.data()
  const uid = reminder.ownerId
  if (!uid) continue

  // Recordatorio eliminado por su dueño (aún en Firebase esperando a
  // que todos lo eliminen): no notificar
  if ((reminder.deletedBy || []).includes(uid)) continue

  if (reminder.lastNotifiedAt) {
    const diff = now.seconds - (reminder.lastNotifiedAt.seconds || 0)
    if (diff < 3600) continue
  }

  const userSnap = await db.collection('users').doc(uid).get()
  const token = userSnap.data()?.fcmToken
  if (!token) continue

  await doc.ref.update({ lastNotifiedAt: now })

  try {
    const title = `⏰ Recordatorio: ${reminder.title || 'Pendiente'}`
    const desc = reminder.description || 'Está por vencer'
    const body = desc.length > 200 ? `${desc.slice(0, 200).trimEnd()}…` : desc
    
    await admin.messaging().send({
      token,
      notification: { title, body },
      webpush: {
        notification: {
          icon: '/recordatorios/icon-192x192.png',
          badge: '/recordatorios/icon-192x192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true
        },
        fcmOptions: { link: '/recordatorios/' }
      }
    })
    sent++
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      await db.collection('users').doc(uid).update({
        fcmToken: admin.firestore.FieldValue.delete()
      })
    }
  }
}

console.log(`OK — ${snap.size} recordatorios encontrados, ${sent} notificaciones enviadas`)
process.exit(0)
