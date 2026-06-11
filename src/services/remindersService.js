import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  getDoc
} from 'firebase/firestore'
import { db } from './firebase'

// ── CREATE ──────────────────────────────────────────────
export const createReminder = async (userId, data) => {
  const ref = await addDoc(collection(db, 'reminders'), {
    ...data,
    ownerId: userId,
    isShared: false,
    sharedFrom: null,
    status: 'own',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return ref.id
}

// ── READ (real-time) ─────────────────────────────────────
export const subscribeToMyReminders = (userId, callback) => {
  const q = query(
    collection(db, 'reminders'),
    where('ownerId', '==', userId),
    orderBy('dateTime', 'asc')
  )
  return onSnapshot(q, (snap) => {
    const reminders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(reminders)
  }, console.error)
}

// Escuchar los recordatorios que el usuario ha compartido con otros (para ver el estado)
export const subscribeToMySentShares = (userId, callback) => {
  const q = query(
    collection(db, 'sharedReminders'),
    where('fromUserId', '==', userId)
  )
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(data)
  }, console.error)
}

// Pending shared reminders (not yet accepted)
export const subscribeToPendingShared = (userId, callback) => {
  const q = query(
    collection(db, 'sharedReminders'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(items)
  }, console.error)
}

// ── UPDATE ───────────────────────────────────────────────
export const updateReminder = async (reminderId, data) => {
  await updateDoc(doc(db, 'reminders', reminderId), {
    ...data,
    updatedAt: serverTimestamp()
  })
}

// ── DELETE ───────────────────────────────────────────────
export const deleteReminder = async (reminderId) => {
  await deleteDoc(doc(db, 'reminders', reminderId))
}

// ── SHARE ────────────────────────────────────────────────
export const shareReminder = async (reminder, fromUserId, toUserId, groupId, toUserName) => {
  // Create share log FIRST so we get its ID
  const logRef = await addDoc(collection(db, 'sharedReminders'), {
    originalReminderId: reminder.id,
    fromUserId,
    toUserId,
    toUserName: toUserName || 'Usuario',
    groupId,
    status: 'pending',
    createdAt: serverTimestamp()
  })

  // Create a copy of the reminder for the recipient
  const sharedRef = await addDoc(collection(db, 'reminders'), {
    title: reminder.title,
    description: reminder.description,
    dateTime: reminder.dateTime || serverTimestamp(),
    importance: reminder.importance,
    color: reminder.color,
    category: reminder.category,
    ownerId: toUserId,
    isShared: true,
    sharedFrom: fromUserId,
    sharedFromName: reminder.sharedFromName || 'Unknown',
    originalId: reminder.id,
    sharedReminderId: logRef.id,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  // Update the log with the reminder ID
  await updateDoc(doc(db, 'sharedReminders', logRef.id), {
    reminderId: sharedRef.id
  })

  return sharedRef.id
}

export const acceptSharedReminder = async (reminderId) => {
  const snap = await getDoc(doc(db, 'reminders', reminderId))
  if (!snap.exists()) return
  const data = snap.data()

  await updateDoc(doc(db, 'reminders', reminderId), {
    status: 'accepted',
    updatedAt: serverTimestamp()
  })

  if (data.sharedReminderId) {
    await updateDoc(doc(db, 'sharedReminders', data.sharedReminderId), { status: 'accepted' })
  }
}

export const rejectSharedReminder = async (reminderId) => {
  const snap = await getDoc(doc(db, 'reminders', reminderId))
  if (!snap.exists()) return
  const data = snap.data()

  await deleteDoc(doc(db, 'reminders', reminderId))

  if (data.sharedReminderId) {
    await updateDoc(doc(db, 'sharedReminders', data.sharedReminderId), { status: 'rejected' })
  }
}

// ── GET ONE ──────────────────────────────────────────────
export const getReminderById = async (id) => {
  const snap = await getDoc(doc(db, 'reminders', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
