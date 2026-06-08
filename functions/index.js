const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()

async function sendPush(uid, title, body, clickAction = '/') {
  if (!uid) return
  const snap = await db.collection('users').doc(uid).get()
  const token = snap.data()?.fcmToken
  if (!token) return

  const message = {
    token,
    notification: { title, body },
    webpush: {
      notification: {
        icon: '/recordatorios/icon-192x192.png',
        badge: '/recordatorios/icon-192x192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { clickAction }
      },
      fcmOptions: { link: clickAction }
    }
  }

  try {
    await admin.messaging().send(message)
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      await db.collection('users').doc(uid).update({
        fcmToken: admin.firestore.FieldValue.delete()
      })
    }
  }
}

exports.onNewSharedReminder = onDocumentCreated('sharedReminders/{docId}', async (event) => {
  const snap = event.data
  if (!snap) return
  const data = snap.data()
  if (!data) return

  const toUid = data.toUserId
  const fromUid = data.fromUserId

  const fromSnap = await db.collection('users').doc(fromUid).get()
  const fromName = fromSnap.data()?.displayName || 'Alguien'

  await sendPush(
    toUid,
    'Nuevo recordatorio compartido',
    `${fromName} te ha compartido un recordatorio`,
    '/recordatorios/'
  )
})

exports.onShareStatusChanged = onDocumentUpdated('sharedReminders/{docId}', async (event) => {
  const before = event.data?.before?.data()
  const after = event.data?.after?.data()
  if (!before || !after) return
  if (before.status === after.status) return
  if (after.status !== 'accepted' && after.status !== 'rejected') return

  const toUid = after.fromUserId
  const toName = after.toUserName || 'Alguien'
  const verb = after.status === 'accepted' ? 'aceptado' : 'rechazado'

  await sendPush(
    toUid,
    `Recordatorio ${verb}`,
    `${toName} ha ${verb} el recordatorio compartido`,
    '/recordatorios/'
  )
})

exports.checkUpcomingReminders = onSchedule('every 15 minutes', async () => {
  const now = admin.firestore.Timestamp.now()
  const inOneHour = new admin.firestore.Timestamp(now.seconds + 3600, now.nanoseconds)

  const snap = await db.collection('reminders')
    .where('dateTime', '>=', now)
    .where('dateTime', '<=', inOneHour)
    .where('status', 'in', ['own', 'accepted'])
    .get()

  const sent = new Set()

  for (const doc of snap.docs) {
    const reminder = doc.data()
    const uid = reminder.ownerId
    if (!uid || sent.has(uid)) continue

    sent.add(uid)
    await sendPush(
      uid,
      'Recordatorio próximo',
      `"${reminder.title}" está por vencer`,
      '/recordatorios/'
    )
  }
})
