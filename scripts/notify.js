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

const snap = await db.collection('reminders')
  .where('dateTime', '>=', now)
  .where('dateTime', '<=', inOneHour)
  .get()

const byUser = {}

for (const doc of snap.docs) {
  const reminder = doc.data()
  const uid = reminder.ownerId
  if (!uid) continue

  if (reminder.lastNotifiedAt) {
    const diff = now.seconds - (reminder.lastNotifiedAt.seconds || 0)
    if (diff < 3600) continue
  }

  if (!byUser[uid]) byUser[uid] = { reminders: [], refs: [] }
  byUser[uid].reminders.push(reminder)
  byUser[uid].refs.push(doc.ref)
}

let sent = 0

for (const [uid, { reminders, refs }] of Object.entries(byUser)) {
  const userSnap = await db.collection('users').doc(uid).get()
  const token = userSnap.data()?.fcmToken
  if (!token) continue

  const batch = db.batch()
  for (const ref of refs) batch.update(ref, { lastNotifiedAt: now })
  await batch.commit()

  const count = reminders.length
  const title = reminders[0].title
  const body = count === 1
    ? `"${title}" está por vencer`
    : `Tienes ${count} recordatorios próximos (ej: "${title}")`

  try {
    await admin.messaging().send({
      token,
      notification: { title: 'Recordatorio próximo', body },
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
